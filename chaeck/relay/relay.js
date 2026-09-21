/* 채크 소개 — 손넘김 릴레이 (화면 전체가 무대 · 스크롤이 카메라)
   장면 S0~S5 가 각각 SCENE_VH 만큼의 스크롤을 차지하고, 무대(.stage)는 화면에 고정된 채 배우들이 움직인다.
   t = 전체 진행(0~6, 장면 번호 + 장면 안 진행률). 배우마다 [t, 상태] 키프레임 표를 두고 사이를 보간한다.
   스크립트 없으면: 무대 고정이 풀리고 장면별 「끝 장면」이 정지 화면으로 쌓인다(CSS .nojs). 라이브러리 0 · 외부 요청 0. */
(function () {
  var d = document, h = d.documentElement; h.classList.add('js');
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var story = d.querySelector('.story'), stage = d.querySelector('.stage');
  if (!story || !stage) return;
  var N = 6;                                  // 장면 수
  var $ = function (s) { return stage.querySelector(s); };
  var A = { photo: $('.a-photo'), pc: $('.a-pc'), sheet: $('.a-sheet'), pen: $('.a-pen'), phone: $('.a-phone'),
            phoneB: $('.a-phone-b'), phoneC: $('.a-phone-c'), zero: $('.a-zero'), stamp: $('.a-stamp'), flash: $('.a-flash'),
            bg: $('.a-bg'), tags: $('.a-tags') };
  var steps = Array.prototype.slice.call(d.querySelectorAll('.step'));

  // ── 이징 ─────────────────────────────────────────────
  function io(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }    // easeInOutCubic
  function out(x) { return 1 - Math.pow(1 - x, 3); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  // 상태: x,y = 무대 폭·높이의 % · s = 배율 · r = 회전(deg) · o = 불투명
  var D = { x: 0, y: 0, s: 1, r: 0, o: 1 };
  function interp(track, t) {
    if (t <= track[0][0]) return track[0][1];
    for (var i = 1; i < track.length; i++) {
      if (t <= track[i][0]) {
        var a = track[i - 1], b = track[i], k = io((t - a[0]) / (b[0] - a[0])), st = {};
        for (var key in D) st[key] = lerp(a[1][key] == null ? D[key] : a[1][key], b[1][key] == null ? D[key] : b[1][key], k);
        return st;
      }
    }
    return track[track.length - 1][1];
  }
  function apply(el, st) {
    if (!el) return;
    var W = stage.clientWidth, H = stage.clientHeight;
    var x = (st.x == null ? 0 : st.x) * W / 100, y = (st.y == null ? 0 : st.y) * H / 100;
    el.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (st.r || 0).toFixed(2) + 'deg) scale(' + (st.s == null ? 1 : st.s).toFixed(4) + ')';
    el.style.opacity = (st.o == null ? 1 : st.o).toFixed(3);
  }

  // ── 키프레임 표 (t 절대값) ───────────────────────────
  var mob = matchMedia('(max-width: 720px)').matches;
  var K = {
    // S0 히어로: 실사가 화면을 채우고 → 카메라가 사진 속 폰 화면으로 들어간다(배율 1 → 3.2 · 원점은 CSS transform-origin = 폰 화면)
    photo: [[0, { s: 1, o: 1 }], [.55, { s: 1.35, o: 1 }], [.92, { s: 3.2, o: 1 }], [1.02, { s: 3.4, o: 0 }]],
    // S1 강사: PC 가 아래에서 올라와 가운데 → 답안지가 PC 아래에서 「인쇄」되어 나옴 → PC 는 왼쪽 뒤로
    pc:    [[.9, { x: 0, y: 70, s: .9, o: 0 }], [1.15, { x: mob ? 0 : 16, y: mob ? -24 : -6, s: mob ? .86 : .82, o: 1 }], [1.75, { x: mob ? 0 : 16, y: mob ? -24 : -6, s: mob ? .86 : .82, o: 1 }],
            [2.0, { x: mob ? 0 : -34, y: -12, s: .62, o: .35 }], [2.3, { x: -60, y: -14, s: .55, o: 0 }],
            // S4 강사 결과: 다시 앞으로
            [4.05, { x: mob ? 0 : 14, y: 40, s: .8, o: 0 }], [4.3, { x: mob ? 0 : 14, y: mob ? 10 : 2, s: mob ? .95 : .84, o: 1 }], [4.95, { x: mob ? 0 : 14, y: mob ? 10 : 2, s: mob ? .95 : .84, o: 1 }], [5.15, { x: 14, y: -30, s: .7, o: 0 }]],
    sheet: [[1.2, { x: mob ? 0 : 16, y: mob ? -4 : 8, s: .38, o: 0 }], [1.35, { x: mob ? 0 : 16, y: mob ? -4 : 8, s: .38, o: 1 }],           // PC 안에 있다
            [1.85, { x: mob ? 0 : 16, y: 46, s: .5, o: 1 }],                                                  // 인쇄돼 아래로 나온다
            [2.05, { x: mob ? 0 : 14, y: 4, s: mob ? .9 : 1.0, o: 1 }],                            // S2 화면 가득
            [2.95, { x: mob ? 0 : 14, y: 4, s: mob ? .9 : 1.0, o: 1 }],
            [3.35, { x: mob ? 0 : -18, y: 6, s: mob ? .62 : .66, o: 1 }],                                      // S3 폰 화면 안으로
            [3.95, { x: mob ? 0 : -18, y: 6, s: mob ? .62 : .66, o: 1 }], [4.15, { x: 0, y: 30, s: .5, o: 0 }]],
    pen:   [[3.4, { x: 30, y: -40, s: 1, o: 0, r: 30 }], [3.5, { x: mob ? 10 : -8, y: -10, s: 1, o: 1, r: 30 }], [3.92, { x: mob ? -8 : -26, y: 24, s: 1, o: 1, r: 30 }], [4.05, { x: -40, y: 40, s: 1, o: 0, r: 30 }]],
    phone: [[2.85, { x: mob ? 0 : -18, y: -80, s: 1, o: 0 }], [3.25, { x: mob ? 0 : -18, y: 0, s: 1, o: 1 }], [3.95, { x: mob ? 0 : -18, y: 0, s: 1, o: 1 }], [4.15, { x: mob ? 0 : -18, y: 40, s: .8, o: 0 }]],
    zero:  [[3.5, { x: mob ? 0 : -38, y: mob ? -30 : -8, s: .6, o: 0 }], [3.62, { x: mob ? 0 : -38, y: mob ? -30 : -8, s: 1, o: 1 }], [3.95, { x: mob ? 0 : -38, y: mob ? -30 : -8, s: 1, o: 1 }], [4.12, { x: mob ? 0 : -30, y: -30, s: .9, o: 0 }]],
    stamp: [[4.45, { x: mob ? 0 : 34, y: mob ? 32 : 26, s: 2.2, o: 0, r: -18 }], [4.6, { x: mob ? 0 : 34, y: mob ? 32 : 26, s: 1, o: 1, r: -8 }], [4.95, { x: mob ? 0 : 34, y: mob ? 32 : 26, s: 1, o: 1, r: -8 }], [5.15, { x: 26, y: 0, s: .8, o: 0, r: -8 }]],
    phoneB:[[4.95, { x: 0, y: 30, s: .6, o: 0 }], [5.3, { x: mob ? -24 : -34, y: mob ? -4 : 2, s: mob ? .8 : 1, o: 1 }], [6, { x: mob ? -24 : -34, y: mob ? -4 : 2, s: mob ? .8 : 1, o: 1 }]],
    phoneC:[[4.95, { x: 0, y: 30, s: .6, o: 0 }], [5.35, { x: mob ? 24 : -10, y: mob ? 4 : -2, s: mob ? .8 : 1, o: 1 }], [6, { x: mob ? 24 : -10, y: mob ? 4 : -2, s: mob ? .8 : 1, o: 1 }]],
    tags:  [[.0, { o: 1 }], [.4, { o: 0 }]]
  };
  // 배경색: 장면마다 화면 전체가 바뀐다(먹 ↔ 미색)
  var BG = [[0, '#EFE9DB'], [1.0, '#F1ECE0'], [2.0, '#F6F2E8'], [3.0, '#FFFFFF'], [3.95, '#FFFFFF'], [4.3, '#1B1A16'], [5.0, '#1B1A16'], [5.6, '#F1ECE0']];
  function bgAt(t) {
    for (var i = 1; i < BG.length; i++) if (t <= BG[i][0]) {
      var a = BG[i - 1], b = BG[i], k = io(clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
      var ca = hex(a[1]), cb = hex(b[1]);
      return 'rgb(' + Math.round(lerp(ca[0], cb[0], k)) + ',' + Math.round(lerp(ca[1], cb[1], k)) + ',' + Math.round(lerp(ca[2], cb[2], k)) + ')';
    }
    return BG[BG.length - 1][1];
  }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

  // ── 매 프레임 ───────────────────────────────────────
  var queued = false, lastScene = -1, shutterDone = false;
  function frame() {
    queued = false;
    var rect = story.getBoundingClientRect(), vh = innerHeight || 1;
    var total = story.offsetHeight - vh;                     // 무대가 고정돼 있는 스크롤 거리
    var t = clamp((-rect.top) / (total / N), 0, N);
    var scene = Math.min(N - 1, Math.floor(t)), p = t - scene;
    stage.style.setProperty('--t', t.toFixed(4)); stage.style.setProperty('--p', p.toFixed(4));
    stage.dataset.scene = scene;
    for (var k in K) apply(A[k], interp(K[k], t));
    if (A.bg) A.bg.style.background = bgAt(t);
    // S2 학생 연필: 스크롤한 만큼 행이 채워진다(10행)
    if (A.sheet) A.sheet.style.setProperty('--fill', (clamp((t - 2.15) / .75, 0, 1) * 10.5).toFixed(2));
    // S3: 셔터(p .38~.5) → O·X 채점(p .5~.92)
    if (A.flash) { var f = scene === 3 ? clamp(1 - Math.abs(p - .42) * 14, 0, 1) : 0; A.flash.style.opacity = f.toFixed(3); }
    if (A.sheet) A.sheet.style.setProperty('--grade', (clamp((t - 3.5) / .45, 0, 1) * 10.5).toFixed(2));
    if (A.zero) { var n = A.zero.querySelector('b'); if (n) n.textContent = Math.round(12 * (1 - out(clamp((t - 3.55) / .35, 0, 1)))); }
    // 글(스텝): 자기 장면 안에서만 보인다
    for (var i = 0; i < steps.length; i++) {
      var ti = t - i, vis = i === 0 ? 1 - clamp((t - .3) * 2.2, 0, 1) : clamp(1 - Math.abs(ti - .55) * 2.6 + .3, 0, 1);
      steps[i].style.opacity = vis.toFixed(3);
      steps[i].style.transform = 'translateY(' + ((1 - vis) * 24).toFixed(1) + 'px)';
    }
    // 장면이 바뀌는 순간: 그 장면의 영상은 처음부터
    if (scene !== lastScene) {
      lastScene = scene;
      stage.querySelectorAll('[data-scene-video="' + scene + '"] video').forEach(function (v) { try { v.currentTime = 0; v.play().catch(function () {}); } catch (_) {} });
    }
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  if (rm) { h.classList.add('nojs'); return; }              // 움직임 축소: 정지 화면(끝 장면들)
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); frame();
})();
