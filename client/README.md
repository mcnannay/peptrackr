# PepTrackr

Mobile‑first medication & weight tracking app with PK/step dose models, upcoming shot gauges,
BMI gauge, and a dosing calculator with a realistic syringe + glass vial UI.

**This repo is set up for _Option A_: Portainer builds the image from source via `docker-compose.yml`.**

---

## Features

- Home dashboard
  - Medication chart: **Step** (instant rise + decay by half‑life) or **PK** (first‑order absorption with `k_a`).
  - View per‑med (optionally stacked) or total.
  - **Next two upcoming shots** as circular gauges (color‑coded).
  - **BMI** gauge with zones (Underweight/Healthy/Overweight/Obese).
  - **Weight** mini‑chart (Week / Month / All).

- Tabs
  - **Settings**: theme (dark/light), medication presets (Tirzepatide, Retatrutide), custom meds (name, color, half‑life hours, cadence days, `k_a` 1/h), backup/restore JSON, factory reset (type “yes”).
  - **Shot**: add a dose; “Save & Add Next” (+cadence days); **Add Series** over N weeks.
  - **Weight**: add/edit/delete entries; CSV import/export; profile (sex, height); BMI shown.
  - **Calculator**: dose in mg + vial mL + concentration → **units** (100 U = 1 mL), with
    a **realistic syringe** (needle left, glass barrel, rubber plunger, fine ticks) and **glass vial** (cap, neck, meniscus, mL ticks).

- Data stored in the browser’s **localStorage** (no DB).

---

## Local development

```bash
npm install
npm run dev
# open the printed localhost URL (usually http://localhost:5173)
```

Production build preview:
```bash
npm run build
npm run preview
```

---

## Docker (local)

```bash
docker build -t peptrackr:local .
docker run --rm -p 8080:80 peptrackr:local
# http://localhost:8080
```

---

## Deploy with Portainer (Stacks) — Option A

Portainer will clone this repo and **build** the image from the included `Dockerfile` using `docker-compose.yml`.

1. In Portainer → **Stacks** → **Add stack**.
2. Choose **Repository** tab.
3. **Repository URL**: your GitHub repo HTTPS URL.
4. **Compose path**: `docker-compose.yml`.
5. Deploy the stack.

`docker-compose.yml` (already included):

```yaml
version: "3.9"
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    image: peptrackr:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

> Change the host port if 8080 is in use (e.g., `8090:80`).

---

## App data / backup

- All data is stored in **localStorage** in the user’s browser.
- Use **Settings → Export JSON** to back up; **Import JSON** to restore.
- **Factory reset** wipes all app data (requires typing “yes” for safety).

---

## Project layout

```
.
├─ Dockerfile
├─ docker-compose.yml
├─ .dockerignore
├─ .gitignore
├─ package.json
├─ vite.config.js
├─ index.html
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   └─ styles.css
```

---

## Troubleshooting

- **White page after deploy**: check Portainer **Stack logs** → build logs for syntax errors.
- **Port clash**: change `ports:` in compose (left side of `8080:80`).
- **Slow rebuilds** on small machines: Portainer is compiling the React build; consider a registry-based deploy later (GHCR) if you want faster redeploys.

---

## License

MIT (or your preferred license).
