// 페이지 글자 집합 — tools/fonts.mjs(생성)와 tools/check.mjs(대조)가 같은 함수를 쓴다
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith(".html")) out.push(p); }
  return out;
}
// 페이지 글자 집합(HTML 태그·style·script 제외) — 검수기와 같은 함수
export function pageChars() {
  const set = new Set();
  for (const rel of site.build.include) {
    const p = join(ROOT, rel); if (!existsSync(p)) continue;
    const files = statSync(p).isDirectory() ? walk(p) : (p.endsWith(".html") ? [p] : []);
    for (const f of files) {
      const t = readFileSync(f, "utf8").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;|&#\d+;/gi, " ");
      for (const ch of t) if (ch.trim()) set.add(ch);
    }
  }
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c)); // ASCII 전부
  return [...set].sort().join("");
}
export const charsHash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

