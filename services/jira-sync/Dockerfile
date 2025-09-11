FROM node:20-alpine
WORKDIR /app
COPY services/jira-sync/package.json services/jira-sync/package-lock.json* ./
RUN npm install --production --no-audit --no-fund || true
COPY services/jira-sync/tsconfig.json ./
COPY services/jira-sync/src ./src
RUN npx tsc -p tsconfig.json
# Runtime env vars expected:
# JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY, (optional) JIRA_EPIC_NAME_FIELD, JIRA_UPDATE_MODE
CMD ["node", "dist/index.js"]
