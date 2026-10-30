// 홈 — 녹화는 화면 안에 들어왔을 때만 재생하고 벗어나면 멈춘다(폰 배터리·발열). 움직임 줄이기 설정이면 재생하지 않는다.
const vids = document.querySelectorAll("video[autoplay]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) {
  vids.forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
} else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting) { v.preload = "auto"; v.play().catch(() => {}); }
      else v.pause();
    }
  }, { rootMargin: "200px 0px" });
  vids.forEach((v) => io.observe(v));
}

// 반복 글자 띠 — 화면 밖이면 흐름을 멈춘다(.off)
const marq = document.querySelector(".marq");
if (marq && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => marq.classList.toggle("off", !e.isIntersecting)).observe(marq);
}
