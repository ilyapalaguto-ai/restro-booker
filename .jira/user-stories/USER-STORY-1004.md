# USER STORY: Управление ресторанами (Admin)
Key: USER-STORY-1004  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1004  
Repo: ./user-stories/USER-STORY-1004.md

## Как
Admin

## Хочу
Создавать, обновлять, удалять рестораны

## Чтобы
Управлять площадками экосистемы

## Acceptance Criteria
- GET /api/restaurants возвращает список всех ресторанов (admin)
- POST создаёт (201)
- PUT обновляет поля
- DELETE удаляет (204)
- Менеджер получает только свой ресторан (массив длиной 0 или 1)

## Edge
- Невалидные поля → 400 + errors
- Не найден → 404

## Связанные Tasks
- TASK-1003
- TASK-1014
