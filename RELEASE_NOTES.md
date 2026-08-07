# Release notes — deploy-ready revision

- Fixed sidebar/header routing integration.
- Added Django REST backend and PostgreSQL-ready data model.
- Added JWT login, refresh rotation, logout blacklist and password validation.
- Moved test scoring to the backend and removed correct answers from bootstrap payloads.
- Added enrollment/lesson access controls.
- Added theory notes/bookmarks, presentation data and video progress tracking.
- Added 90% video completion, resume position and real study-minute tracking.
- Added automatic enrollment status and study-streak recalculation.
- Added results, notifications and admin/teacher announcement APIs.
- Added database-aware health check.
- Updated Render Blueprints to use `preDeployCommand` and `RENDER_EXTERNAL_URL`.
- Added free/demo and paid/persistent Render configurations.
- Added Vercel SPA configuration and split backend deployment Blueprint.
