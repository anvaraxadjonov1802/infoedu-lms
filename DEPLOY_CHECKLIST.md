# Deploy checklist

## Before deploy
- [ ] Choose a strong `DEMO_PASSWORD` for initial seeded accounts.
- [ ] Keep `DEMO_MODE=False` in production.
- [ ] Confirm `.env` files are not committed.
- [ ] Decide demo/free vs persistent/paid database.

## Render all-in-one
- [ ] Push this repository to GitHub.
- [ ] Create a Render Blueprint using `render.yaml`.
- [ ] Enter `DEMO_PASSWORD` when Render asks for unsynced secrets.
- [ ] Wait for API health check `/api/health/` to return HTTP 200.
- [ ] Open the frontend and log in with a seeded account.

## Render backend + Vercel frontend
- [ ] Deploy API/database with `render.backend.yaml`.
- [ ] Set Render `CORS_ALLOWED_ORIGINS=https://<vercel-host>`.
- [ ] Set Render `CSRF_TRUSTED_ORIGINS=https://<vercel-host>`.
- [ ] Set Vercel `VITE_API_URL=https://<render-api>/api`.
- [ ] Deploy frontend.

## Smoke test
- [ ] Login works.
- [ ] Dashboard loads real bootstrap data.
- [ ] Theory note/bookmark saves.
- [ ] Presentation opens.
- [ ] Video resumes and tracks watch progress.
- [ ] Test submits and score is calculated server-side.
- [ ] Test result appears in Results.
- [ ] Completed lesson unlocks the next lesson.
- [ ] Notifications can be marked read.
- [ ] Profile update and password change work.
- [ ] Student cannot access admin statistics.
