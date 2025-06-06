from io import BytesIO
import fitz  # PyMuPDF
import re
from sqlalchemy.orm import Session
from app.models import Drug
from rapidfuzz import process, fuzz

# 정규표현식 패턴
pattern_code = re.compile(r"^880\d{10}$")
pattern_qty = re.compile(r"^\d+$")
pattern_spec = re.compile(r"\d+(mg|밀리그램)?")
pattern_manu = re.compile(r".*(\(주\)|\(유\)).*")

def normalize(name: str) -> str:
    if not name:
        return ""
    return name.lower().replace("정", "").replace("mg", "").replace("밀리그램", "").replace(" ", "")

def split_line_if_mixed(line: str):
    match = pattern_code.search(line)
    if match:
        code = match.group()
        name_part = line[:match.start()].strip()
        rest = line[match.end():].strip()
        return [name_part, code] + ([rest] if rest else [])
    return [line]

def parse_pdf_text_to_rows(file_bytes: bytes, db: Session) -> dict:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        print(f"{idx}: {line}")

    rows = []
    errors = []

    if len(lines) < 5:
        return {"rows": [], "errors": ["⚠️ PDF 데이터가 너무 적습니다."]}

    # 유연한 헤더 감지
    expected_aliases = {
        "상품명": ["상품명", "약품명", "제품명"],
        "표준코드": ["표준코드", "코드"],
        "판매처": ["판매처", "제조사", "제조업체"],
        "규격": ["규격"],
        "총수량": ["총수량", "수량", "주문수량"]
    }

    header_found = {key: False for key in expected_aliases}
    for line in lines[:5]:
        for field, aliases in expected_aliases.items():
            if any(alias in line for alias in aliases):
                header_found[field] = True

    if not all(header_found.values()):
        errors.append(f"⚠️ 헤더 형식이 맞지 않습니다: {lines[:5]}")
        return {"rows": [], "errors": errors}

    data_lines = lines[5:]
    drugs = db.query(Drug).all()
    choices = [(normalize(d.drug_name), d) for d in drugs]
    names_only = [c[0] for c in choices]

    current = {}
    for raw_line in data_lines:
        for line in split_line_if_mixed(raw_line):
            if "입력 약품명" not in current:
                current["입력 약품명"] = line
            elif pattern_code.match(line):
                current["표준코드"] = line
            elif pattern_manu.match(line):
                current["제조사"] = line
            elif pattern_spec.search(line):
                current["규격"] = line
            elif pattern_qty.match(line):
                current["입력 수량"] = line

            if len(current) >= 3:  # 완전하지 않아도 3개 이상이면 시도
                try:
                    name_norm = normalize(current.get("입력 약품명", ""))
                    best, score, idx = process.extractOne(name_norm, names_only, scorer=fuzz.ratio)
                    matched = choices[idx][1] if score >= 70 else None

                    rows.append({
                        "입력 약품명": current.get("입력 약품명"),
                        "입력 수량": current.get("입력 수량"),
                        "매핑 약품명": matched.drug_name if matched else None,
                        "표준코드": matched.standard_code if matched else current.get("표준코드"),
                        "품목일련번호": matched.product_code if matched else None,
                        "제조사": matched.manufacturer if matched else current.get("제조사"),
                        "약품 이미지": matched.image_url if matched else None,
                        "유사도 점수": int(score),
                        "매핑 여부": "O" if score >= 80 else "X"
                    })
                    print(f"매핑 성공: {current.get('입력 약품명')} → {matched.drug_name if matched else 'X'} (score: {score})")
                except Exception as e:
                    errors.append(f"⚠️ row 매핑 실패: {current} → {e}")
                finally:
                    current = {}

    return {"rows": rows, "errors": errors}
