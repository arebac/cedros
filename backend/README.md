# Cedros Backend

## Local Postgres

Start the local database:

```bash
npm run db:up
```

The local connection string is:

```env
DATABASE_URL=postgresql://cedros:cedros_dev_password@localhost:5433/cedros
DATABASE_SSL=false
TYPEORM_SYNCHRONIZE=true
```

Seed the database with local dummy users:

```bash
npm run seed
```

Run the backend:

```bash
npm run start:dev
```

## Production Notes

Production must set a real `DATABASE_URL` for Postgres. SQLite fallback is disabled when `NODE_ENV=production`.

Keep `TYPEORM_SYNCHRONIZE=false` in production and use migrations before launch. The current local setup uses synchronize only to move quickly during development.
