# InfoEdu LMS

Full-stack LMS for theory lessons, presentations, video lessons, tests, results and student progress tracking.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4
- Backend: Django 5.2 LTS, Django REST Framework
- Auth: JWT access + rotating refresh tokens
- Database: PostgreSQL in production, SQLite for local development
- Deploy: Render Blueprint (one-click full stack) or Render backend + Vercel frontend

## Main features

- Student / teacher / admin roles
- Course → module → lesson structure
- Theory lessons with notes and bookmarks
- PDF / embedded presentations
- YouTube, Vimeo and direct video playback
- Video resume position and watched-percentage tracking
- Automatic video completion at 90%
- Server-side test scoring and attempt limits
- Test result review with explanations
- Course and lesson progress
- Weekly activity and study streaks
- Notifications and teacher/admin announcements
- Profile editing and password change
- Admin statistics

## Local run

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8000
```

### Frontend

In another terminal:

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

Local demo credentials are created by `python manage.py seed_demo`. Their password comes from `DEMO_PASSWORD` in `backend/.env`.

## Recommended quick deploy: Render Blueprint

Use `render.yaml` when you want the API, static frontend and PostgreSQL created together. This avoids manual CORS/API URL wiring because the Blueprint uses Render's `RENDER_EXTERNAL_URL` cross-service value.

Before the first deploy set `DEMO_PASSWORD` in the Render dashboard to a strong password. The value is intentionally not committed.

Render deploy order:

1. Build API and frontend.
2. Run Django migrations with `preDeployCommand`.
3. Start API and health-check `/api/health/`.
4. Run the one-time `seed_demo` hook.

> Render Free PostgreSQL is suitable for demo/testing only. As of 2026 it expires after 30 days. Use `render.production.yaml` (paid database/web service) for a persistent production deployment.

## Alternative deploy: Render backend + Vercel frontend

Use `render.backend.yaml` for the API/database only.

After Render creates the API:

1. Set Render `CORS_ALLOWED_ORIGINS` to the full Vercel URL, e.g. `https://your-project.vercel.app`.
2. Set Render `CSRF_TRUSTED_ORIGINS` to the same URL.
3. On Vercel set `VITE_API_URL=https://your-api.onrender.com/api`.
4. Deploy the Vite project using `vercel.json`.

## Production environment variables

Backend:

```env
DEBUG=False
SECRET_KEY=<generated-secret>
DATABASE_URL=<postgres-url>
ALLOWED_HOSTS=.onrender.com
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://your-frontend.example
CSRF_TRUSTED_ORIGINS=https://your-frontend.example
DEMO_MODE=False
DEMO_PASSWORD=<strong-initial-seed-password>
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

Frontend:

```env
VITE_API_URL=https://your-api.example/api
VITE_DEMO_MODE=false
```

## Validation

Frontend:

```bash
npm run type-check
npm run build
```

Backend:

```bash
cd backend
python manage.py check
python manage.py test
```

## Important security notes

- Correct test answers are never sent in the test-taking bootstrap payload.
- Test scoring is performed by Django, not by the browser.
- Students can only access enrolled/unlocked lessons.
- JWT refresh tokens rotate and old refresh tokens are blacklisted.
- Production demo-login is disabled with `DEMO_MODE=False`.
- Secrets and `.env` files are ignored by Git.

## Content management

Django admin is available at `/admin/`. The seeded admin account is created by `seed_demo`. Replace demo content with real university content after deployment.
