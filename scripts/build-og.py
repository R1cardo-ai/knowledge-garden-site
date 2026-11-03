"""Render the 1200x630 social card used by og:image / twitter:image."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og.png"
PAPER = "#f4f1e8"
INK = "#161616"
SOFT = "#343a3c"
MUTED = "#5e6869"
SIGNAL = "#fffa00"
W, H = 1200, 630


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def main() -> None:
    image = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(image)
    sans = "C:/Windows/Fonts/msyh.ttc"
    bold = "C:/Windows/Fonts/msyhbd.ttc"
    saira = str(ROOT / "public" / "ui-kit" / "fonts" / "Saira.ttf")
    draw.text((80, 62), "FIELD ARCHIVE / 个人档案", font=font(sans, 22), fill=MUTED)
    draw.text((1010, 64), "01 / HOME", font=font(saira, 20), fill=MUTED)
    draw.line((80, 108, 1120, 108), fill=INK, width=2)
    draw.text((76, 142), "知识花园", font=font(bold, 112), fill=INK)
    draw.text((84, 300), "KNOWLEDGE GARDEN", font=font(saira, 40), fill=INK)
    draw.text((84, 372), "把想到的，写成以后能重读的片段。", font=font(sans, 34), fill=SOFT)
    draw.rectangle((84, 462, 244, 478), fill=SIGNAL)
    draw.text((84, 512), "随笔 / 获奖成果 / 设计样张 / 更新日志", font=font(sans, 21), fill=MUTED)
    draw.text((820, 566), "knowledge-garden-site.pages.dev", font=font(saira, 17), fill=MUTED)
    # Corner registration marks echo the site's archive frame.
    for x, y, dx, dy in ((40, 40, 1, 1), (1160, 40, -1, 1), (40, 590, 1, -1), (1160, 590, -1, -1)):
        draw.line((x, y, x + 34 * dx, y), fill=INK, width=2)
        draw.line((x, y, x, y + 34 * dy), fill=INK, width=2)
    image.save(OUT, "PNG", optimize=True)
    print(f"{OUT} {OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
