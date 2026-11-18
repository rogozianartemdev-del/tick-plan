# Tick Plan

A web application for planning personal events. Users sign up, pick a date in a calendar, and create, edit and delete events. Events can be browsed in a calendar or a list, filtered by importance and searched by keywords. Every user sees only their own data.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Authentication and Authorization](#authentication-and-authorization)
- [Server Actions](#server-actions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Google OAuth Setup](#google-oauth-setup)
- [Docker](#docker)
- [Testing](#testing)
- [Design Decisions](#design-decisions)
- [Troubleshooting](#troubleshooting)
- [Known Limitations and Roadmap](#known-limitations-and-roadmap)

## Features

**Authentication and authorization**
- Registration and sign-in with email and password (passwords hashed with bcrypt)
- Sign-in with Google OAuth
- Stateless sessions based on JWT
- Route protection: unauthenticated users are redirected to the login page
- Per-user data isolation: every query is scoped to the authenticated user

**Events**
- Create an event by clicking a day or time slot in the calendar, or with the "New event" button
- Fields: title, start date and time, optional end date and time, description, importance
- Importance levels: normal, important, critical (color-coded in the calendar and list)
- Optional end time: by default an event lasts 1 hour; the user can set an explicit range (for example 13:00 to 15:00)
- Edit an event by clicking it in the calendar or list
- Delete an event with a confirmation step

**Browsing and filtering**
- Calendar view (month, week, day and agenda) with Ukrainian localization
- List view with start and end time
- Filter by importance
- Keyword search across title and description (debounced)
- All filters and the selected date are stored in the URL, so a view can be bookmarked or shared

**Quality**
- Input validation on the server with zod
- Toast notifications for success feedback
- Unit tests for validation and server actions
- Production-ready Docker setup with automatic database migrations

## Tech Stack

| Area            | Technology                                       |
|-----------------|--------------------------------------------------|
| Framework       | Next.js (App Router), React, TypeScript          |
| Styling         | Tailwind CSS                                     |
| Database        | PostgreSQL                                       |
| ORM             | Prisma                                           |
| Auth            | next-auth v4 (Credentials + Google, JWT sessions)|
| Validation      | zod                                              |
| Calendar        | react-big-calendar with date-fns localizer       |
| Notifications   | sonner                                           |
| Tests           | Vitest                                           |
| Infrastructure  | Docker, Docker Compose                           |

## Architecture

Tick Plan is a frontend-only Next.js project. There is no REST API layer: all database logic lives in server actions (files marked with `"use server"`). The `app/api` folder contains only the next-auth route handler.

```
┌──────────────────────────────────────────────────────────┐
│ Browser                                                  │
│  Client components: Calendar, EventList, EventForm,      │
│  Filters, Header, LoginForm, RegisterForm                │
└───────────────┬──────────────────────────┬───────────────┘
                │ navigation / URL params  │ form submit
                ▼                          ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│ Server Components         │   │ Server Actions           │
│ (app)/page.tsx reads URL  │   │ actions/events.ts        │
│ params and calls          │   │ actions/auth.ts          │
│ getEvents()               │   │ validate, authorize,     │
└───────────────┬───────────┘   │ write, revalidatePath    │
                │               └────────────┬─────────────┘
                ▼                            ▼
         ┌──────────────────────────────────────────┐
         │ Prisma Client  ->  PostgreSQL            │
         └──────────────────────────────────────────┘

next-auth (api/auth/[...nextauth]) handles sign-in, the Google
OAuth callback and JWT issuing. Server code reads the session via
getServerSession.
```

**Request flow for reading events**
1. The URL carries the state: `?view=list&importance=CRITICAL&q=report&date=2026-11-20`.
2. The server component `(app)/page.tsx` parses the params and calls `getEvents()`.
3. `getEvents()` reads the session, builds a Prisma `where` clause scoped to the current user and returns the events.
4. The result is passed to a client component (calendar or list) for rendering.

**Request flow for writing events**
1. A client form calls a server action (`createEvent`, `updateEvent`, `deleteEvent`).
2. The action checks the session, validates the input with zod, writes to the database and calls `revalidatePath("/")`.
3. Next.js refreshes the server component data and the UI updates.

## Project Structure

```
prisma/
  schema.prisma                  Data model
  migrations/                    SQL migrations (applied by `prisma migrate deploy`)
src/
  middleware.ts                  Route protection (next-auth middleware)
  actions/
    auth.ts                      "use server": user registration
    events.ts                    "use server": CRUD, search and filtering
    events.test.ts               Unit tests for event actions
  app/
    layout.tsx                   Root layout, global toaster
    globals.css                  Tailwind entry
    api/auth/[...nextauth]/      The only API route (next-auth)
    (auth)/login/page.tsx        Login page
    (auth)/register/page.tsx     Registration page
    (app)/layout.tsx             Session check and header
    (app)/page.tsx               Main page (calendar or list)
  components/
    Calendar.tsx                 react-big-calendar wrapper
    EventList.tsx                List view
    EventForm.tsx                Create/edit modal with delete confirmation
    Filters.tsx                  Search, importance filter, view switch
    Header.tsx                   Top bar with sign-out
    LoginForm.tsx                Email/password and Google sign-in
    RegisterForm.tsx             Registration form
  lib/
    auth.ts                      next-auth options and getSession helper
    prisma.ts                    Prisma client singleton
    validation.ts                zod schemas
    validation.test.ts           Schema tests
    importance.ts                Importance labels and colors
    eventTime.ts                 Default event duration logic
    eventTime.test.ts            Duration tests
  types/next-auth.d.ts           Session and JWT type extensions
Dockerfile                       Multi-stage build (deps, migrator, builder, runner)
docker-compose.yml               db, migrate and app services
.env.example                     Environment variable template
```

## Data Model

```prisma
enum Importance { NORMAL IMPORTANT CRITICAL }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String?          // null for Google-only accounts
  events    Event[]
  createdAt DateTime @default(now())
}

model Event {
  id          String     @id @default(cuid())
  title       String
  description String?
  date        DateTime            // start
  endDate     DateTime?           // optional end; null means "default duration"
  importance  Importance @default(NORMAL)
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId, date])
}
```

When `endDate` is `null`, the event is displayed with a default duration of 1 hour (see `src/lib/eventTime.ts`). All timestamps are stored in UTC.

## Authentication and Authorization

- **Providers:** Credentials (email and password) and Google.
- **Sessions:** JWT strategy. The token carries the internal user id (`uid`), which is attached to the session in the `session` callback.
- **Google users:** on first sign-in the `signIn` callback upserts a `User` row, so Google and email accounts share one table. If a user registers with an email and later signs in with Google using the same address, both lead to the same account.
- **Route protection:** the middleware protects every route except `/login`, `/register` and `/api/auth/*`. The `(app)` layout additionally checks the session on the server.
- **Data isolation:** the user id is always taken from the server-side session and never from client input. Updates and deletes use `updateMany` / `deleteMany` with `userId` in the `where` clause, so a user cannot modify someone else's events even if they know an id.

## Server Actions

| Action                  | File                 | Description                                              |
|-------------------------|----------------------|----------------------------------------------------------|
| `registerUser(input)`   | `actions/auth.ts`    | Validates input, checks email uniqueness, hashes password|
| `getEvents(params)`     | `actions/events.ts`  | Lists events with importance filter, keyword search and date range |
| `createEvent(input)`    | `actions/events.ts`  | Validates and creates an event for the current user      |
| `updateEvent(id, input)`| `actions/events.ts`  | Validates and updates an event owned by the current user |
| `deleteEvent(id)`       | `actions/events.ts`  | Deletes an event owned by the current user               |

Mutating actions return `{ ok: true }` or `{ error: string }` so the UI can show validation messages without throwing.

**Validation rules** (`src/lib/validation.ts`)
- Title: required, up to 120 characters
- Description: optional, up to 2000 characters
- Start date: required, valid ISO date
- End date: optional, valid ISO date, must be later than the start
- Importance: one of `NORMAL`, `IMPORTANT`, `CRITICAL`
- Password: 6 to 100 characters; email is trimmed and lowercased

## Getting Started

### Prerequisites

- Node.js 22 or newer
- Docker and Docker Compose (for the database, or for running everything in containers)

### Option 1: everything in Docker

```bash
git clone <repository-url>
cd tick-plan
cp .env.example .env
# set NEXTAUTH_SECRET in .env (see below)
docker compose up --build
```

Open http://localhost:3000. Docker Compose starts PostgreSQL, applies migrations once, then starts the app.

### Option 2: local development

```bash
npm install
cp .env.example .env              # DATABASE_URL must point to localhost
docker compose up -d db           # start only PostgreSQL
npx prisma migrate deploy         # apply migrations
npm run dev
```

Open http://localhost:3000.

To create a new migration after changing the schema:

```bash
npx prisma migrate dev --name <migration_name>
```

Commit the generated `prisma/migrations` folder: the Docker setup applies migrations from it.

## Environment Variables

| Variable               | Description                                          | Example                                                  |
|------------------------|------------------------------------------------------|----------------------------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string                         | `postgresql://tickplan:tickplan@localhost:5432/tickplan` |
| `NEXTAUTH_URL`         | Public URL of the app                                | `http://localhost:3000`                                  |
| `NEXTAUTH_SECRET`      | Secret used to sign and encrypt JWTs                 | output of `openssl rand -base64 32`                      |
| `GOOGLE_CLIENT_ID`     | Google OAuth client id (optional)                    |                                                          |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional)                |                                                          |

Notes:
- Without the Google variables, email and password authentication still works; the Google button will not.
- Inside Docker Compose, `DATABASE_URL` for the `app` and `migrate` services is set in `docker-compose.yml` and points to the `db` host. Do not reuse the `localhost` value there.
- Never commit `.env`. It is excluded by `.gitignore` and `.dockerignore`.

## Google OAuth Setup

1. Open the Google Cloud Console, go to **APIs & Services > Credentials** and create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
3. Copy the client id and secret into `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. For production, add your production redirect URI (`https://your-domain/api/auth/callback/google`) and set `NEXTAUTH_URL` accordingly.

## Docker

The `Dockerfile` is a multi-stage build:

| Stage      | Purpose                                                                    |
|------------|----------------------------------------------------------------------------|
| `deps`     | Installs dependencies and generates the Prisma client                      |
| `migrator` | Runs `prisma migrate deploy`; used by the `migrate` Compose service        |
| `builder`  | Builds the Next.js app in standalone mode                                  |
| `runner`   | Minimal runtime image that starts `node server.js` as a non-root user      |

`docker-compose.yml` defines three services:

- `db`: PostgreSQL 16 with a persistent volume and a health check
- `migrate`: one-off service that applies migrations after the database is healthy
- `app`: the Next.js application, started after migrations complete successfully

Useful commands:

```bash
docker compose up --build        # build and start everything
docker compose logs -f app       # follow app logs
docker compose down              # stop containers (data is kept)
docker compose down -v           # stop and delete the database volume
```

## Testing

```bash
npm test
```

Covered by unit tests (Vitest):
- zod schemas: valid and invalid events, end date after start, email normalization, password length
- Event actions with mocked Prisma and session: authorization failure, creation scoped to the current user, validation errors do not reach the database, filters always include `userId`, updates and deletes cannot touch other users' events
- Default event duration helper

## Design Decisions

- **Server actions instead of an API layer.** The project is intentionally frontend-only. Server actions keep database logic close to the UI, give end-to-end type safety and remove the need for hand-written endpoints. The only API route is the one next-auth requires.
- **State in the URL.** View mode, importance filter, search text and the current date are search params. This makes the server component the single source of truth for data, works with the browser back button and allows sharing links.
- **Calendar rendered on the client only.** The calendar is mounted after hydration so that event times are always displayed in the user's browser time zone and no server/client mismatch can occur.
- **Optional end time with a default.** Instead of forcing users to pick an end time, `endDate` is nullable and a 1-hour default is applied when displaying. The form pre-fills a sensible range, and the server rejects ranges where the end is not after the start.
- **Ownership checks in the query.** Using `updateMany` and `deleteMany` with `userId` in the `where` clause makes authorization part of the query itself instead of a separate read-then-write step.
- **Standalone Next.js output.** Keeps the Docker image small and makes the runtime stage independent from `node_modules`.

## Troubleshooting

**Styles are not applied.** Make sure Tailwind 4 is installed together with `@tailwindcss/postcss`, that `postcss.config.mjs` exists, and that `globals.css` contains `@import "tailwindcss";` and is imported in the root layout. Delete `.next` and restart.

**`JWT_SESSION_ERROR: decryption operation failed`.** The browser holds a session cookie encrypted with a different `NEXTAUTH_SECRET`. Delete the `next-auth.*` cookies for `localhost` and make sure only one instance of the app (local or Docker) is using port 3000.

**`Can't reach database server at localhost:5432` inside Docker.** Inside a container `localhost` is the container itself. The `app` and `migrate` services must use the `db` host. Check the effective value with `docker compose config | grep DATABASE_URL` and make sure `.env` does not override it.

**Database credentials changed but login to Postgres fails.** PostgreSQL creates the user and password only on first start. Recreate the volume with `docker compose down -v`.

**Google sign-in redirect error.** The redirect URI in Google Cloud must match exactly: `http://localhost:3000/api/auth/callback/google`. Open the app via `localhost`, not `127.0.0.1`.

## Known Limitations and Roadmap

- Events cannot span a recurring schedule (no recurrence rules)
- No reminders or notifications
- No drag-and-drop rescheduling in the calendar
- Email verification and password reset are not implemented
- No end-to-end (browser) tests yet; only unit tests
- Pagination is not implemented for the list view

Possible next steps: drag-and-drop editing, recurring events, reminders by email, password reset flow, Playwright end-to-end tests and CI.