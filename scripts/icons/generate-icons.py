"""
앱·환경별 아이콘 생성기 (ssccops#290).

세 앱(www·admin·lms)이 같은 마크를 쓰되 색으로 갈리고, dev 배포는 우하단 호박색 모서리로
prod와 갈린다. 손으로 그린 파일 30개를 관리하지 않는다 — 원본 하나(`source.png`)와 이
스크립트가 정본이고, 색을 바꾸려면 PALETTES 한 줄을 고치고 다시 돌린다.

    python scripts/icons/generate-icons.py

산출물 (앱마다):
    apps/<app>/public/icons/{prod,dev}/favicon.ico · icon-192.png · icon-512.png
                                      · icon-512-maskable.png · apple-touch-icon.png
    scripts/icons/board.png  — 시안 한 장 (이슈·PR에 붙이는 용도)

원본 마크는 진회색 글자 + 연회색 그림자다. 밝기로 둘을 갈라 마스크를 만들고, 그 마스크로
그라디언트를 찍는다 — 모양은 손대지 않는다. 투명 픽셀은 밝기가 0으로 읽히므로 알파를 먼저 본다.
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).with_name("source.png")
APPS = ["www", "admin", "lms"]

# 앱별 색 — (위치 0..1, RGB). 대각선 그라디언트.
PALETTES: dict[str, list[tuple[float, tuple[int, int, int]]]] = {
    # www — 원본 진회색. 공개 사이트가 기본형이다
    "www": [(0, (68, 68, 68)), (1, (68, 68, 68))],
    # admin — 인스타그램 그라디언트(보라 → 자홍 → 주황). 동아리 인스타 계정과 같은 인상
    "admin": [(0, (131, 58, 180)), (0.5, (253, 29, 29)), (1, (252, 176, 69))],
    # lms — 학술: 남색 → 청록
    "lms": [(0, (30, 58, 138)), (1, (13, 148, 136))],
}
DEV_AMBER = (245, 158, 11, 255)


def masks(src: Image.Image) -> tuple[Image.Image, Image.Image]:
    gray, alpha = src.convert("L"), src.getchannel("A")
    w, h = src.size
    mark, shadow = Image.new("L", (w, h), 0), Image.new("L", (w, h), 0)
    gp, ap, mp, sp = gray.load(), alpha.load(), mark.load(), shadow.load()
    for y in range(h):
        for x in range(w):
            if ap[x, y] < 128:
                continue
            v = gp[x, y]
            if v < 120:
                mp[x, y] = 255
            elif v < 215:
                sp[x, y] = 255 - int((v - 120) * 255 / 95)
    return mark, shadow


def gradient(w: int, h: int, stops) -> Image.Image:
    img = Image.new("RGB", (w, h))
    p = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h - 2)
            for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
                if p0 <= t <= p1:
                    k = (t - p0) / (p1 - p0) if p1 > p0 else 0
                    p[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
                    break
    return img


def dev_badge(im: Image.Image) -> None:
    """우하단 호박색 모서리 + 흰 'D'. 16px에서는 글자가 안 보여도 주황 덩어리로 갈린다."""
    w, h = im.size
    d = ImageDraw.Draw(im)
    r = int(w * 0.42)
    d.polygon([(w, h), (w - r, h), (w, h - r)], fill=DEV_AMBER)
    cx, cy, s = w - r * 0.28, h - r * 0.28, r * 0.16
    d.rectangle([cx - s, cy - s * 1.3, cx - s * 0.45, cy + s * 1.3], fill="white")
    d.pieslice([cx - s * 1.2, cy - s * 1.3, cx + s * 0.9, cy + s * 1.3], -90, 90, fill="white")
    d.pieslice([cx - s * 0.7, cy - s * 0.65, cx + s * 0.35, cy + s * 0.65], -90, 90, fill=DEV_AMBER)


def render(src: Image.Image, mark: Image.Image, shadow: Image.Image, app: str, dev: bool) -> Image.Image:
    w, h = src.size
    fill = gradient(w, h, PALETTES[app]).convert("RGBA")
    out = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    sc = fill.copy()
    sc.putalpha(shadow.point(lambda v: int(v * 0.35)))
    out = Image.alpha_composite(out, sc)
    fill.putalpha(mark)
    out = Image.alpha_composite(out, fill)
    if dev:
        dev_badge(out)
    return out


def maskable(im: Image.Image) -> Image.Image:
    """maskable은 안전 영역(중앙 80%) 안에 마크가 들어가야 한다 — 흰 바탕에 축소해 앉힌다."""
    w, h = im.size
    canvas = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    inner = im.resize((int(w * 0.8), int(h * 0.8)), Image.LANCZOS)
    canvas.paste(inner, ((w - inner.width) // 2, (h - inner.height) // 2), inner)
    return canvas


def write_set(im: Image.Image, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    im.resize((512, 512), Image.LANCZOS).save(out_dir / "icon-512.png")
    im.resize((192, 192), Image.LANCZOS).save(out_dir / "icon-192.png")
    maskable(im).resize((512, 512), Image.LANCZOS).save(out_dir / "icon-512-maskable.png")
    im.resize((180, 180), Image.LANCZOS).save(out_dir / "apple-touch-icon.png")
    # ICO 는 16·32·48 세 크기를 한 파일에 — 브라우저가 탭·즐겨찾기·바로가기에 맞는 것을 고른다
    im.resize((48, 48), Image.LANCZOS).save(
        out_dir / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    mark, shadow = masks(src)
    tiles = []
    for app in APPS:
        for dev in (False, True):
            im = render(src, mark, shadow, app, dev)
            write_set(im, ROOT / "apps" / app / "public" / "icons" / ("dev" if dev else "prod"))
            tiles.append((f"{app}{'-dev' if dev else ''}", im))
            print("wrote", app, "dev" if dev else "prod")

    board = Image.new("RGB", (len(tiles) * 140 + 20, 220), "white")
    d = ImageDraw.Draw(board)
    for i, (name, im) in enumerate(tiles):
        x = 10 + i * 140
        board.paste(im.resize((128, 128), Image.LANCZOS), (x, 10))
        board.paste(im.resize((32, 32), Image.LANCZOS), (x, 150))
        board.paste(im.resize((16, 16), Image.LANCZOS), (x + 40, 158))
        d.text((x + 64, 195), name, fill="black", anchor="ms")
    board.save(Path(__file__).with_name("board.png"))
    print("wrote board.png")


if __name__ == "__main__":
    main()
