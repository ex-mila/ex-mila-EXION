from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import drug, inventory, upload
from app.routers import barcode
from app.websocket_manager import connect, disconnect
from app.watchdog_runner import start_watchdog
import asyncio
import threading
from app.routers import reports
import os

# 데이터베이스 초기화
Base.metadata.create_all(bind=engine)

# FastAPI 인스턴스 생성
app = FastAPI()

# 메인 이벤트 루프 획득
loop = asyncio.get_event_loop()

# CORS 설정 (프론트엔드와 연동 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    #allow_origins=["http://localhost:3000"],  # 프론트 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 백그라운드 스레드에서 watchdog 감시 시작
threading.Thread(target=lambda: start_watchdog(loop), daemon=True).start()

# 이미지 디렉토리 경로 (watchdog_runner.py와 동일하게 유지)
WATCH_DIR = "C:\\Users\\EX_Mila\\Desktop\\counting_results"
IMAGE_DIR = os.path.join(WATCH_DIR, "images")

# WebSocket 엔드포인트 정의
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # 연결 유지용
    except:
        disconnect(websocket)

# 라우터 등록
app.include_router(inventory.router)
app.include_router(drug.router)
app.include_router(upload.router)
app.include_router(reports.router)
app.include_router(barcode.router, prefix="/api/barcode")

# 정적 파일 라우트 추가
app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")

# 외부에서 데이터를 받아 클라이언트에게 실시간 브로드캐스트
@app.post("/send")
async def send_data(data: dict):
    from app.websocket_manager import broadcast
    await broadcast(data)
    return {"status": "sent"}
