#!/usr/bin/env python3
"""
Разрезает лист со спрайтами на отдельные PNG с прозрачным фоном.

Лист — это сетка нарисованных объектов на белом (или уже прозрачном) фоне.
Скрипт находит связные области непустых пикселей, обрезает каждую по границам
и сохраняет отдельным файлом.

Использование:
    python3 tools/split-sheet.py sheet.png out/ [--prefix icons] [--min-size 24]

Потом посмотрите out/_contact-sheet.png — там все найденные спрайты
пронумерованы, чтобы их было удобно называть.
"""
import argparse
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# Насколько пиксель должен отличаться от белого, чтобы считаться содержимым.
WHITE_TOLERANCE = 18
# Сколько пикселей «раздуть» маску перед поиском областей: детали вроде бликов
# или точек над буквами не должны отрываться в отдельные спрайты.
DILATE = 6
# Поля вокруг вырезанного спрайта.
PADDING = 4


def build_mask(img: Image.Image) -> np.ndarray:
    """Маска содержимого: True там, где не фон."""
    rgba = np.asarray(img.convert("RGBA"))
    alpha = rgba[..., 3]
    if (alpha < 250).mean() > 0.02:
        # В картинке уже есть прозрачность — доверяем альфа-каналу.
        return alpha > 24
    rgb = rgba[..., :3].astype(np.int16)
    # Иначе фон белый: считаем содержимым всё, что заметно темнее.
    return (255 - rgb).max(axis=2) > WHITE_TOLERANCE


def dilate_both(mask: np.ndarray, radius: int) -> np.ndarray:
    out = mask
    for _ in range(2):  # по строкам, затем по столбцам
        res = out.copy()
        for step in range(1, radius + 1):
            res[step:] |= out[:-step]
            res[:-step] |= out[step:]
        out = res.T
    return out


def components(mask: np.ndarray, min_size: int):
    """Связные области (4-связность), BFS по строкам-столбцам."""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    boxes = []
    for y0 in range(h):
        row = mask[y0]
        for x0 in np.nonzero(row & ~seen[y0])[0]:
            q = deque([(y0, int(x0))])
            seen[y0, x0] = True
            minx = maxx = int(x0)
            miny = maxy = y0
            count = 0
            while q:
                y, x = q.popleft()
                count += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if (maxx - minx + 1) >= min_size and (maxy - miny + 1) >= min_size and count >= min_size * min_size // 4:
                boxes.append((minx, miny, maxx, maxy))
    return boxes


def sort_reading_order(boxes, row_tolerance=40):
    """Слева направо, сверху вниз — как читается лист."""
    boxes = sorted(boxes, key=lambda b: b[1])
    rows, current, base = [], [], None
    for b in boxes:
        if base is None or abs(b[1] - base) <= row_tolerance:
            base = b[1] if base is None else base
            current.append(b)
        else:
            rows.append(sorted(current, key=lambda x: x[0]))
            current, base = [b], b[1]
    if current:
        rows.append(sorted(current, key=lambda x: x[0]))
    return [b for row in rows for b in row]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("outdir")
    ap.add_argument("--prefix", default="asset")
    ap.add_argument("--min-size", type=int, default=24, help="минимальная сторона спрайта в пикселях")
    ap.add_argument("--dilate", type=int, default=DILATE)
    args = ap.parse_args()

    src = Image.open(args.sheet).convert("RGBA")
    mask = build_mask(src)
    grown = dilate_both(mask, args.dilate)
    boxes = sort_reading_order(components(grown, args.min_size))
    if not boxes:
        sys.exit("Не найдено ни одного спрайта — проверьте фон листа.")

    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)

    rgba = np.asarray(src).copy()
    # Фон делаем прозрачным по исходной (нераздутой) маске.
    rgba[..., 3] = np.where(mask, 255, 0)
    transparent = Image.fromarray(rgba, "RGBA")

    saved = []
    for i, (x0, y0, x1, y1) in enumerate(boxes, 1):
        box = (max(0, x0 - PADDING), max(0, y0 - PADDING),
               min(src.width, x1 + 1 + PADDING), min(src.height, y1 + 1 + PADDING))
        sprite = transparent.crop(box)
        name = f"{args.prefix}-{i:03d}.png"
        sprite.save(out / name)
        saved.append((name, sprite.size))

    # Контактный лист с номерами, чтобы спрайты было удобно называть.
    cols = 8
    cell = 140
    rows = (len(saved) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (24, 32, 26, 255))
    for i, (name, _) in enumerate(saved):
        s = Image.open(out / name)
        s.thumbnail((cell - 22, cell - 22))
        cx = (i % cols) * cell + (cell - s.width) // 2
        cy = (i // cols) * cell + (cell - s.height) // 2 - 6
        sheet.alpha_composite(s, (cx, cy))
    sheet.save(out / "_contact-sheet.png")

    print(f"Найдено спрайтов: {len(saved)}")
    for name, size in saved:
        print(f"  {name}  {size[0]}x{size[1]}")
    print(f"\nОбзор: {out / '_contact-sheet.png'}")


if __name__ == "__main__":
    main()
