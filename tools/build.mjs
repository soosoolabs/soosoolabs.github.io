#!/usr/bin/env node
// 빌드 — 소스(저장소 루트의 페이지)를 dist/ 로 모아 배포 묶음을 만든다.
//   node tools/build.mjs
// 하는 일: ① dist/ 비우기 ② 허용목록 경로만 복사 ③ 모든 HTML 에 <meta name="build"> 로 커밋 해시를 박는다
//         ④ deploy/_headers·_redirects 복사 ⑤ dist/build.json
// ⛔ 소스는 루트에 그대로 둔다(GitHub Pages 가 루트를 서빙한다 — CLAUDE.md 「되돌리면 안 되는 것」).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));

function git(cmd) {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
}
const sha = git("rev-parse --short=12 HEAD") || "nogit";
const dirty = git("status --porcelain") ? "-dirty" : "";
const build = { sha: sha + dirty, date: new Date().toISOString() };

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const rel of site.build.include) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) throw new Error(`허용목록 경로가 없다: ${rel}`);
  cpSync(src, join(DIST, rel), { recursive: true });
}
for (const rel of site.build.deploy_files) {
  const src = join(ROOT, "deploy", rel);
  if (!existsSync(src)) throw new Error(`deploy/${rel} 가 없다`);
  cpSync(src, join(DIST, rel));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
let stamped = 0;
for (const f of walk(DIST)) {
  const html = readFileSync(f, "utf8");
  if (!/<meta charset/i.test(html)) throw new Error(`<meta charset> 이 없어 build 메타를 못 박는다: ${f}`);
  writeFileSync(f, html.replace(/(<meta charset[^>]*>)/i, `$1\n<meta name="build" content="${build.sha} ${build.date}">`));
  stamped++;
}
writeFileSync(join(DIST, "build.json"), JSON.stringify(build, null, 2) + "\n");
console.log(`✅ build → dist/ · HTML ${stamped}개 · build=${build.sha}`);
