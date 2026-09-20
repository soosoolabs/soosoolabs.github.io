/* 채크 소개 — 움직임 (우리 도메인 · 라이브러리 0 · 외부 요청 0)
   ① 트리거형: [data-in] 이 화면에 들어오면 .in 을 붙인다 → CSS 전환이 알아서 재생. 안의 영상은 처음부터 다시.
   ② 스크러빙: [data-scrub] 에 --p(0~1) 를 스크롤 위치로 써 준다 → CSS calc() 가 그만큼만 움직인다.
   스크립트가 없으면: .js 가 안 붙어 초기 숨김이 없고 --p 기본값 1 = 끝 장면. 정지 화면이지만 다 보인다.
   prefers-reduced-motion: 스크러빙 안 함(끝 장면 고정), 영상 재시작 안 함. */
(function () {
  var d = document, h = d.documentElement;
  h.classList.add('js');
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ① 들어오면 알아서
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add('in');
      if (!rm) el.querySelectorAll('video').forEach(function (v) {
        try { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (_) {}
      });
      io.unobserve(el);
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
  d.querySelectorAll('[data-in]').forEach(function (el) { io.observe(el); });

  // ② 스크롤한 만큼만
  var sc = Array.prototype.slice.call(d.querySelectorAll('[data-scrub]'));
  var queued = false;
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function update() {
    queued = false;
    var vh = innerHeight || 1;
    sc.forEach(function (el) {
      var p;
      if (el.getAttribute('data-scrub') === 'root') {
        // 페이지 맨 위에서 end×화면높이 만큼 내리면 1
        var end = parseFloat(el.getAttribute('data-end') || '0.7');
        p = (scrollY || h.scrollTop || 0) / (end * vh);
      } else {
        // 요소 윗변이 start×vh 에서 end×vh 까지 올라오는 동안 0→1
        var s = parseFloat(el.getAttribute('data-start') || '0.95');
        var e = parseFloat(el.getAttribute('data-end') || '0.5');
        var top = el.getBoundingClientRect().top;
        p = (s * vh - top) / ((s - e) * vh);
      }
      el.style.setProperty('--p', clamp01(p).toFixed(4));
    });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  if (!rm && sc.length) {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  }
})();
