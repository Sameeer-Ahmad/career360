# Career360

Your complete career workspace. Career360 is a full-stack platform for tracking job applications, preparing for interviews, and managing your career — starting with applications and expanding from there.

## Technology Stack

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)

Next.js handles both the frontend and backend (server-side) functionality — there is no separate backend service.

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database

**MongoDB is the application database.** Prisma (6.19.3 — do not upgrade to 7, which
does not yet support the MongoDB connector) connects to a local MongoDB **replica
set** (required for transactions, even as a single node) via Docker Compose.

**MySQL is retained temporarily** as a rollback/reference database following the
MySQL → MongoDB migration — its Docker service, schema snapshot, and migration
history are all still present and untouched. It is not read or written by the
running application. It will be removed only after manual verification of the
MongoDB cutover is complete.

### Local services

```bash
docker compose up -d mongodb-keyfile-init mongodb mongodb-init  # MongoDB (app database)
docker compose up -d mysql                                       # MySQL (rollback/reference only)
```

### Environment variables (see `.env`, never committed)

| Variable | Purpose |
|---|---|
| `MONGODB_DATABASE_URL` | The application's live MongoDB connection string (replica set `rs0`, database `career360`). Read by `prisma/schema.prisma` and the generated Prisma Client. |
| `DATABASE_URL` | The MySQL connection string. No longer read by the application — retained for the migration/rollback tooling under `mongo-migration/`. |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` / `MONGO_INITDB_DATABASE` / `MONGO_PORT` | Local MongoDB container credentials/config (`docker-compose.yml`). |
| `MYSQL_DATABASE` / `MYSQL_ROOT_PASSWORD` / `MYSQL_PORT` | Local MySQL container credentials/config (`docker-compose.yml`). |

### Migration tooling

`mongo-migration/` holds the full MySQL → MongoDB migration infrastructure: the
validated candidate schema, a frozen MySQL schema snapshot (so migration/rollback
scripts keep working independently of the app's now-MongoDB Prisma client), the
two-pass migration script, and the validation suite. See that directory's scripts
for usage — none of it runs automatically, and none of it is wired into `npm test`.

## Project Structure

```
career360/
├── src/
│   └── app/
├── public/
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## Status

This project is currently in active development. Not all planned features have been implemented yet.
