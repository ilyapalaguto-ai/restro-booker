# USER STORY: Управление пользователями (Admin)
Key: USER-STORY-1009  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1009  
Repo: ./user-stories/USER-STORY-1009.md

## Как
Admin

## Хочу
Просматривать список пользователей и фильтровать по роли

## Чтобы
Администрировать доступ

## Acceptance Criteria
- GET /api/users возвращает массив (без password)
- ?role=restaurant_manager фильтрует
- Неизвестная роль → []

## Связанные Tasks
- TASK-1007
- TASK-1003
