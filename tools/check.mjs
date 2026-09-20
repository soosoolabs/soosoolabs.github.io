#!/usr/bin/env node
// 검수기 — dist/ 를 data/site.json 의 「주장」과 대조한다. 실물(빌드 결과)에 대고 돈다.
//   node tools/check.mjs            → dist/ 검사. 위반이 있으면 exit 1, 대상이 0이면 exit 2(확인 못 함)
//   node tools/check.mjs --selftest → 일부러 깨뜨려 빨간불이 뜨는지 본다(삭제·값 조작·위치 이동·외부 요청 주입 + 정상 통과)
//   node tools/check.mjs --dir <폴더>
//
// 검사 축
//   A. 고정 경로가 전부 있다(스토어·약관에 박힌 주소 — 절대규칙 §1)
//   B. 모든 HTML: lang=ko · <title> · viewport · <meta name="build">
//   C. 사업자 표기 페이지: 상호·영문·대표·등록번호·이메일이 **보이는 본문**에 있다(주석·script 안은 안 친다)
//   D. 외부 요청 0 — script/link/img/iframe/url()/@import 가 http(s):// 를 가리키지 않는다
//   E. 옛 주소(github.io) 언급 — 예외 목록(기한 포함)에 없으면 위반 · 기한이 지난 예외도 위반
import { readFileSync, readdirSync, statSync, existsSync, cpSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(readFileSync(join(ROOT, "data/site.json"), "utf8"));
const args = process.argv.slice(2);
const dirArg = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "dist";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
// 「보이는 본문」만 남긴다 — 주석·script·style 을 벗겨 「있는데 안 보이는」 것을 없는 것으로 친다(위치 이동 방어)
const visible = (html) => html
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "");

export function run(dist) {
  const v = []; // 위반
  let targets = 0;
  if (!existsSync(dist)) return { targets: 0, violations: [`폴더가 없다: ${dist}`] };
  const pages = walk(dist);

  // A
  for (const p of site.fixed_paths) {
    targets++;
    const f = join(dist, p.replace(/\/$/, "/index.html").replace(/^\//, ""));
    if (!existsSync(f)) v.push(`A 고정 경로 없음: ${p}`);
  }
  // B
  for (const f of pages) {
    targets++;
    const html = readFileSync(f, "utf8"), rel = relative(dist, f);
    if (!/<html[^>]*\slang="ko"/i.test(html)) v.push(`B lang="ko" 없음: ${rel}`);
    if (!/<title>[^<]+<\/title>/i.test(html)) v.push(`B <title> 없음: ${rel}`);
    if (!/name="viewport"/i.test(html)) v.push(`B viewport 없음: ${rel}`);
    if (!/<meta name="build" content="[0-9a-f]{12}(-dirty)? /i.test(html)) v.push(`B build 메타 없음: ${rel}`);
  }
  // C
  const biz = site.business;
  const must = { 상호: biz.name_ko, 영문: biz.name_en, 대표: biz.representative, 등록번호: biz.registration_no, 이메일: biz.email };
  for (const p of site.business_info_pages) {
    const f = join(dist, p.replace(/\/$/, "/index.html").replace(/^\//, ""));
    if (!existsSync(f)) continue; // A 에서 이미 잡힌다
    const body = visible(readFileSync(f, "utf8"));
    for (const [k, val] of Object.entries(must)) {
      targets++;
      if (!val) { v.push(`C site.json 의 ${k} 가 비어 있다`); continue; }
      if (!body.includes(val)) v.push(`C ${k}(${val}) 가 보이는 본문에 없음: ${p}`);
    }
  }
  // D
  const ext = [
    [/<script[^>]+src=["']https?:\/\//gi, "script src"],
    [/<link[^>]+href=["']https?:\/\//gi, "link href"],
    [/<img[^>]+src=["']https?:\/\//gi, "img src"],
    [/<iframe[^>]+src=["']https?:\/\//gi, "iframe"],
    [/url\(\s*["']?https?:\/\//gi, "css url()"],
    [/@import\s+["']?https?:\/\//gi, "@import"],
  ];
  for (const f of pages) {
    targets++;
    const html = readFileSync(f, "utf8"), rel = relative(dist, f);
    for (const [re, label] of ext) {
      const hits = html.match(re) || [];
      if (hits.length) v.push(`D 외부 요청 ${label} ${hits.length}건: ${rel}`);
    }
  }
  // E
  const today = new Date().toISOString().slice(0, 10);
  for (const f of pages) {
    targets++;
    const html = readFileSync(f, "utf8"), rel = "/" + relative(dist, f).replace(/index\.html$/, "").replace(/\\/g, "/");
    for (const host of site.legacy_hosts) {
      const n = (html.match(new RegExp(host.replace(/\./g, "\\."), "g")) || []).length;
      if (!n) continue;
      const ex = site.legacy_exceptions.find((e) => e.path === rel);
      if (!ex) v.push(`E 옛 주소 ${host} ${n}건 · 예외 없음: ${rel}`);
      else if (ex.until < today) v.push(`E 옛 주소 ${host} ${n}건 · 예외 기한 지남(${ex.until}): ${rel} — ${ex.why}`);
    }
  }
  return { targets, violations: v };
}

function report(r, label = "") {
  const head = label ? `[${label}] ` : "";
  if (r.targets === 0) { console.log(`${head}⬜ 확인 못 함 — 대상 0건`); return 2; }
  if (r.violations.length) { console.log(`${head}❌ 대상 ${r.targets}건 중 위반 ${r.violations.length}건`); r.violations.forEach((x) => console.log("   - " + x)); return 1; }
  console.log(`${head}✅ 대상 ${r.targets}건 중 위반 0건`); return 0;
}

function selftest() {
  const src = join(ROOT, dirArg);
  if (!existsSync(src)) { console.log("⬜ selftest: dist/ 가 없다 — 먼저 build"); process.exit(2); }
  const cases = [];
  const fresh = () => { const t = mkdtempSync(join(tmpdir(), "soosoo-selftest-")); cpSync(src, t, { recursive: true }); return t; };
  const idx = (t) => join(t, "index.html");
  const no = site.business.registration_no;
  // 0 정상 → 통과해야 한다(오검출 방향)
  { const t = fresh(); cases.push(["정상본 통과", run(t).violations.length === 0, t]); }
  // 1 삭제
  { const t = fresh(); writeFileSync(idx(t), readFileSync(idx(t), "utf8").replace(no, "")); cases.push(["삭제(등록번호 제거)", run(t).violations.some((x) => x.startsWith("C 등록번호")), t]); }
  // 2 값 조작
  { const t = fresh(); writeFileSync(idx(t), readFileSync(idx(t), "utf8").replace(no, no.replace(/\d$/, (d) => (d === "9" ? "0" : String(+d + 1))))); cases.push(["값 조작(끝자리 바꿈)", run(t).violations.some((x) => x.startsWith("C 등록번호")), t]); }
  // 3 위치 이동 — 있긴 한데 주석 안(안 보이는 자리)
  { const t = fresh(); writeFileSync(idx(t), readFileSync(idx(t), "utf8").replace(no, "") + `<!-- ${no} -->`); cases.push(["위치 이동(주석 안)", run(t).violations.some((x) => x.startsWith("C 등록번호")), t]); }
  // 4 외부 요청 주입
  { const t = fresh(); writeFileSync(idx(t), readFileSync(idx(t), "utf8").replace("</head>", `<script src="https://example.com/x.js"></script></head>`)); cases.push(["외부 script 주입", run(t).violations.some((x) => x.startsWith("D 외부 요청 script")), t]); }
  // 5 고정 경로 삭제
  { const t = fresh(); rmSync(join(t, "hantol/privacy"), { recursive: true, force: true }); cases.push(["고정 경로 삭제(/hantol/privacy/)", run(t).violations.some((x) => x.startsWith("A 고정 경로 없음: /hantol/privacy/")), t]); }
  // 6 기한 지난 예외 → 위반이어야 한다
  { const t = fresh(); const saved = site.legacy_exceptions.map((e) => ({ ...e }));
    site.legacy_exceptions.forEach((e) => (e.until = "2000-01-01"));
    const hasLegacy = walk(t).some((f) => site.legacy_hosts.some((h) => readFileSync(f, "utf8").includes(h)));
    const ok = hasLegacy ? run(t).violations.some((x) => x.includes("예외 기한 지남")) : null;
    site.legacy_exceptions.forEach((e, i) => Object.assign(e, saved[i]));
    cases.push(["예외 기한 만료", ok, t]); }
  let bad = 0;
  for (const [name, ok, t] of cases) {
    console.log(`${ok === null ? "⬜" : ok ? "🔴→✅" : "❌"} ${name}${ok === null ? " (대상 없음 — 옛 주소 언급이 0건이라 시험 못 함)" : ""}`);
    if (ok === false) bad++;
    rmSync(t, { recursive: true, force: true });
  }
  console.log(bad ? `❌ selftest 실패 ${bad}건 — 이 검수기는 믿으면 안 된다` : "✅ selftest — 깨뜨린 만큼 빨간불이 떴다");
  process.exit(bad ? 1 : 0);
}

if (args.includes("--selftest")) selftest();
else process.exit(report(run(join(ROOT, dirArg))));
