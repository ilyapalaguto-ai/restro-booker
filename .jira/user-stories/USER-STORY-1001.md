# USER STORY: Регистрация пользователя
Key: USER-STORY-1001  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1001  
Repo: ./user-stories/USER-STORY-1001.md

## Как
Гость (неавторизованный)

## Хочу
Создать аккаунт с email и паролем (роль по умолчанию customer)

## Чтобы
Мочь оформлять бронирования

## Acceptance Criteria
- POST /api/auth/register принимает валидные поля (email, password, confirmPassword, role?)
- Пароль хэшируется (bcrypt)
- Ответ 201 содержит user (без password) + token
- Повтор email → 400 { message: "User already exists" }
- Ошибки схемы → 400 { message: "...", errors: [...] }
- Пароль не менее 8 символов, минимум одна цифра

## Non-Functional
- Ответ ≤ 300ms при нормальной нагрузке (локально)

## Technical Notes
- Добавить расширенную проверку схемы (регэксп)
- Убедиться, что confirmPassword не уходит в БД

## Metrics
- Успешные регистрации / все попытки

## Связанные Tasks
- TASK-1001
- TASK-1016
