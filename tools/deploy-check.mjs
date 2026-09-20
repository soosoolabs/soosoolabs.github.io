#!/usr/bin/env node
// 배포 확인 — API 가 아니라 **배포된 사이트에 박힌 커밋 해시**를 읽는다(chaeck 의 deploy:check 와 같은 원리).
//   node tools/deploy-check.mjs
// 상태는 셋이다: ✅ 최신 코드가 나간다 / ❌ 다른 코드가 나간다 / ⬜ 확인 못 함(접속 실패 등)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
const head = execSync("git rev-parse --short=12 HEAD", { cwd: ROOT }).toString().trim();

async function probe(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000), ...opts });
    const text = res.status < 300 ? await res.text() : "";
    return { ok: true, status: res.status, location: res.headers.get("location"), text };
  } catch (e) { return { ok: false, error: e.message }; }
}

let exit = 0;
const say = (icon, msg) => console.log(`${icon} ${msg}`);

// 1) 정본 주소 — 최신 커밋인가
for (const u of site.urls.check) {
  const r = await probe(u);
  if (!r.ok) { say("⬜", `${u} — 확인 못 함 (${r.error})`); exit = exit || 2; continue; }
  if (r.status !== 200) { say("❌", `${u} — HTTP ${r.status}`); exit = 1; continue; }
  const m = r.text.match(/<meta name="build" content="([0-9a-f]{12})(-dirty)? /);
  if (!m) { say("❌", `${u} — build 메타가 없다 (다른 서버가 응답 중?)`); exit = 1; continue; }
  if (m[1] === head) say("✅", `${u} — build ${m[1]}${m[2] || ""} = HEAD`);
  else { say("❌", `${u} — build ${m[1]}${m[2] || ""} ≠ HEAD ${head}`); exit = 1; }
}
// 2) 옛 주소 → 정본으로 넘어가나 (리다이렉트 또는 meta refresh)
for (const [from, to] of Object.entries(site.urls.redirects)) {
  const r = await probe(from);
  if (!r.ok) { say("⬜", `${from} — 확인 못 함 (${r.error})`); exit = exit || 2; continue; }
  const viaHeader = r.status >= 300 && r.status < 400 && (r.location || "").startsWith(to);
  const viaMeta = r.status === 200 && new RegExp(`http-equiv="refresh"[^>]*url=${to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(r.text);
  if (viaHeader || viaMeta) say("✅", `${from} → ${to} (${viaHeader ? "HTTP " + r.status : "meta refresh"})`);
  else { say("❌", `${from} — ${to} 로 안 넘어간다 (HTTP ${r.status}${r.location ? " → " + r.location : ""})`); exit = 1; }
}
process.exit(exit);
