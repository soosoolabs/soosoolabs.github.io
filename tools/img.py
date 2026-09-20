#!/usr/bin/env python3
"""이미지 손보기 — 사장님이 AI(나노바나나)로 뽑은 이미지를 포토샵처럼 고친다. 글자는 안 넣는다(글자는 클로드 디자인).

  python3 tools/img.py info    <in>
  python3 tools/img.py fit     <in> <out> --ratio 3:2 [--anchor center|top|bottom|left|right] [--width 2400]
  python3 tools/img.py crop    <in> <out> --box x,y,w,h
  python3 tools/img.py adjust  <in> <out> [--bright 1.0] [--contrast 1.0] [--sat 1.0] [--warm 0] [--sharp 1.0]
  python3 tools/img.py screen  <in> <out> --shot <앱캡처> --quad x1,y1,x2,y2,x3,y3,x4,y4 [--radius 24] [--shade 0.12]
                               (검은 폰 화면 네 모서리 좌표: 왼쪽위→오른쪽위→오른쪽아래→왼쪽아래 · 원본 픽셀 기준)
  python3 tools/img.py dark    <in> --box x,y,w,h   (그 영역이 「꺼진 검은 화면」인지 — 평균 밝기·편차를 잰다)
  python3 tools/img.py tile    <in> <out> [--size 512]   (이음새 없이 타일이 되나 — 2×2 로 붙여 확인용)
  python3 tools/img.py webp    <in> <out> [--quality 82] [--width 1600]   (배포용 축소·변환)
  python3 tools/img.py rmbg    <in> <out.png>   (배경 제거 · hyperframes 로컬 모델 · 외부 전송 0)
"""
import sys, argparse, subprocess, os
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import numpy as np

def parse_ratio(s):
    a, b = s.split(":"); return float(a) / float(b)

def cmd_info(a):
    im = Image.open(a.inp); print(f"{a.inp}: {im.size[0]}x{im.size[1]} {im.mode} {im.format} · 비율 {im.size[0]/im.size[1]:.3f}")

def cmd_fit(a):
    im = Image.open(a.inp).convert("RGB"); W, H = im.size; r = parse_ratio(a.ratio)
    if W / H > r: w = int(H * r); h = H
    else: w = W; h = int(W / r)
    ax = {"left": 0, "right": W - w}.get(a.anchor, (W - w) // 2)
    ay = {"top": 0, "bottom": H - h}.get(a.anchor, (H - h) // 2)
    out = im.crop((ax, ay, ax + w, ay + h))
    if a.width and out.size[0] > a.width: out = out.resize((a.width, int(out.size[1] * a.width / out.size[0])), Image.LANCZOS)
    out.save(a.out, quality=92); print(f"✅ fit {a.ratio} → {out.size[0]}x{out.size[1]} {a.out}")

def cmd_crop(a):
    x, y, w, h = map(int, a.box.split(",")); im = Image.open(a.inp); im.crop((x, y, x + w, y + h)).save(a.out, quality=92); print(f"✅ crop → {w}x{h} {a.out}")

def cmd_adjust(a):
    im = Image.open(a.inp).convert("RGB")
    if a.bright != 1: im = ImageEnhance.Brightness(im).enhance(a.bright)
    if a.contrast != 1: im = ImageEnhance.Contrast(im).enhance(a.contrast)
    if a.sat != 1: im = ImageEnhance.Color(im).enhance(a.sat)
    if a.sharp != 1: im = ImageEnhance.Sharpness(im).enhance(a.sharp)
    if a.warm:  # 양수 = 따뜻하게(빨강↑ 파랑↓) · 음수 = 차갑게
        arr = np.asarray(im).astype(np.float32); arr[..., 0] = np.clip(arr[..., 0] + a.warm, 0, 255); arr[..., 2] = np.clip(arr[..., 2] - a.warm, 0, 255)
        im = Image.fromarray(arr.astype(np.uint8))
    im.save(a.out, quality=92); print(f"✅ adjust → {a.out}")

def _coeffs(src, dst):
    # dst(사각형 네 점) → src(원본 이미지 네 점) 투시 계수 (Pillow QUAD 규약: 결과 이미지의 각 픽셀이 원본 어디에서 오나)
    M = []
    for (x, y), (X, Y) in zip(dst, src):
        M.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); M.append([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    A = np.array(M, dtype=np.float64); b = np.array([c for p in src for c in p], dtype=np.float64)
    return np.linalg.solve(A, b)

def cmd_screen(a):
    base = Image.open(a.inp).convert("RGBA"); shot = Image.open(a.shot).convert("RGBA")
    q = list(map(float, a.quad.split(","))); quad = [(q[0], q[1]), (q[2], q[3]), (q[4], q[5]), (q[6], q[7])]
    # 화면 비율에 맞게 캡처를 위에서부터 잘라 쓴다(폰 캡처는 세로로 길다)
    qw = max(np.hypot(quad[1][0]-quad[0][0], quad[1][1]-quad[0][1]), np.hypot(quad[2][0]-quad[3][0], quad[2][1]-quad[3][1]))
    qh = max(np.hypot(quad[3][0]-quad[0][0], quad[3][1]-quad[0][1]), np.hypot(quad[2][0]-quad[1][0], quad[2][1]-quad[1][1]))
    sw, sh = shot.size; target = qw / qh
    if sw / sh > target: nw = int(sh * target); shot = shot.crop(((sw - nw)//2, 0, (sw - nw)//2 + nw, sh))
    else: nh = int(sw / target); shot = shot.crop((0, 0, sw, nh))
    # 모서리 둥글게 + 살짝 어둡게(유리 뒤 느낌)
    if a.radius:
        m = Image.new("L", shot.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, shot.size[0]-1, shot.size[1]-1), radius=int(a.radius * shot.size[0] / qw), fill=255); shot.putalpha(m)
    if a.shade: shot = Image.blend(shot, Image.new("RGBA", shot.size, (0, 0, 0, 255)), a.shade).convert("RGBA"); shot.putalpha(m if a.radius else 255)
    src = [(0, 0), (shot.size[0], 0), (shot.size[0], shot.size[1]), (0, shot.size[1])]
    warped = shot.transform(base.size, Image.PERSPECTIVE, _coeffs(src, quad), Image.BICUBIC)
    out = Image.alpha_composite(base, warped).convert("RGB"); out.save(a.out, quality=92)
    print(f"✅ screen — 캡처를 {[tuple(map(int,p)) for p in quad]} 에 얹음 → {a.out}")

def cmd_dark(a):
    x, y, w, h = map(int, a.box.split(",")); arr = np.asarray(Image.open(a.inp).convert("L").crop((x, y, x+w, y+h))).astype(np.float32)
    mean, std = arr.mean(), arr.std(); ok = mean < 40 and std < 18
    print(f"{'✅' if ok else '❌'} 화면 영역 평균 밝기 {mean:.0f}/255 · 편차 {std:.0f} — {'꺼진 검은 유리로 쓸 수 있다' if ok else '가짜 UI·반사가 있다 → 다시 뽑거나 crop 으로 피한다'}")
    sys.exit(0 if ok else 1)

def cmd_tile(a):
    im = Image.open(a.inp).convert("RGB").resize((a.size, a.size), Image.LANCZOS)
    out = Image.new("RGB", (a.size*2, a.size*2)); [out.paste(im, (i*a.size, j*a.size)) for i in range(2) for j in range(2)]
    out.save(a.out, quality=92); print(f"✅ tile 2×2 → {a.out} (이음새가 보이면 타일로 못 쓴다)")

def cmd_webp(a):
    im = Image.open(a.inp).convert("RGB")
    if a.width and im.size[0] > a.width: im = im.resize((a.width, int(im.size[1] * a.width / im.size[0])), Image.LANCZOS)
    im.save(a.out, "WEBP", quality=a.quality, method=6); print(f"✅ webp {im.size[0]}x{im.size[1]} {os.path.getsize(a.out)//1024}KB → {a.out}")

def cmd_rmbg(a):
    hf = os.path.expanduser("~/motion/hf.sh")
    r = subprocess.run([hf, "remove-background", a.inp, "-o", a.out], capture_output=True, text=True)
    print(("✅ 배경 제거 → " + a.out) if r.returncode == 0 and os.path.exists(a.out) else ("❌ 실패\n" + (r.stderr or r.stdout)[-800:]))
    sys.exit(0 if r.returncode == 0 else 1)

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = p.add_subparsers(dest="cmd", required=True)
s = sp.add_parser("info"); s.add_argument("inp"); s.set_defaults(f=cmd_info)
s = sp.add_parser("fit"); s.add_argument("inp"); s.add_argument("out"); s.add_argument("--ratio", required=True); s.add_argument("--anchor", default="center"); s.add_argument("--width", type=int, default=0); s.set_defaults(f=cmd_fit)
s = sp.add_parser("crop"); s.add_argument("inp"); s.add_argument("out"); s.add_argument("--box", required=True); s.set_defaults(f=cmd_crop)
s = sp.add_parser("adjust"); s.add_argument("inp"); s.add_argument("out"); [s.add_argument(k, type=float, default=1.0) for k in ("--bright", "--contrast", "--sat", "--sharp")]; s.add_argument("--warm", type=float, default=0); s.set_defaults(f=cmd_adjust)
s = sp.add_parser("screen"); s.add_argument("inp"); s.add_argument("out"); s.add_argument("--shot", required=True); s.add_argument("--quad", required=True); s.add_argument("--radius", type=float, default=24); s.add_argument("--shade", type=float, default=0.12); s.set_defaults(f=cmd_screen)
s = sp.add_parser("dark"); s.add_argument("inp"); s.add_argument("--box", required=True); s.set_defaults(f=cmd_dark)
s = sp.add_parser("tile"); s.add_argument("inp"); s.add_argument("out"); s.add_argument("--size", type=int, default=512); s.set_defaults(f=cmd_tile)
s = sp.add_parser("webp"); s.add_argument("inp"); s.add_argument("out"); s.add_argument("--quality", type=int, default=82); s.add_argument("--width", type=int, default=1600); s.set_defaults(f=cmd_webp)
s = sp.add_parser("rmbg"); s.add_argument("inp"); s.add_argument("out"); s.set_defaults(f=cmd_rmbg)
a = p.parse_args(); a.f(a)
