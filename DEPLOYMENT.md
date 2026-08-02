# Cedros Deployment

Recommended production layout:

- Frontend: Vercel
- Backend API: Render Web Service using `backend/Dockerfile`
- Database: Render managed Postgres

## Backend on Render

1. Create a Render Postgres database, or use `render.yaml` as a blueprint.
2. Create a Render Web Service from this repo with `backend` as the root directory and Docker as the runtime.
3. Health check path: `/api/health`.
4. Start command is handled by the Dockerfile: it runs migrations, then starts the API.
5. Required backend variables are listed in `backend/.env.production.example`.

Important values:

```env
NODE_ENV=production
DATABASE_SSL=true
TYPEORM_SYNCHRONIZE=false
FRONTEND_URL=https://your-vercel-app.vercel.app
FRONTEND_URLS=https://your-vercel-app.vercel.app,https://www.condominioloscedros.com
QB_REDIRECT_URI=https://your-render-api.onrender.com/api/quickbooks/callback
QB_ENVIRONMENT=production
```

## Frontend on Vercel

1. Import the repo in Vercel.
2. Set the project root to `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Set `VITE_API_URL` to the backend API URL plus `/api`, for example:

```env
VITE_API_URL=https://your-render-api.onrender.com/api
```

Legal URLs for Intuit:

```text
https://your-vercel-app.vercel.app/terms
https://your-vercel-app.vercel.app/privacy
```

## Stripe

After the backend has a public HTTPS URL, create/update the Stripe webhook endpoint:

```text
https://your-render-api.onrender.com/api/payments/webhook
```

Use the resulting webhook signing secret as `STRIPE_WEBHOOK_SECRET`.

## QuickBooks

After the backend has a public HTTPS URL, add this redirect URI in Intuit production settings:

```text
https://your-render-api.onrender.com/api/quickbooks/callback
```

Use production QuickBooks keys and set `QB_ENVIRONMENT=production`.
