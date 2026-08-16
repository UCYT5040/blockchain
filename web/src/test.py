import json
import math
from PIL import Image

# Added background color directly to palette so #101010 is mapped instead of dropped
COLOR_PALETTE = {
    "background": (0x10, 0x10, 0x10),  # #101010 canvas background
    "border": (0x23, 0x23, 0x23),  # #232323
    "border-corner": (0x00, 0x00, 0x00),  # #000000
    "basic-inner-top-left": (0x59, 0x59, 0x59),  # #595959
    "basic-inner-bottom-right": (0xFB, 0xFB, 0xFB),  # #fbfbfb
    "basic-main": (0xC3, 0xC3, 0xC3),  # #c3c3c3
    "basic-top-left": (0xFB, 0xFB, 0xFB),  # #fbfbfb
    "basic-bottom-right": (0x59, 0x59, 0x59),  # #595959
}


def color_distance(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))


def get_closest_css_class(r, g, b, a):
    # ONLY ignore true transparent pixels
    if a == 0:
        return None

    pixel_rgb = (r, g, b)
    closest_key = None
    min_dist = float("inf")

    for style_key, palette_rgb in COLOR_PALETTE.items():
        dist = color_distance(pixel_rgb, palette_rgb)
        if dist < min_dist:
            min_dist = dist
            closest_key = style_key

    return closest_key


def extract_quantized_corners(img_path: str, corner_size: int = 24):
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size

    corner_boxes = {
        "topLeft": (0, 0, corner_size, corner_size),
        "topRight": (width - corner_size, 0, width, corner_size),
        "bottomLeft": (0, height - corner_size, corner_size, height),
        "bottomRight": (
            width - corner_size,
            height - corner_size,
            width,
            height,
        ),
    }

    all_corners_data = {}

    for corner_name, box in corner_boxes.items():
        crop = img.crop(box)
        crop_w, crop_h = crop.size
        pixels = crop.load()

        # Step 1: Map raw pixels to nearest palette class (or None if a == 0)
        grid = []
        for y in range(crop_h):
            row = []
            for x in range(crop_w):
                r, g, b, a = pixels[x, y]
                css_class = get_closest_css_class(r, g, b, a)
                row.append(css_class)
            grid.append(row)

        # Step 2: Merge adjacent matching classes into rects
        visited = set()
        rectangles = []

        for y in range(crop_h):
            for x in range(crop_w):
                if (x, y) in visited:
                    continue

                style_key = grid[y][x]
                if style_key is None:  # Truly transparent pixel (a == 0)
                    continue

                # Measure width
                w = 0
                while (
                    (x + w < crop_w)
                    and (grid[y][x + w] == style_key)
                    and ((x + w, y) not in visited)
                ):
                    w += 1

                # Measure height
                h = 1
                while y + h < crop_h:
                    if all(
                        (grid[y + h][x + dx] == style_key)
                        and ((x + dx, y + h) not in visited)
                        for dx in range(w)
                    ):
                        h += 1
                    else:
                        break

                # Mark visited
                for ry in range(y, y + h):
                    for rx in range(x, x + w):
                        visited.add((rx, ry))

                rectangles.append(
                    {
                        "x": x,
                        "y": y,
                        "width": w,
                        "height": h,
                        "style": style_key,
                    }
                )

        all_corners_data[corner_name] = rectangles

    return all_corners_data


if __name__ == "__main__":
    data = extract_quantized_corners("image_corners.png", corner_size=24)
    print(json.dumps(data, indent=2))