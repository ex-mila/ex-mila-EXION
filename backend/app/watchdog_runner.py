import time
import json
import os
import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import CountingLog
from app.websocket_manager import broadcast

# 공유 폴더 경로
WATCH_DIR = "C:\\Users\\EX_Mila\\Desktop\\counting_results"
processed_files = set()

# 이미지 경로
IMAGE_DIR = os.path.join(WATCH_DIR, "images")

class JSONHandler(FileSystemEventHandler):
    def __init__(self, loop):
        super().__init__()
        self.loop = loop


    def process_file(self, path):
        filename = os.path.basename(path)
        if filename in processed_files:
            return
        time.sleep(0.5)

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                print(f"📥 수신된 카운팅 파일: {filename}")

                db: Session = SessionLocal()
                existing = db.query(CountingLog).filter_by(
                    timestamp=data.get("timestamp"),
                    drug_standard_code=data.get("drug_standard_code").strip(),
                    drug_name=data.get("drug_name").strip(),
                    count_quantity=int(data.get("count_quantity"))
                ).first()

                if existing:
                    print("⚠️ 이미 DB에 저장된 데이터입니다.")
                    db.close()
                    processed_files.add(filename)
                    return

                # DB 저장
                log = CountingLog(
                    timestamp=data.get("timestamp"),
                    drug_name=data.get("drug_name").strip(),
                    drug_standard_code=data.get("drug_standard_code").strip(),
                    drug_refer_code=data.get("drug_refer_code"),
                    count_quantity=int(data.get("count_quantity"))
                )
                db.add(log)
                db.commit() 
                db.refresh(log) # 새로 저장된 log의 id 불러오기
                print("✅ DB에 저장 완료")
                
                message = {
                    "id": log.id,  # ✅ WebSocket 메시지에 id 추가
                    "timestamp": log.timestamp,
                    "drug_name": log.drug_name,
                    "drug_standard_code": log.drug_standard_code,
                    "count_quantity": log.count_quantity,
                }
                print("📦 내용:", message)
                processed_files.add(filename)

                self.loop.call_soon_threadsafe(
                    lambda: self.loop.create_task(broadcast(message))
                )

                db.close()

        except Exception as e:
            print("❌ 오류 발생:", e)

    # 이미지 파일 처리 함수
    def process_image(self, path):
        filename = os.path.basename(path)
        print(f"🟢 이미지 파일 감지됨: {filename}")
        
    def on_created(self, event):
        if not event.is_directory:
            if event.src_path.endswith(".json"):
                self.process_file(event.src_path)
            elif event.src_path.lower().endswith((".jpg", ".jpeg", ".png")):
                self.process_image(event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            if event.src_path.endswith(".json"):
                self.process_file(event.src_path)
            elif event.src_path.lower().endswith((".jpg", ".jpeg", ".png")):
                self.process_image(event.src_path)



def start_watchdog(loop):
    if not os.path.exists(WATCH_DIR):
        os.makedirs(WATCH_DIR)

    # 기존 폴더 내 파일들 처리
    handler = JSONHandler(loop)
    for file in os.listdir(WATCH_DIR):
        if file.endswith(".json"):
            full_path = os.path.join(WATCH_DIR, file)
            handler.process_file(full_path)

    observer = Observer()
    observer.schedule(handler, path=WATCH_DIR, recursive=True) # 하위 폴더 감지
    observer.start()
    print(f"👀 JSON 감시 시작: {WATCH_DIR}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
