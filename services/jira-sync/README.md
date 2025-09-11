# Jira Sync Service

Watcher сервис, отслеживающий изменения Markdown-файлов в папке `.jira` и создающий/обновляющий задачи в Jira через REST API.

## Возможности
* Создание Epic / Story / Task при появлении нового файла
* Обновление описания при изменении существующего
* Парсинг ключа из строки `JIRA:` если уже создано
* Автоматическое добавление строки `JIRA: <url>` после успешного создания

## Определение типа
* Путь содержит `/epics/` → issuetype Epic
* `/user-stories/` → Story
* `/tasks/` → Task

## Требуемые переменные окружения
| Var | Назначение |
|-----|------------|
| JIRA_BASE_URL | Базовый URL (например https://example.atlassian.net) |
| JIRA_EMAIL | Email пользователя (для Basic auth) |
| JIRA_API_TOKEN | Jira API token |
| JIRA_PROJECT_KEY | Ключ проекта (например RB) |
| JIRA_EPIC_NAME_FIELD | (Опционально) customfield_xxxxx для Epic Name |
| JIRA_UPDATE_MODE | update (по умолчанию) или skip (не трогать существующие) |

## Запуск локально
```bash
cd services/jira-sync
npm install
npm run dev
```

## Docker
```bash
docker build -t jira-sync -f services/jira-sync/Dockerfile .
docker run --rm \
  -e JIRA_BASE_URL=$JIRA_BASE_URL \
  -e JIRA_EMAIL=$JIRA_EMAIL \
  -e JIRA_API_TOKEN=$JIRA_API_TOKEN \
  -e JIRA_PROJECT_KEY=$JIRA_PROJECT_KEY \
  -v $(pwd)/.jira:/app/.jira \
  jira-sync
```

## Формат файла
Минимум первые строки:
```
# EPIC: Unified Auth & Role-Based Booking Platform
Key: EPIC-1001
```
или
```
# USER STORY: Регистрация пользователя
Key: USER-STORY-1001
```

## Логика ключей
`Key:` используется как внутренний идентификатор. Реальный Jira ключ извлекается из строки `JIRA:` (если есть) или добавляется после создания.

## Ограничения
* Для Epic в Cloud Jira требуется указать поле Epic Name — задайте `JIRA_EPIC_NAME_FIELD`.
* Не обрабатывает удаление файлов.
* Не пытается переименовывать issue при смене первой строки, только обновляет summary.

## TODO (возможные улучшения)
* Кэш состояния (чтобы не дергать Jira при отсутствии изменений)
* Поддержка удаления / перехода в Done
* Маппинг internal Key → Jira key в отдельном локальном JSON
