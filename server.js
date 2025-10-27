import express from "express";
import fs from "fs/promises";
import path from "path";

const app = express();
app.use(express.json({ limit: "1mb" }));

const dataDir = "/data";
await fs.mkdir(dataDir, { recursive: true });

app.get("/api/:key", async (req, res) => {
  try {
    const f = path.join(dataDir, `${req.params.key}.json`);
    const txt = await fs.readFile(f, "utf8");
    res.type("application/json").send(txt);
  } catch {
    res.json([]);
  }
});

app.post("/api/:key", async (req, res) => {
  try {
    const f = path.join(dataDir, `${req.params.key}.json`);
    await fs.writeFile(f, JSON.stringify(req.body ?? [], null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.use(express.static("dist"));
app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));

app.listen(8085, () => console.log("PepTrackr v7.0 listening on :8085"));
