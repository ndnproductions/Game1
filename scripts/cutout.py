#!/usr/bin/env python3
"""Turn raw character generations into game-ready sprites.

Reads images from art-drop/, keys out a flat background (magenta or
near-white), trims to the subject, scales to a common height, and writes
lossy WebP into src/sticky/assets/characters/ under the archetype name.

Usage:
  python3 scripts/cutout.py art-drop/tourist.png            # name from file
  python3 scripts/cutout.py art-drop/img_0042.png --as suit # explicit name
  python3 scripts/cutout.py --all                           # every file whose
                                                            # name matches the cast
"""
import argparse
import pathlib
import sys

from PIL import Image

CAST = ["tourist", "suit", "grandma", "jogger", "guard"]
OUT_DIR = pathlib.Path("src/sticky/assets/characters")
TARGET_HEIGHT = 640
WEBP_QUALITY = 84

# Background keying: a pixel is background when it sits close to the detected
# background colour. Distance runs on RGB with a soft band so anti-aliased
# edges fade out instead of leaving a fringe.
HARD_DIST = 58
SOFT_DIST = 118


def detect_background(img: Image.Image) -> tuple[int, int, int]:
    """The background colour, sampled from the four corners."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    corners = [rgb.getpixel(p) for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
    return tuple(sum(c[i] for c in corners) // 4 for i in range(3))  # type: ignore[return-value]


def key_out(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    bg = detect_background(rgba)
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2) ** 0.5
            if d < HARD_DIST:
                px[x, y] = (r, g, b, 0)
            elif d < SOFT_DIST:
                keep = (d - HARD_DIST) / (SOFT_DIST - HARD_DIST)
                px[x, y] = (r, g, b, int(a * keep))
    return rgba


def process(path: pathlib.Path, name: str) -> None:
    img = Image.open(path)
    cut = key_out(img)

    bbox = cut.getbbox()
    if bbox is None:
        sys.exit(f"{path}: keying removed everything — is the background flat?")
    cut = cut.crop(bbox)

    scale = TARGET_HEIGHT / cut.height
    cut = cut.resize((max(1, round(cut.width * scale)), TARGET_HEIGHT), Image.LANCZOS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.webp"
    cut.save(out, "WEBP", quality=WEBP_QUALITY)
    kb = out.stat().st_size / 1024
    print(f"{path.name} -> {out} ({cut.width}x{cut.height}, {kb:.0f} KB)")
    if kb > 220:
        print(f"  warning: {out.name} is heavy; consider a simpler generation")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?", help="one image from art-drop/")
    ap.add_argument("--as", dest="name", help="archetype name to save under")
    ap.add_argument("--all", action="store_true", help="process every art-drop file named after a cast member")
    args = ap.parse_args()

    if args.all:
        found = False
        for p in sorted(pathlib.Path("art-drop").iterdir()):
            stem = p.stem.lower()
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"} and stem in CAST:
                process(p, stem)
                found = True
        if not found:
            sys.exit("no art-drop files named after the cast "
                     f"({', '.join(CAST)}) — rename them or pass one file with --as")
        return

    if not args.file:
        ap.error("pass a file, or --all")
    path = pathlib.Path(args.file)
    name = (args.name or path.stem).lower()
    if name not in CAST:
        sys.exit(f"unknown archetype {name!r}; expected one of {', '.join(CAST)}")
    process(path, name)


if __name__ == "__main__":
    main()
