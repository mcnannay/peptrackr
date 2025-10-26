import express from "express";
import cors from "cors";
import pkg from "pg";
import { z } from "zod";

const { Pool } = pkg;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: +(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "peptrackr",
  password: process.env.PGPASSWORD || "peptrackr",
  database: process.env.PGDATABASE || "peptrackr"
});

// Initialize tables
async function init() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`).catch(()=>{});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_current BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(async (e)=>{
    // Fallback if extension not available for gen_random_uuid()
    if (String(e).includes("function gen_random_uuid() does not exist")) {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          is_current BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    } else { throw e; }
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS state (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, key)
    );
  `);

  // Ensure at least one user exists and is current
  const res = await pool.query(`SELECT id FROM users WHERE is_current = true LIMIT 1;`);
  if (res.rows.length === 0) {
    const created = await pool.query(`INSERT INTO users (name, is_current) VALUES ($1, true) RETURNING id;`, ["Default"]);
    const uid = created.rows[0].id;
    await pool.query(`INSERT INTO state (user_id, key, value) VALUES ($1,'profile',jsonb_build_object('name','Default')) ON CONFLICT DO NOTHING;`, [uid]);
  }
}

init().catch(err => {
  console.error("DB init error:", err);
  process.exit(1);
});

// Helper to get current user id
async function getCurrentUserId() {
  const res = await pool.query(`SELECT id FROM users WHERE is_current = true LIMIT 1;`);
  return res.rows[0]?.id;
}

// ----- State API -----

app.get("/api/state", async (req, res) => {
  try {
    const uid = await getCurrentUserId();
    if (!uid) return res.json({});
    const { rows } = await pool.query(`SELECT key, value FROM state WHERE user_id=$1;`, [uid]);
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});

const keyParam = z.string().min(1).max(64);

app.put("/api/state/:key", async (req, res) => {
  try {
    const k = keyParam.parse(req.params.key);
    const v = req.body?.value ?? null;
    const uid = await getCurrentUserId();
    if (!uid) return res.status(400).json({ error: "no user" });
    await pool.query(`
      INSERT INTO state (user_id,key,value,updated_at)
      VALUES ($1,$2,$3,now())
      ON CONFLICT (user_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
    `, [uid, k, v]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "invalid" });
  }
});

app.delete("/api/state/:key", async (req, res) => {
  try {
    const k = keyParam.parse(req.params.key);
    const uid = await getCurrentUserId();
    if (!uid) return res.json({ ok: true });
    await pool.query(`DELETE FROM state WHERE user_id=$1 AND key=$2;`, [uid, k]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "invalid" });
  }
});

// ----- Users API -----

app.get("/api/users", async (req, res) => {
  const { rows } = await pool.query(`SELECT id, name, is_current FROM users ORDER BY created_at ASC;`);
  res.json(rows);
});

app.get("/api/users/current", async (req, res) => {
  const { rows } = await pool.query(`SELECT id, name, is_current FROM users WHERE is_current=true LIMIT 1;`);
  res.json(rows[0] || null);
});

app.post("/api/users", async (req, res) => {
  const name = (req.body?.name || "").toString().trim() || "User";
  const { rows } = await pool.query(`INSERT INTO users (name, is_current) VALUES ($1,false) RETURNING id,name,is_current;`, [name]);
  res.json(rows[0]);
});

app.put("/api/users/:id", async (req, res) => {
  const id = req.params.id;
  const name = (req.body?.name || "").toString().trim();
  if (!name) return res.status(400).json({ error: "name required" });
  const { rowCount } = await pool.query(`UPDATE users SET name=$1 WHERE id=$2;`, [name, id]);
  res.json({ ok: rowCount > 0 });
});

app.put("/api/users/:id/select", async (req, res) => {
  const id = req.params.id;
  await pool.query(`UPDATE users SET is_current=false;`);
  await pool.query(`UPDATE users SET is_current=true WHERE id=$1;`, [id]);
  res.json({ ok: true });
});

// health
app.get("/api/healthz", (req, res) => res.json({ ok: true, t: Date.now() }));

const port = +(process.env.PORT || 3000);
app.listen(port, () => {
  console.log("Backend listening on " + port);
});
