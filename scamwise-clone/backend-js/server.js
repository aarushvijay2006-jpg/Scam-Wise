import "dotenv/config";
import express from "express";
import { analyzeLocal } from "./services/localRules.js";
import { checkSafeBrowsing, checkVirusTotal, fuse } from "./services/apis.js";

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => { res.header("Access-Control-Allow-Origin", "*"); res.header("Access-Control-Allow-Headers", "*"); res.header("Access-Control-Allow-Methods", "*"); if (req.method === "OPTIONS") return res.sendStatus(200); next(); });

app.get("/health", (req, res) => res.json({ ok: true, service: "scamwise-backend-js" }));

app.post("/analyze", async (req, res) => {
  const { url = "", text = "" } = req.body || {};
  const local = analyzeLocal(url, text);
  const [sb, vt] = await Promise.all([
    checkSafeBrowsing(url, process.env.SAFEBROWSING_KEY),
    checkVirusTotal(url, process.env.VT_KEY),
  ]);
  res.json({ verdict: fuse(local, sb, vt), signals: { local, safebrowsing: sb, virustotal: vt } });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`scamwise-js on :${port}`));
