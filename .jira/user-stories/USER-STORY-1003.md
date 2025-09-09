# USER STORY: Role-Based Access
Key: USER-STORY-1003  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1003  
Repo: ./user-stories/USER-STORY-1003.md

## Как
Система / Backend

## Хочу
Единый механизм проверки ролей (admin, restaurant_manager, customer)

## Чтобы
Гарантировать безопасность данных и ресурсов

## Acceptance Criteria
- Middleware (authenticateToken) валиден для всех защищённых маршрутов
- Функции requireRole([...]) и checkRestaurantAccess вынесены в модуль
- Менеджер видит только свой ресторан / его столы / его брони
- Customer видит только свои бронирования
- Admin видит всё

## Edge Cases
- Пользователь без role → 403
- Менеджер без restaurantId → 403 при доступе к ресурсам ресторана

## Non-Functional
- Отсутствие дублированного кода в `routes.ts`

## Связанные Tasks
- TASK-1003
- TASK-1008
