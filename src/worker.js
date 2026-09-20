// www.soosoo.kr → soosoo.kr 로 넘기는 것이 전부다. 나머지는 정적 에셋(dist/)이 그대로 나간다.
// (_redirects 파일은 호스트 기준 규칙을 허용하지 않아서 — "Only relative URLs are allowed" · 2026-09-20 실측)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
