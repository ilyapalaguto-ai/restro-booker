# USER STORY: Статистика ресторана
Key: USER-STORY-1008  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/SCRUM-13
Repo: ./user-stories/USER-STORY-1008.md

## Как
Restaurant Manager / Admin

## Хочу
Видеть дневную статистику (кол-во броней, загрузка столов)

## Чтобы
Принимать операционные решения

## Acceptance Criteria
- GET /api/restaurants/:restaurantId/stats возвращает JSON:
  - totalBookings
  - peakHour? (опционально)
  - occupancyPercent (целое)
- Менеджер видит только свой ресторан

## Связанные Tasks
- TASK-1006
