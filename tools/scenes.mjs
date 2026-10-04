#!/usr/bin/env node
// 장면별 뷰포트 스크린샷 — 릴레이는 sticky 무대라 fullPage 로는 못 본다. t(0~6) 지점마다 한 장씩.
//   node tools/scenes.mjs [폭=1920] [dpr=1] [접두=now] [높이=폭×9/16]   → doc/shots/scenes/<접두>-t<값>.png
//   폰: node tools/scenes.mjs 375 2 phone 812
import { existsSync, mkdirSync, createReadStream, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "doc/shots/scenes");
const [W = "1920", DPR = "1", PRE = "now", H] = process.argv.slice(2);
if (!existsSync(DIST)) { console.log("⬜ dist/ 가 없다 — 먼저 build"); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const LIBDIR = `${homedir()}/.cache/chaeck/browserlibs`;
if (existsSync(LIBDIR)) process.env.LD_LIBRARY_PATH = `${LIBDIR}:${process.env.LD_LIBRARY_PATH || ""}`;
const { chromium } = createRequire("/mnt/d/App/chaeck/package.json")("playwright");

const MIME = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".css": "text/css", ".js": "text/javascript; charset=utf-8", ".mp4": "video/mp4", ".webp": "image/webp", ".jpg": "image/jpeg" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = join(DIST, p);
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const w = +W, h = H ? +H : Math.round(w * 9 / 16);
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +DPR })).newPage();
  await page.goto(base + "/chaeck/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (const t of [0, 0.7, 1.5, 2.5, 3.5, 3.9, 4.6, 5.6, 6]) {
    await page.evaluate((t) => {
      const s = document.querySelector(".story"); const top = s.getBoundingClientRect().top + scrollY;
      window.scrollTo({ top: top + (s.offsetHeight - innerHeight) * t / 6, behavior: "instant" });
    }, t);
    await page.waitForTimeout(700);
    const f = join(OUT, `${PRE}-t${t}.png`);
    await page.screenshot({ path: f });
    console.log("📸", f.split("/").slice(-2).join("/"));
  }
} finally { await browser.close(); server.close(); }
