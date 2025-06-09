from barcode.ean import EuropeanArticleNumber13
from barcode.writer import ImageWriter
from PIL import Image, ImageFont, ImageDraw
from io import BytesIO
import requests
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # app/
FONT_PATH = os.path.join(BASE_DIR, "assets", "font", "GULIM.TTC")

BASE_FONT_SIZE = 30
DPI = 118

def generate_barcode_image(code: str, item_seq: str, item_name: str, vendor_name: str, image_url: str = None):
    # Generate barcode
    ean = EuropeanArticleNumber13(str(code), writer=ImageWriter())
    barcode_buffer = BytesIO()
    ean.write(barcode_buffer, options={"module_width": 2, "module_height": 20})
    barcode_buffer.seek(0)
    barcode_img = Image.open(barcode_buffer).resize((int(5 * DPI), int(2 * DPI)))

    # Label canvas
    label_width, label_height = int(9 * DPI), int(5 * DPI)
    label_img = Image.new("RGB", (label_width, label_height), "white")
    draw = ImageDraw.Draw(label_img)

    # Paste barcode
    barcode_x = label_width - barcode_img.width - 20
    barcode_y = 50
    label_img.paste(barcode_img, (barcode_x, barcode_y))

    # Paste product image
    if image_url:
        try:
            response = requests.get(image_url)
            img = Image.open(BytesIO(response.content)).resize((int(3 * DPI), int(3 * DPI)))
            label_img.paste(img, (20, barcode_y))
        except:
            pass

    # Prepare font
    try:
        font = ImageFont.truetype(FONT_PATH, BASE_FONT_SIZE)
    except:
        font = ImageFont.load_default()

    def fit_text_to_width(text, max_width):
        font_size = BASE_FONT_SIZE
        fallback_font = ImageFont.load_default()  # 안전한 기본 폰트 정의

        while font_size > 10:
            try:
                font = ImageFont.truetype(FONT_PATH, font_size)
                bbox = draw.textbbox((0, 0), text, font=font)
                if bbox[2] - bbox[0] <= max_width:
                    return font
                font_size -= 2
            except:
                return fallback_font  # 폰트 로드 실패 시 안전하게 반환

        return fallback_font  # 마지막까지 실패한 경우에도 fallback


    # Write text below barcode
    lines = [item_seq, item_name, vendor_name]
    text_y = barcode_y + barcode_img.height + 10
    for line in lines:
        font = fit_text_to_width(line, barcode_img.width)
        bbox = draw.textbbox((0, 0), line, font=font)
        text_x = barcode_x + (barcode_img.width - (bbox[2] - bbox[0])) // 2
        draw.text((text_x, text_y), line, font=font, fill="black")
        text_y += 35

    return label_img
