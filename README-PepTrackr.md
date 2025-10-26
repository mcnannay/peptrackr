# PepTrackr (v0.4.3)

## What was fixed
- Nginx proxy preserves `/api` prefix and serves `/health`
- Backend exposes `/health` and `/api/*` (users, meds, shots, weights, settings, state)
- Prisma schema for User/Med/Shot/Weight/Setting included
- UI: dark icons, solid bars, theme toggle, quick-add meds wired
- Healthchecks: curl-based with start periods

## Run
```
docker compose down -v
docker compose up -d --build
open http://localhost:8085
```


## v0.4.5
- Styled PK/Step toggle (dark chip)
- Preset meds allow editing frequency (days) and absorption t½ (hours)
- Added `absorptionHalfLifeHours` to Med
- Bulk add shots endpoint `/api/shots/bulk` and UI repeats control
