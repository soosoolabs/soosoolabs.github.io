#!/usr/bin/env node
// 폰트 서브셋 — 페이지에 실제로 쓰인 글자만 담은 woff2 를 만든다(외부 요청 0 · 용량 최소).
//   node tools/fonts.mjs
// 원본: data/site.json fonts.sources (채크 저장소 public/fonts · Pretendard·Paperlogy 둘 다 SIL OFL 1.1)
// 산출: assets/fonts/*.woff2 + assets/fonts/manifest.json(글자 집합 해시) — 검수기 F 가 페이지 글자와 대조한다.
// ⚠️ 문구를 고치면 다시 돌린다(안 돌리면 check 가 빨간불을 낸다).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { pageChars, charsHash } from "./fonts-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
const OUT = join(ROOT, "assets/fonts");
mkdirSync(OUT, { recursive: true });

const text = pageChars();
const textFile = join(OUT, ".chars.txt");
writeFileSync(textFile, text);
const made = [];
for (const [name, src] of Object.entries(site.fonts.sources)) {
  if (!existsSync(src)) { console.log(`⬜ 원본 없음: ${src}`); continue; }
  const out = join(OUT, name);
  execFileSync("pyftsubset", [src, `--text-file=${textFile}`, "--flavor=woff2", `--output-file=${out}`, "--layout-features=*", "--no-hinting", "--desubroutinize"], { stdio: "inherit" });
  made.push({ name, bytes: statSync(out).size, source: src });
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ chars: text.length, hash: charsHash(text), made, at: new Date().toISOString() }, null, 2) + "\n");
console.log(`✅ fonts — 글자 ${text.length}자 · ` + made.map((m) => `${m.name} ${(m.bytes / 1024).toFixed(0)}KB`).join(" · "));
