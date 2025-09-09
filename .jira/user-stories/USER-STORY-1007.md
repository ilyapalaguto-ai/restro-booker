# USER STORY: Просмотр своих бронирований (Customer)
Key: USER-STORY-1007  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1007  
Repo: ./user-stories/USER-STORY-1007.md

## Как
Customer

## Хочу
Видеть список только моих бронирований

## Чтобы
Планировать посещения

## Acceptance Criteria
- GET /api/bookings?date=YYYY-MM-DD возвращает только его брони
- Попытка доступа к чужой брони → 403
- Обновление / удаление чужой брони → 403

## Non-Functional
- Список кэшируется (React Query)

## Связанные Tasks
- TASK-1005
- TASK-1010
