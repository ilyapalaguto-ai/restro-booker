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

function buildDescriptionMarkdown(pf: ParsedFile) {
  // remove any JIRA: line if present to avoid duplication inside description
  const cleaned = pf.content.split(/\r?\n/).filter(l => !/^JIRA:\s*/i.test(l)).join('\n');
  return cleaned;
}

async function detectEpicNameField(): Promise<string | undefined> {
  if (JIRA_EPIC_NAME_FIELD) return JIRA_EPIC_NAME_FIELD;
  try {
    const fields: any[] = await jiraRequest('/field', { method: 'GET' });
    const epicField = fields.find(f => /epic name/i.test(f.name || ''));
    if (epicField && epicField.id) {
      JIRA_EPIC_NAME_FIELD = epicField.id;
      console.log(`[jira-sync] Auto-detected Epic Name field: ${JIRA_EPIC_NAME_FIELD}`);
      return JIRA_EPIC_NAME_FIELD;
    }
    console.warn('[jira-sync] Epic Name field not found during auto-detect. Provide JIRA_EPIC_NAME_FIELD env var if epics fail to create.');
  } catch (e:any) {
    console.warn('[jira-sync] Failed to auto-detect Epic Name field', e.message);
  }
  return undefined;
}

async function createIssue(pf: ParsedFile) {
  const description = buildDescriptionMarkdown(pf);
  const fields: any = {
    summary: pf.summary,
    project: { key: JIRA_PROJECT_KEY },
  issuetype: { name: mapIssueTypeName(pf.issueType) },
    description
  };
  if (pf.issueType === 'Epic') {
    if (!JIRA_EPIC_NAME_FIELD) {
      await detectEpicNameField();
    }
    if (JIRA_EPIC_NAME_FIELD) {
      fields[JIRA_EPIC_NAME_FIELD] = pf.summary; // Epic Name
    }
  }
  const result = await jiraRequest('/issue', { method: 'POST', body: JSON.stringify({ fields }) });
  return result; // contains key, id
}

async function updateIssue(key: string, pf: ParsedFile) {
  const description = buildDescriptionMarkdown(pf);
  const fields: any = {
    summary: pf.summary,
  description
  };
  if (pf.issueType === 'Epic') {
    if (!JIRA_EPIC_NAME_FIELD) {
      await detectEpicNameField();
    }
    if (JIRA_EPIC_NAME_FIELD) {
      fields[JIRA_EPIC_NAME_FIELD] = pf.summary;
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
  // Allow user overrides
  if (t === 'Story' && ISSUE_TYPE_OVERRIDE_STORY) return ISSUE_TYPE_OVERRIDE_STORY;
  if (t === 'Task' && ISSUE_TYPE_OVERRIDE_TASK) return ISSUE_TYPE_OVERRIDE_TASK;
  // If the desired type not in available list after validation, fallback heuristics
  if (availableIssueTypes.length) {
    if (!availableIssueTypes.includes(t)) {
      if (t === 'Story' && availableIssueTypes.includes('User Story')) return 'User Story';
      if (t === 'Story' && availableIssueTypes.includes('Task')) return 'Task';
      if (t === 'Task' && availableIssueTypes.includes('Story')) return 'Story';
    }
  }
  return t;
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
