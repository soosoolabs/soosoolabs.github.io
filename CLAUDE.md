# soosoo-site — 수수(SooSoo) 회사 홈페이지

> ⚠️ **이 저장소는 공개(public)다** — GitHub Pages 무료의 조건. 여기 있는 모든 파일이 밖에서 보인다.
> 비밀값·전화번호·주소·식별번호(D-U-N-S 등)를 **어느 파일에도 적지 않는다.** 공개해도 되는 사업자 정보만 `data/site.json` 에.

## 0. 지금 어디까지 왔나 (2026-09-20)

| | |
|---|---|
| 정체 | 아키타입 **D 정적 사이트**. 회사 한 장 + 하루한톨 법적 문서 3장(방침·약관·지원). 서버·DB·로그인 없음 |
| 정본 주소 | **https://soosoo.kr** ✅ 살아 있음(Cloudflare Workers 정적 에셋 · `www` → 301) |
| 옛 주소 | `soosoolabs.github.io` = **껍데기**(`gh-pages` 브랜치 · 같은 경로로 soosoo.kr 에 넘긴다). 스토어·약관 문서에 박혀 있어 **죽이면 안 된다** |
| 디자인 | ⬜ **아직 없다** — 🧑 사장님이 클로드 디자인에서 만드신다. 지금 화면은 2026-08-25 임시본 |
| ★ **채크 앱 소개 페이지** | ✅ **https://soosoo.kr/chaeck/ 살아 있음**(9/20 밤 · 사장님 「추천대로」). 구조 = 「따지는 순서」(뭐 하는 앱 → 흐름 4단계 → 학부모: 내 아이 관리 → 정확성 3단계 → 안 되는 것 표 → 개인정보 → 선생님 → FAQ → 시작). 화면은 **채크 dev 데모 데이터 실제 캡처 8장**(`chaeck/img/`) · 채점펜 토큰 · 폰트 서브셋 자체 호스팅 · 스크립트 0. 🧑 눈으로 보고 「눈에 확」을 위한 다듬기는 클로드 디자인 차례(`doc/채크_소개_구상.md` §5) |
| 사업자 표기 | 상호·영문·대표·등록번호·이메일 ✅ · 전화·주소·통신판매업 신고번호 = **자리만**(`data/site.json` 의 `null` + 사유) |

## 1. 🔴 되돌리면 안 되는 것 (다음 세션이 되돌리지 말 것)

| 결정 | 왜 | 언제·누가 |
|---|---|---|
| 회사 도메인 **`soosoo.kr`** 하나, 앱은 서브도메인(`chaeck.soosoo.kr` …) | 구글 소유권 확인·갱신 기한이 **루트 한 번**으로 끝난다. QR·스토어에 박히면 못 바꾼다 | 2026-09-20 사장님 D-057 · `D:\App\chaeck\doc\02_출시\도메인_전략.md` |
| 배포처 **Cloudflare**(⛔Vercel 무료는 상업 사용 금지) | 전역 §0 | 2026-09-01 |
| 고정 경로 4개 `/` `/hantol/privacy/` `/hantol/terms/` `/hantol/support/` 를 **옮기지 않는다** | 하루한톨 스토어 제출물·약관 본문에 박힌 주소 | `data/site.json` fixed_paths · 검수기 A |
| **외부 요청 0**(폰트·스크립트·이미지 전부 우리 도메인) | 방침의 「외부 전송 없음」이 참이려면. 검수기 D 가 막는다 | 2026-08-25 |
| 디자인은 **클로드 디자인에서 사장님이** — 내가 화면을 짓지 않는다 | 전역 메모리 `feedback-design-in-claude-design` | 2026-06-17 |
| 옛 주소 `soosoolabs.github.io` 는 **껍데기로 살려 둔다** | 이미 나간 링크가 있을 수 있다(`chaeck.pages.dev` 와 같은 규칙) | 2026-09-20 |

## 2. 🧑 사장님 몫 / 🤖 제 몫

- 🧑 **홈 디자인**(클로드 디자인) · 전화·주소를 사이트에 **공개할지** · 하루한톨 법적 문서의 **내용**(그 프로젝트 `daily-verse` 가 정본 소유 — 여기선 게시만)
- 🤖 디자인 이식(`DesignSync` 로 읽어 `index.html` 에) · 빌드·검수·배포 · 옛 주소 껍데기 관리 · `data/site.json` 값 반영

## 3. 명령

```
npm run build          # 루트 소스 → dist/ (커밋 해시를 <meta name="build"> 로 박는다)
npm run check          # dist/ 를 data/site.json 과 대조 (고정 경로·메타·사업자 표기·외부 요청 0·옛 주소)
npm run check:selftest # 검수기를 일부러 깨뜨려 빨간불이 뜨는지 (삭제·값 조작·위치 이동·주입·경로 삭제·예외 만료)
npm run deploy         # build → check → wrangler deploy  (⛔ wrangler 를 맨손으로 부르지 않는다)
npm run deploy:check   # 배포된 사이트에 박힌 해시 = HEAD 인가 · 옛 주소가 넘어오나 (상태 셋: ✅ ❌ ⬜)
npm run fonts          # 페이지 글자만 담은 폰트 서브셋 생성(원본 = 채크 저장소 · OFL) — ⚠️문구를 고치면 다시 돌린다(check G 가 잡는다)
node tools/shots.mjs   # 375/1280 전체 스크린샷 → doc/shots/ + 네트워크 탭 외부 호스트 0건 확인(표준골격 ⑥)
```
- 배포 뒤 **반드시** `deploy:check` — 「업로드 성공」과 「최신 코드가 나간다」는 다르다.
- 검수 축 A~H(`tools/check.mjs` 머리). **F 페이지 규칙**(`data/site.json` page_rules)= 채크 정체성 금지어(등수·비교·최고·혁신·학원으로 연결·영어 특화·즉시 삭제) + 있어야 할 문장(30일·만 14세·학생 5명·10문항·방침 링크). 채크 방침·금지어가 바뀌면 여기부터 고친다.
- 검수는 **dist/(빌드 결과)** 에 대고 돈다. 루트 소스에 대고 돌리지 않는다(윈도우 디스크 함정 · 전역 refs).
- 🔒 헤더는 `deploy/_headers`(CSP `script-src 'none'`). **디자인이 스크립트를 쓰면 이 줄을 같이 고친다** — 안 그러면 화면은 뜨는데 동작이 죽는다.

## 4. 파일

```
index.html            수수 홈 (임시본 · 디자인 오면 교체 · 채크 카드 → /chaeck/)
chaeck/index.html     ★채크 앱 소개(스크립트 0 · 채점펜 토큰) · chaeck/img/ 실제 캡처 8장(채크 dev 데모 데이터 · 다시 찍으려면 채크 `npm run dev` + 홈에서 클릭해 들어가는 방식 — screens-plan 의 시험 ID 는 낡아 빈 화면이 나온다)
assets/fonts/         Pretendard·Paperlogy 서브셋(OFL) + manifest.json(글자 해시)
hantol/{privacy,terms,support}/index.html   하루한톨 법적 문서 — ⛔ 내용은 daily-verse 정본. 여기선 게시만
data/site.json        ★ 사람이 고치는 값은 여기뿐 (사업자 정보 · 고정 경로 · 옛 주소 예외(기한) · 검사 URL)
deploy/_headers       보안 헤더
src/worker.js         www → 루트 301 하나뿐 (_redirects 는 호스트 규칙을 못 쓴다 — 실측)
tools/{build,check,deploy-check}.mjs
wrangler.jsonc        name soosoo-site · assets ./dist · custom_domain soosoo.kr / www
doc/                  ⚠️ .gitignore 로 제외 — 공개 저장소에 안 올라간다(D:\ 로컬 전용). 인수인계 문서에 주소·전화가 있어서다
  절대규칙.md          충돌 시 이기는 문서
  채크_소개_구상.md      ★채크 앱 소개 페이지 구상(사실표·🧑 결정 8문항·「따지는 순서」 구조·표현 원칙) → 답이 오면 디자인_프롬프트_채크소개.md 완성본
  디자인_방향.md        수수 홈 🧑 선택 5문항(톤·소재·푸터·글꼴·카드) — 채크 소개 뒤
  홈페이지_인수인계.md   채크 세션이 넘긴 시작 재료(§6 참고 링크 R-001~027 판정표는 여기가 정본)
```

## 5. 언제 무엇을 부르나

| 상황 | 부른다 |
|---|---|
| 하루한톨 방침·약관 파일을 **바꾸는 커밋** | `privacy-auditor`(전역) — 단, 정본은 `daily-verse` 라 **그쪽 세션에서 초안 → 여기 게시** 순서 |
| 결제·후원·전화·주소를 **사이트에 넣자**는 말 | 전역 refs `출시_법정표시의무와_신고포상` · `data/site.json` 의 `_` 사유 줄 먼저 |
| 디자인 HTML 을 받아왔다 | `DesignSync` 로 읽고 이식 → `npm run deploy` → `deploy:check` → 스크린샷 375/1280 을 사장님께 |
| 앱이 하나 더 나온다 | 홈 카드 1개 추가 + 그 앱의 법적 문서 경로를 `fixed_paths` 에 + **gh-pages 껍데기는 안 만든다**(옛 주소로 나간 적 없는 경로) |

## 6. 표준골격 대조 (D 정적사이트 = ①②④⑤⑦)

① 이 문서 §0~2 ✅ · ② `doc/절대규칙.md` ✅ · ③ 잣대 = `data/site.json` + 검수기 C(개인정보 문서를 게시하므로 최소형) ✅ · ④ `check --selftest` 6방향 ✅ · ⑤ `deploy:check`(실물 URL) ✅ · ⑥ 눈으로 보기 ⬜ **없음** — 디자인 이식 때 스크린샷 도구를 넣는다 · ⑦ 현황판 = **해당 없음**(페이지 4장 · 이 문서 §0 표가 그 역할) · ⑧ 출시 게이트 = `npm run deploy` 가 check 를 통과해야만 올라간다.
