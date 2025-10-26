# PepTrackr (fresh app) — Mobile-first, Docker-ready

A clean starter that matches your spec:

- **Mobile UI** with a 5-button bottom nav: Settings · Weight · **Home** · Shot · Calc.
- **Header:** app name (left), current user (right).
- **Home:** stacked meds graph (PK vs Step model, 7/30/90d), two next-shot circular timers,
  weight chart (7/30/all), horizontal BMI gauge.
- **Settings:** add/switch users; preset meds **Retatrutide** (t1/2≈6d) & **Tirzepatide** (t1/2≈5d);
  add custom med (name, half-life days, frequency days); dark/light theme (dark default);
  backup/restore JSON; reset-all flow.
- **Shot:** log dose + datetime; paginated list with edit/delete.
- **Weight:** log weight + datetime; paginated list with edit/delete.
- **Calc:** dosage → units for a 1 mL (100U) syringe + simple graphic.
- **Server storage** in SQLite (swap to Postgres easily). No browser-local storage for app data.

## Quick Start (Docker Compose)
```bash
cp .env.sample .env
docker compose up -d --build
```

- Web UI: http://localhost:3000
- API docs: http://localhost:8080/docs
- Health: http://localhost:8080/health

## Environment
```
API_HOST=0.0.0.0
API_PORT=8080
DATABASE_URL=sqlite:///./data.db
CORS_ORIGINS=*
VITE_API_BASE=http://api:8080
```

## Notes on PK half-life presets
- **Retatrutide**: ~6 days (weekly dosing enabled).
- **Tirzepatide**: ~5 days (weekly dosing).

## Switch to Postgres (optional)
1. Uncomment the `postgres` service in `docker-compose.yml`.
2. Set `DATABASE_URL=postgresql+psycopg://app:app@postgres:5432/appdb` in `.env`.
3. Rebuild & redeploy.
