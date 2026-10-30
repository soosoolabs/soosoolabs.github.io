// W3 「AI 검색 로봇 열림 · 학습 로봇 닫힘」 — 배포된 robots.txt(Cloudflare 자동분 + 우리 파일)를 읽어 판정한다
//   deploy-check 가 실물에 대고 부르고, check --selftest 가 일부러 깨뜨린 글로 부른다(IL-040 · 2026-10-30)
// 단순판: `Disallow: /`(또는 `*` 그룹의 전체 차단)만 본다 — Allow 우선순위·부분 경로는 안 본다.
// ⚠️ robots 가 맞아도 Cloudflare 방화벽이 검색 로봇을 403 으로 막을 수 있다(10/30 실측 · AI 정책 학습 칸 「차단」) — 이 검사로는 안 보인다.
export const SEARCH = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Googlebot", "Bingbot", "Yeti"];
// Google-Extended 는 여기 넣지 않는다 — 사장님 10/30 「Gemini 허용 · 하루한톨 제외」(site.json search.google_extended · 검수기 J 가 본다)
export const TRAIN = ["GPTBot", "ClaudeBot", "CCBot"];

export function blockedAll(txt) {
  const out = new Set(); let agents = []; let inRules = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const i = line.indexOf(":"); if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(); const v = line.slice(i + 1).trim();
    if (k === "user-agent") { if (inRules) { agents = []; inRules = false; } agents.push(v.toLowerCase()); }
    else { inRules = true; if (k === "disallow" && v === "/") agents.forEach((a) => out.add(a)); }
  }
  return out;
}

export function checkW3(txt) {
  const b = blockedAll(txt);
  const searchBlocked = SEARCH.filter((s) => b.has(s.toLowerCase()) || b.has("*"));
  const trainOpen = TRAIN.filter((t) => !b.has(t.toLowerCase()));
  return { searchBlocked, trainOpen, ok: !searchBlocked.length && !trainOpen.length };
}
