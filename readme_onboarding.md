# RestaurantCRM Onboarding Guide

Цель: с нуля поднять проект локально, имея только VS Code и терминал.

## 1. Что мы запускаем
Monorepo: React (Vite) клиент + Express + PostgreSQL (через Docker). Миграции и схема БД управляются Drizzle ORM. Авто-применение миграций при старте контейнера.

## 2. Установка базовых инструментов
Установи (в порядке):

1. Git – https://git-scm.com/downloads
2. VS Code – https://code.visualstudio.com/
   - Рекомендуемые расширения ставятся автоматически через DevContainer (`eslint`, `prettier`).
3. Docker Desktop – https://www.docker.com/products/docker-desktop/
   - (macOS Apple Silicon / Intel: выбери нужный dmg)
   - После установки запусти Docker и дождись, пока он скажет "Engine running".
4. (Опционально без Docker) Node.js LTS 20.x – https://nodejs.org/en/download
5. (Опционально) pgAdmin / TablePlus / Beekeeper для просмотра БД.

Проверка после установки:
```
docker --version
git --version
```

## 3. Клонирование репозитория
```
git clone <REPO_URL> restro_booker
cd restro_booker
```

## 4. Запуск через Docker (рекомендуемый путь)
Ничего руками не настраиваем — контейнер сам:
- установит npm зависимости (кэшируется слоями)
- создаст базу `restro_booker`
- применит миграции `drizzle-kit push`
- стартанёт API + клиент на порту 3000.

Команда:
```
docker compose -f .devcontainer/docker-compose.yml up --build
```

После первого запуска открывай: http://localhost:3000

Остановить:
```
docker compose -f .devcontainer/docker-compose.yml down
```

Пересоздать с чистой БД (удаляет volume):
```
docker compose -f .devcontainer/docker-compose.yml down -v
docker compose -f .devcontainer/docker-compose.yml up --build
```

## 5. Файл окружения
В репо есть `.env` пример. Минимум для локали уже настроен:
```
DATABASE_URL=postgres://postgres:postgres@db:5432/restro_booker
PORT=3000
```
Если запускаешь без Docker (см. ниже) — замени `db` на `localhost`.

## 6. Создание первого пользователя (регистрация)
UI ещё без формы регистрации? Используй HTTP-запрос (curl или REST клиент):
```
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"admin@example.com",
    "password":"password123",
    "confirmPassword":"password123",
    "firstName":"Admin",
    "lastName":"User",
    "role":"admin"
  }'
```
Ответ вернёт `token` — сохрани для защищённых запросов (Authorization: Bearer <token>).

Потом логин:
```
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## 7. Структура проекта (кратко)
```
client/        React (Vite) фронтенд
server/        Express + маршруты + storage + миграции запускаются здесь
shared/        Общие типы и схемы (Zod + Drizzle)
scripts/       start-dev.sh (авто миграции + запуск)
.devcontainer/ Dockerfile + docker-compose (dev окружение)
```

Ключевые файлы:
- `shared/schema.ts` — модель БД и Zod схемы
- `server/routes.ts` — API
- `server/storage.ts` — слой доступа к данным
- `server/db.ts` — инициализация Drizzle + pg

## 8. Альтернативный ручной запуск без Docker
Используй только если Docker недоступен.
1. Установи Node.js (20 LTS).
2. Локально подними PostgreSQL (например через brew):
   - macOS: `brew install postgresql@16 && brew services start postgresql@16`
3. Создай базу:
   ```
   createdb restro_booker
   ```
4. Создай `.env`:
   ```
   DATABASE_URL=postgres://localhost:5432/restro_booker
   PORT=3000
   ```
5. Установи зависимости:
   ```
   npm install
   ```
6. Применить миграции напрямую:
   ```
   npx drizzle-kit push
   ```
7. Запуск dev:
   ```
   npm run dev
   ```
Открой http://localhost:3000

## 9. Частые команды
| Цель | Команда |
|------|---------|
| Запустить dev (Docker) | `docker compose -f .devcontainer/docker-compose.yml up --build` |
| Остановить | `docker compose -f .devcontainer/docker-compose.yml down` |
| Полный ресет (с чистой БД) | `docker compose -f .devcontainer/docker-compose.yml down -v` |
| Миграции вручную | `npx drizzle-kit push` |
| Логи приложения | `docker compose -f .devcontainer/docker-compose.yml logs -f app` |
| Логи БД | `docker compose -f .devcontainer/docker-compose.yml logs -f db` |

## 10. Траблшутинг
| Симптом | Причина | Решение |
|---------|---------|---------|
| 500 при /api/auth/login | Нет пользователя | Зарегистрируй admin (см. выше) |
| Ошибка "database ... does not exist" | Имя базы не совпало | Проверь `POSTGRES_DB` и `DATABASE_URL` |
| ECONNREFUSED к 5432 | Postgres не поднялся | `docker compose logs db` |
| Порт 5432 занят | Другой postgres/контейнер | Остановить лишний или сменить порт в compose |
| Фронт не открывается | Порт не проброшен | Проверь `ports` в compose (3000:3000) |

## 11. Обновление зависимостей
```
npm outdated
npm update
```
Для критичных уязвимостей:
```
npm audit fix
```

## 12. Расширения (если без DevContainer)
VS Code Extensions:
- ESLint — https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
- Prettier — https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode

## 13. Следующие шаги для развития
- Добавить seed-скрипт (пользователь + тестовые рестораны)
- Настроить тесты (Vitest / Jest) для серверных модулей
- Добавить линтер pre-commit (husky)

---
Если что-то не работает — начни с логов контейнеров и сверки `.env`. Удачи! 🚀
