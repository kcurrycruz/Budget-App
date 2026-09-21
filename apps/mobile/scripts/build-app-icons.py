"""Build full-bleed Zenify app icons from the current 1024px master."""

from collections import deque
from pathlib import Path

from PIL import Image


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"
MASTER_PATH = PUBLIC_DIR / "icon-1024.png"
BACKGROUND = (22, 33, 51, 255)
OUTPUT_SIZES = (512, 192, 180)


def remove_connected_light_border(image: Image.Image) -> Image.Image:
    """Replace only light pixels connected to the image boundary."""

    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        red, green, blue, _ = pixels[x, y]
        if (red + green + blue) / 3 <= 70:
            continue

        pixels[x, y] = BACKGROUND
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    return rgba


def flatten_navy_background(image: Image.Image) -> Image.Image:
    """Keep the light shooting-star mark while making every navy pixel uniform."""

    flattened = Image.new("RGBA", image.size, BACKGROUND)
    source_pixels = image.load()
    output_pixels = flattened.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = source_pixels[x, y]
            inside_mark = 150 <= x <= 870 and 140 <= y <= 860
            if inside_mark and alpha and (red + green + blue) / 3 > 55:
                output_pixels[x, y] = (red, green, blue, alpha)

    return flattened


def main() -> None:
    master = flatten_navy_background(remove_connected_light_border(Image.open(MASTER_PATH)))
    master.save(MASTER_PATH, optimize=True)
    for size in OUTPUT_SIZES:
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(PUBLIC_DIR / f"icon-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
