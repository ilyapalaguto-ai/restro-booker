# USER STORY: Логин
Key: USER-STORY-1002  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1002  
Repo: ./user-stories/USER-STORY-1002.md

## Как
Зарегистрированный пользователь

## Хочу
Авторизоваться и получить access токен

## Чтобы
Выполнять защищённые операции

## Acceptance Criteria
- POST /api/auth/login (email, password)
- Неверные данные → 401 { message: "Invalid credentials" }
- Неактивный пользователь → 401 { message: "Account is disabled" }
- /api/auth/me возвращает профиль без пароля
- lastLogin обновляется

## Non-Functional
- Ответ ≤ 200ms локально

## Metrics
- Кол-во 401 / успешные логины

## Связанные Tasks
- TASK-1002
- TASK-1015
