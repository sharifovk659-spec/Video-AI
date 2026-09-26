# Vidoo AI

Production foundation for a Telegram AI Video SaaS at [video.inovaauto.com](https://video.inovaauto.com).

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- **MySQL** (XAMPP locally, Hostinger in production) + Prisma ORM
- Telegram Mini App + grammY bot

## Project layout

```
src/
  app/
    (mini-app)/mini-app/   # Telegram Mini App shell
    (admin)/admin/         # Admin panel shell
    api/                   # REST API (health, auth, me, v1, telegram webhook)
  bot/                     # Long-polling bot + grammY commands
  lib/
    auth/                  # initData auth + signed session cookies
    users/                 # Telegram user upsert
    ai/                    # AI provider adapters (stubs)
    config/                # Zod env validation
    db/                    # Prisma client
    errors/                # AppError + API error handler
    jobs/                  # Job queue interface (stub)
    logger/                # JSON logging
    payments/              # Payment gateway interface (stub)
    security/              # Telegram initData + admin guards
    storage/               # Object storage interface (stub)
    templates/             # Public DTO helpers (hide prompts)
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Getting started (XAMPP MySQL)

1. Start **Apache** and **MySQL** in XAMPP.

2. Create the database (phpMyAdmin or CLI):

   ```sql
   CREATE DATABASE IF NOT EXISTS vidoo_ai
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

3. Copy environment file and set secrets:

   ```bash
   cp .env.example .env
   ```

   Default local URL:

   ```env
   DATABASE_URL=mysql://root:@localhost:3306/vidoo_ai
   SESSION_SECRET=<at-least-32-random-characters>
   TELEGRAM_BOT_TOKEN=<from @BotFather>
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Apply migrations and seed:

   ```bash
   npm run db:migrate:deploy
   npm run db:seed
   ```

6. Start the web app:

   ```bash
   npm run dev
   ```

7. (Optional) Start the bot (long polling):

   ```bash
   npm run bot:dev
   ```

   Production: webhook `POST /api/telegram/webhook` with `TELEGRAM_BOT_WEBHOOK_SECRET`.

## Telegram Mini App auth

1. Mini App sends `initData` to `POST /api/auth/telegram` (JSON body).
2. Server validates signature with `TELEGRAM_BOT_TOKEN` and sets an HttpOnly session cookie.
3. `GET /api/me` returns the authenticated user (protected by middleware + route guard).
4. `POST /api/auth/logout` clears the session.

Never pass Telegram user IDs via query parameters.

## Bot commands

| Command   | Description |
|-----------|-------------|
| `/start`  | Premium welcome + **🎬 Создать видео** → `APP_URL` |
| `/help`   | Command list |
| `/profile`| Profile, credits, free generation usage |

Each interaction upserts the Telegram user in MySQL (`telegram_user_id`, username, names, language, last activity).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests |
| `npm run db:validate` | Validate Prisma schema |
| `npm run db:migrate` | Dev migrations (MySQL) |
| `npm run db:migrate:deploy` | Apply migrations (CI/production) |
| `npm run db:seed` | Seed categories and app settings |
| `npm run bot:dev` | grammY bot (polling) |

## Hostinger production

Dedicated MySQL only (`u417315406_Video1`). Never point at other InovaAuto databases.

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
# Production: DB_USER=u417315406_u4173154012 DB_NAME=u417315406_Video1
NODE_ENV=production
SESSION_SECRET=<long-random-secret>
```

Apply baseline once on an empty DB: `npx prisma migrate deploy` (see `docs/PRODUCTION.md`). Do not deploy until secrets are in env.
## License

Private — Inova Auto / Vidoo AI.
