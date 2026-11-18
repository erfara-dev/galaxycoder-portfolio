#!/usr/bin/env python3
"""Optional helper (not used by the site at runtime).
Creates a compressed WebP copy of an image in assets/images/projects/optimized/
WITHOUT touching the original.  Usage:
    python3 tools/optimize-images.py assets/images/projects/lapanganku-thumbnail.png
Requires Pillow (pip install pillow). Output: max 1600 px wide, WebP quality 80."""
import sys, os
from PIL import Image

for src in sys.argv[1:]:
    folder = os.path.join(os.path.dirname(src), "optimized")
    os.makedirs(folder, exist_ok=True)
    dst = os.path.join(folder, os.path.splitext(os.path.basename(src))[0] + ".webp")
    im = Image.open(src).convert("RGB")
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=80, method=6)
    print(f"{src} ({os.path.getsize(src)//1024} KB) -> {dst} ({os.path.getsize(dst)//1024} KB)")
