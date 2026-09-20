# 수수(SooSoo) 홈페이지

**정본: https://soosoo.kr** (Cloudflare Workers 정적 에셋 · 2026-09-20 부터)
옛 주소 `soosoolabs.github.io` 는 `gh-pages` 브랜치의 껍데기가 같은 경로로 넘겨준다(스토어·약관에 박힌 주소라 살려 둔다).

> **왜 만들었나**: 구글 플레이 조직 계정 개설에 「조직 웹사이트」가 필수다. 애플은 판매자명이 대표자 실명으로 뜨므로 「수수」 브랜드를 묶어줄 자리가 여기뿐이다. 앱마다 방침·약관·도움말도 여기 게시한다.

## 쓰는 법
```
npm run deploy         # build → check → Cloudflare 업로드
npm run deploy:check   # 배포된 사이트의 커밋 해시 = HEAD 인가
npm run check:selftest # 검수기 자체 검증
```
값을 고칠 곳은 **`data/site.json` 하나**(사업자 정보·고정 경로·옛 주소 예외). 나머지 규칙은 `CLAUDE.md` · `doc/절대규칙.md`.

## 앱이 늘면
홈 카드 1개 추가 · 그 앱의 방침·약관·도움말을 `/<앱>/…/index.html` 로 · 경로를 `data/site.json` 의 `fixed_paths` 에 등록.

⚠️ **저장소가 공개다** — 공개해도 되는 사업자 정보만 둔다. 전화·주소·비밀값을 넣지 않는다.
