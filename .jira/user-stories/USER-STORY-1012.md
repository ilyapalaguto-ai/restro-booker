# USER STORY: Авто-привязка customer к брони
Key: USER-STORY-1012  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/SCRUM-17
Repo: ./user-stories/USER-STORY-1012.md

## Как
Customer

## Хочу
Создавать брони без явного указания userId

## Чтобы
Упростить UX и избежать манипуляций

## Acceptance Criteria
- При POST /api/bookings если роль customer — игнорируется переданный userId
- В брони сохраняется реальный user.id
- Попытка подмены не вызывает ошибку (тихо игнорируется)

## Связанные Tasks
- TASK-1010
- TASK-1004
