from fastapi import WebSocket

clients: list[WebSocket] = []

async def connect(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

def disconnect(websocket: WebSocket):
    if websocket in clients:
        clients.remove(websocket)

async def broadcast(message: dict):
    for client in clients:
        await client.send_json(message)
