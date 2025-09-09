# USER STORY: Унифицированный формат ошибок
Key: USER-STORY-1010  
Epic: EPIC-1001  
JIRA: https://ilyapalaguto.atlassian.net/browse/USER-STORY-1010  
Repo: ./user-stories/USER-STORY-1010.md

## Как
Frontend Developer / System

## Хочу
Получать предсказуемый JSON формат ошибок

## Чтобы
Упростить отображение и обработку на клиенте

## Acceptance Criteria
- Любая ошибка → { message: string, code?: string, errors?: array }
- Zod ошибки складываются в errors[]
- Непойманные исключения → 500 { message: "Internal server error" }

## Связанные Tasks
- TASK-1008
- TASK-1002
