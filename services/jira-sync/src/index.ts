import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import dotenv from 'dotenv';

// Enhanced env loading: try local .env, then look for .env.jira in parent directories
function loadEnv() {
  const tried: string[] = [];
  const cwd = process.cwd();
  const candidateFiles = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env.jira'),
    path.join(cwd, '..', '.env.jira'),
    path.join(cwd, '..', '..', '.env.jira')
  ];
  for (const file of candidateFiles) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file });
      console.log(`[jira-sync] Loaded env file: ${path.relative(cwd, file)}`);
      return;
    }
    tried.push(file);
  }
  dotenv.config(); // fallback default
  console.warn('[jira-sync] No explicit .env / .env.jira found. Tried:', tried.map(f=>path.relative(cwd,f)).join(', '));
}

loadEnv();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL?.replace(/\/$/, '') || '';
const JIRA_EMAIL = process.env.JIRA_EMAIL || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || '';
let JIRA_EPIC_NAME_FIELD = process.env.JIRA_EPIC_NAME_FIELD; // e.g. customfield_10011 (can be auto-detected)
const UPDATE_MODE = (process.env.JIRA_UPDATE_MODE || 'update').toLowerCase();

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
  console.error('[jira-sync] Missing required env vars. Need JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY');
  process.exit(1);
}

const JIRA_API_BASE = `${JIRA_BASE_URL}/rest/api/3`;
const JIRA_HEADERS: Record<string,string> = {
  'Authorization': 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64'),
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};
const ISSUE_TYPE_OVERRIDE_STORY = process.env.JIRA_ISSUETYPE_STORY; // optional mapping e.g. User Story
const ISSUE_TYPE_OVERRIDE_TASK = process.env.JIRA_ISSUETYPE_TASK; // optional mapping

interface ParsedFile {
  filePath: string;
  issueType: 'Epic' | 'Story' | 'Task';
  summary: string;
  internalKey?: string; // Key: ... (internal)
  jiraKey?: string; // from JIRA: url line
  content: string;
}

function findRepoRoot(start: string) {
  let dir = start;
  let prev = '';
  while (dir !== prev) {
    if (fs.existsSync(path.join(dir, '.jira'))) return dir;
    prev = dir;
    dir = path.dirname(dir);
  }
  return start; // fallback
}

const serviceCwd = process.cwd();
const rootDir = findRepoRoot(serviceCwd);
const jiraDir = path.join(rootDir, '.jira');
if (!fs.existsSync(jiraDir)) {
  console.warn('[jira-sync] .jira directory not found at resolved root:', rootDir);
}
console.log('[jira-sync] Repo root resolved to', rootDir);

function detectIssueType(p: string, firstLine: string): ParsedFile['issueType'] {
  if (p.includes('/epics/')) return 'Epic';
  if (p.includes('/user-stories/')) return 'Story';
  if (p.includes('/tasks/')) return 'Task';
  // Fallback heuristics
  if (/^#\s*EPIC:/i.test(firstLine)) return 'Epic';
  if (/^#\s*USER STORY:/i.test(firstLine)) return 'Story';
  return 'Task';
}

function parseFile(filePath: string): ParsedFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const firstLine = lines[0] || '';
    const issueType = detectIssueType(filePath, firstLine);
    // summary after first colon
    let summary = firstLine.replace(/^#\s*/,'').trim();
    const colonIdx = summary.indexOf(':');
    if (colonIdx !== -1) summary = summary.slice(colonIdx + 1).trim();
    const internalKeyLine = lines.find(l => /^Key:\s*/i.test(l));
    const internalKey = internalKeyLine ? internalKeyLine.split(':')[1].trim() : undefined;
    const jiraLine = lines.find(l => /^JIRA:\s*https?:\/\//i.test(l));
    let jiraKey: string | undefined;
    if (jiraLine) {
      const m = jiraLine.match(/browse\/([A-Z0-9]+-\d+)/);
      if (m) jiraKey = m[1];
    }
    return { filePath, issueType, summary, internalKey, jiraKey, content };
  } catch (e) {
    console.error('[jira-sync] parse error', filePath, e);
    return null;
  }
}

async function jiraRequest(pathPart: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${JIRA_API_BASE}${pathPart}`, { ...init, headers: { ...JIRA_HEADERS, ...(init.headers||{}) } });
  if (!res.ok) {
    const text = await res.text();
  throw new Error(`Jira API ${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function fetchIssue(key: string) {
  try {
    return await jiraRequest(`/issue/${key}`, { method: 'GET' });
  } catch (e:any) {
    if (/404/.test(e.message)) return null;
    throw e;
  }
}

// Convert our markdown-ish file content into Atlassian Document Format (ADF)
// Minimal implementation: paragraphs + bullet lists. Jira requires an object not a plain string.
function buildDescriptionADF(pf: ParsedFile) {
  const lines = pf.content.split(/\r?\n/)
    .filter(l => !/^JIRA:\s*/i.test(l)); // drop existing JIRA link line

  const blocks: any[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(' ');
    blocks.push({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : []
    });
    paragraph = [];
  }

  let listMode: 'bullet' | null = null;
  let listItems: any[] = [];
  function flushList() {
    if (listMode && listItems.length) {
      blocks.push({ type: 'bulletList', content: listItems });
    }
    listMode = null;
    listItems = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { // blank line
      flushParagraph();
      flushList();
      continue;
    }
    const bulletMatch = /^[-*+]\s+(.*)/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      if (!listMode) listMode = 'bullet';
      listItems.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: bulletMatch[1] }] }] });
      continue;
    }
    // headings (# ...) -> treat as heading node
    const headingMatch = /^(#{1,6})\s+(.*)/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', attrs: { level: headingMatch[1].length }, content: [{ type: 'text', text: headingMatch[2].trim() }] });
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();

  return {
    type: 'doc',
    version: 1,
    content: blocks.length ? blocks : [{ type: 'paragraph', content: [{ type: 'text', text: pf.summary }] }]
  };
}

// Cache for create meta lookups to avoid repeated calls
let createMetaCache: any | null = null;
async function loadCreateMeta() {
  if (createMetaCache) return createMetaCache;
  try {
    createMetaCache = await jiraRequest(`/issue/createmeta?projectKeys=${encodeURIComponent(JIRA_PROJECT_KEY)}&expand=projects.issuetypes.fields`, { method: 'GET' });
  } catch (e:any) {
    console.warn('[jira-sync] Failed to load create meta', e.message);
    createMetaCache = {};
  }
  return createMetaCache;
}

async function detectEpicNameField(): Promise<string | undefined> {
  if (JIRA_EPIC_NAME_FIELD) return JIRA_EPIC_NAME_FIELD;
  const meta = await loadCreateMeta();
  try {
    const project = meta.projects?.find((p: any) => p.key === JIRA_PROJECT_KEY) || meta.projects?.[0];
    if (!project) return undefined;
    // Try both English and localized Epic names to find matching issue type in meta
    const epicIssueTypeNameCandidates = ['Epic', 'Эпик'];
    const epicType = project.issuetypes?.find((it: any) => epicIssueTypeNameCandidates.includes(it.name));
    if (!epicType) return undefined;
    const fields = epicType.fields || {};
    for (const fid of Object.keys(fields)) {
      const f = fields[fid];
      if (/epic name/i.test(f.name || '') || /эпик/i.test(f.name || '')) {
        JIRA_EPIC_NAME_FIELD = fid;
        console.log(`[jira-sync] Auto-detected Epic Name field via create meta: ${JIRA_EPIC_NAME_FIELD}`);
        return JIRA_EPIC_NAME_FIELD;
      }
    }
  } catch (e:any) {
    console.warn('[jira-sync] Epic Name detection via create meta failed', e.message);
  }
  return undefined;
}

async function createIssue(pf: ParsedFile) {
  const fields: any = {
    summary: pf.summary,
    project: { key: JIRA_PROJECT_KEY },
    issuetype: { name: mapIssueTypeName(pf.issueType) },
    description: buildDescriptionADF(pf)
  };
  if (pf.issueType === 'Epic') {
    if (!JIRA_EPIC_NAME_FIELD) await detectEpicNameField();
    // Revalidate that detected field is actually present in create meta for Epic
    if (JIRA_EPIC_NAME_FIELD) {
      const meta = await loadCreateMeta();
      const project = meta.projects?.find((p: any) => p.key === JIRA_PROJECT_KEY) || meta.projects?.[0];
      const epicIssueTypeNameCandidates = ['Epic', 'Эпик'];
      const epicType = project?.issuetypes?.find((it: any) => epicIssueTypeNameCandidates.includes(it.name));
      const allowedFieldIds = epicType ? Object.keys(epicType.fields || {}) : [];
      if (allowedFieldIds.includes(JIRA_EPIC_NAME_FIELD)) {
        fields[JIRA_EPIC_NAME_FIELD] = pf.summary;
      } else {
        console.warn(`[jira-sync] Skipping Epic Name field '${JIRA_EPIC_NAME_FIELD}' not present on create screen`);
      }
    }
  }
  const result = await jiraRequest('/issue', { method: 'POST', body: JSON.stringify({ fields }) });
  return result;
}

async function updateIssue(key: string, pf: ParsedFile) {
  const fields: any = {
    summary: pf.summary,
    description: buildDescriptionADF(pf)
  };
  if (pf.issueType === 'Epic') {
    if (!JIRA_EPIC_NAME_FIELD) await detectEpicNameField();
    if (JIRA_EPIC_NAME_FIELD) {
      const meta = await loadCreateMeta();
      const project = meta.projects?.find((p: any) => p.key === JIRA_PROJECT_KEY) || meta.projects?.[0];
      const epicIssueTypeNameCandidates = ['Epic', 'Эпик'];
      const epicType = project?.issuetypes?.find((it: any) => epicIssueTypeNameCandidates.includes(it.name));
      const allowedFieldIds = epicType ? Object.keys(epicType.fields || {}) : [];
      if (allowedFieldIds.includes(JIRA_EPIC_NAME_FIELD)) {
        fields[JIRA_EPIC_NAME_FIELD] = pf.summary;
      } else {
        console.warn(`[jira-sync] Skipping Epic Name field '${JIRA_EPIC_NAME_FIELD}' on update (not on screen)`);
      }
    }
  }
  await jiraRequest(`/issue/${key}`, { method: 'PUT', body: JSON.stringify({ fields }) });
}

function ensureJiraLinkInFile(pf: ParsedFile, jiraKey: string) {
  const url = `${JIRA_BASE_URL}/browse/${jiraKey}`;
  const content = fs.readFileSync(pf.filePath, 'utf8');
  if (content.includes(url)) return; // already present
  let lines = content.split(/\r?\n/);
  const jiraLineIndex = lines.findIndex(l => /^JIRA:\s*/i.test(l));
  if (jiraLineIndex >= 0) {
    lines[jiraLineIndex] = `JIRA: ${url}`;
  } else {
    // insert after Key: line if possible
    const keyIdx = lines.findIndex(l => /^Key:\s*/i.test(l));
    if (keyIdx >= 0) {
      lines.splice(keyIdx + 1, 0, `JIRA: ${url}`);
    } else {
      lines.splice(1, 0, `JIRA: ${url}`); // after title
    }
  }
  fs.writeFileSync(pf.filePath, lines.join('\n'), 'utf8');
  console.log(`[jira-sync] Updated file with JIRA link ${jiraKey}`);
}

let projectValidated = false;
let availableIssueTypes: string[] = [];
async function validateProjectAndTypes() {
  if (projectValidated) return;
  try {
    const project = await jiraRequest(`/project/${JIRA_PROJECT_KEY}`, { method: 'GET' });
    const types = project.issueTypes || [];
    availableIssueTypes = types.map((t: any) => t.name).filter(Boolean);
    console.log(`[jira-sync] Project '${JIRA_PROJECT_KEY}' OK. Issue types: ${availableIssueTypes.join(', ')}`);
    projectValidated = true;
  } catch (e:any) {
    console.error(`[jira-sync] Project validation failed for key '${JIRA_PROJECT_KEY}'. Verify it exists and you have permissions.`);
    console.error(e.message);
  }
}

function mapIssueTypeName(t: 'Epic' | 'Story' | 'Task'): string {
  // User overrides first
  if (t === 'Story' && ISSUE_TYPE_OVERRIDE_STORY) return ISSUE_TYPE_OVERRIDE_STORY;
  if (t === 'Task' && ISSUE_TYPE_OVERRIDE_TASK) return ISSUE_TYPE_OVERRIDE_TASK;

  const localized: Record<string, string[]> = {
    Epic: ['Epic', 'Эпик'],
    Story: ['Story', 'User Story', 'История'],
    Task: ['Task', 'Задача']
  };
  const candidates = localized[t];
  if (availableIssueTypes.length) {
    // Direct match first
    for (const c of candidates) if (availableIssueTypes.includes(c)) return c;
    // Cross-fallbacks between Story/Task if neither localized variant found
    if (t === 'Story') {
      if (availableIssueTypes.includes('Task')) return 'Task';
    } else if (t === 'Task') {
      if (availableIssueTypes.includes('Story')) return 'Story';
      if (availableIssueTypes.includes('User Story')) return 'User Story';
    }
  }
  return candidates[0]; // default to primary canonical name
}

const queue: (() => Promise<void>)[] = [];
let working = false;
function enqueue(fn: () => Promise<void>) {
  queue.push(fn);
  processQueue();
}
async function processQueue() {
  if (working) return;
  working = true;
  while (queue.length) {
    const job = queue.shift();
    if (!job) break;
    try { await job(); } catch (e:any) { console.error('[jira-sync] job error', e.message); }
    await new Promise(r => setTimeout(r, 250)); // simple rate pacing
  }
  working = false;
}

async function handleFile(filePath: string) {
  if (!filePath.endsWith('.md')) return;
  const pf = parseFile(filePath);
  if (!pf) return;
  try {
    await validateProjectAndTypes();
    if (!projectValidated) {
      console.warn('[jira-sync] Skipping because project not validated.');
      return;
    }
    if (pf.jiraKey) {
      if (UPDATE_MODE === 'skip') {
        console.log(`[jira-sync] Skip update ${pf.jiraKey}`);
        return;
      }
      const exists = await fetchIssue(pf.jiraKey);
      if (!exists) {
        console.log(`[jira-sync] Remote issue missing, recreating for ${path.basename(filePath)}`);
        const created = await createIssue(pf);
        ensureJiraLinkInFile(pf, created.key);
      } else {
        await updateIssue(pf.jiraKey, pf);
        console.log(`[jira-sync] Updated ${pf.jiraKey}`);
      }
    } else {
      const created = await createIssue(pf);
      console.log(`[jira-sync] Created ${created.key} for ${path.basename(filePath)}`);
      ensureJiraLinkInFile(pf, created.key);
    }
  } catch (e:any) {
    console.error('[jira-sync] Failed processing', filePath, e.message);
  }
}

function startWatcher() {
  console.log('[jira-sync] Watching .jira directory');
  const watcher = chokidar.watch(path.join(jiraDir, '**/*.md'), { ignoreInitial: false });
  const debounceMap = new Map<string, NodeJS.Timeout>();
  function schedule(file: string) {
    if (debounceMap.has(file)) clearTimeout(debounceMap.get(file)!);
    const t = setTimeout(() => {
      enqueue(() => handleFile(file));
      debounceMap.delete(file);
    }, 400);
    debounceMap.set(file, t);
  }
  watcher.on('add', schedule).on('change', schedule);
}

startWatcher();
