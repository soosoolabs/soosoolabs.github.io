#!/usr/bin/env node
// 눈으로 보기 — dist/ 를 정적 서버로 띄워 375·1280 폭 전체 스크린샷을 doc/shots/ 에 남긴다(표준골격 ⑥).
//   node tools/shots.mjs [/chaeck/ ...]   (기본: site.json fixed_paths 전부)
// 브라우저는 채크 저장소의 playwright + ~/.cache/chaeck/browserlibs(sudo 없이 추출한 시스템 라이브러리)를 빌려 쓴다.
import { existsSync, mkdirSync, readFileSync, createReadStream, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "doc/shots");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
const paths = process.argv.slice(2).length ? process.argv.slice(2) : site.fixed_paths;
if (!existsSync(DIST)) { console.log("⬜ dist/ 가 없다 — 먼저 build"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const LIBDIR = `${homedir()}/.cache/chaeck/browserlibs`;
if (existsSync(LIBDIR)) process.env.LD_LIBRARY_PATH = `${LIBDIR}:${process.env.LD_LIBRARY_PATH || ""}`;
const require = createRequire("/mnt/d/App/chaeck/package.json");
const { chromium } = require("playwright");

const MIME = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".css": "text/css" };
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
const ext = []; // 외부 호스트 요청 — 0 이어야 한다(절대규칙 2 · 눈이 아니라 네트워크로 잰다)
try {
  for (const p of paths) {
    for (const [label, vp] of [["375", { width: 375, height: 812 }], ["1280", { width: 1280, height: 800 }]]) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      page.on("request", (rq) => { const u = new URL(rq.url()); if (u.origin !== base) ext.push(rq.url()); });
      await page.goto(base + p, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // loading="lazy" 이미지는 스크롤해야 뜬다 — 끝까지 내려갔다 올라온 뒤 찍는다(안 그러면 빈 액자가 「버그」로 보인다)
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
      await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(400);
      // fullPage 캡처는 sticky 헤더를 엉뚱한 자리에 그린다(Playwright 특성) — 찍을 때만 고정 해제(사이트 코드는 그대로)
      await page.evaluate(() => { const h = document.querySelector("header.top"); if (h) h.style.position = "static"; const st = document.createElement("style"); st.id = "rv-off"; st.textContent = ".rv{animation:none!important;opacity:1!important;transform:none!important}"; document.head.appendChild(st); });
      const file = join(OUT, `${p.replace(/\//g, "_").replace(/^_|_$/g, "") || "home"}-${label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`📸 ${p} @${label} → doc/shots/${file.split("/").pop()}`);
      await ctx.close();
    }
  }
} finally { await browser.close(); server.close(); }
if (ext.length) { console.log(`❌ 외부 호스트 요청 ${ext.length}건:`); ext.forEach((u) => console.log("   - " + u)); process.exit(1); }
console.log("✅ 외부 호스트 요청 0건(네트워크 탭 기준)");
