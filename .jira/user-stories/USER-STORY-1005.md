# USER STORY: Управление столами
Key: USER-STORY-1005  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/SCRUM-10
Repo: ./user-stories/USER-STORY-1005.md

## Как
Restaurant Manager / Admin

## Хочу
Создавать, редактировать и удалять столы своего ресторана

## Чтобы
Оптимизировать рассадку гостей

## Acceptance Criteria
- GET /api/restaurants/:restaurantId/tables (role: admin → любые, manager → свой)
- POST создание стола (валидные данные)
- PUT /api/tables/:id обновляет
- DELETE /api/tables/:id удаляет
- Доступ к чужому ресторану → 403

## Edge
- Дублирование номера/позиции (доп. проверка — опционально)

## Связанные Tasks
- TASK-1003
