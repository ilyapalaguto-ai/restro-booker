# USER STORY: Refresh токены
Key: USER-STORY-1011  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1011  
Repo: ./user-stories/USER-STORY-1011.md

## Как
Авторизованный пользователь

## Хочу
Обновлять сессию без повторного логина пока refresh действителен

## Чтобы
Не прерывать работу

## Acceptance Criteria
- POST /api/auth/refresh (refresh cookie) → новый access token
- Истёкший / невалидный refresh → 401
- Logout удаляет refresh
- Refresh одноразовый (ротация)

## Связанные Tasks
- TASK-1009
- TASK-1014
