import os
import socket
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen

import uvicorn
import webview

from app.main import app

HOST = "127.0.0.1"
DEFAULT_PORT = 8000
WINDOW_TITLE = "MFStat"
WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 820
WINDOW_MIN_WIDTH = 1024
WINDOW_MIN_HEIGHT = 680


def _wait_for_server(url: str, timeout_seconds: float) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=1):
                return True
        except URLError:
            time.sleep(0.1)
    return False


def _resolve_port() -> int:
    configured_port = os.getenv("MFSTAT_PORT")
    preferred_port = int(configured_port) if configured_port else DEFAULT_PORT

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, preferred_port))
            return preferred_port
        except OSError:
            sock.bind((HOST, 0))
            return int(sock.getsockname()[1])


def main() -> None:
    port = _resolve_port()
    config = uvicorn.Config(
        app,
        host=HOST,
        port=port,
        access_log=False,
        log_level="warning"
    )
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    if not _wait_for_server(f"http://{HOST}:{port}/health", timeout_seconds=20):
        server.should_exit = True
        server_thread.join(timeout=3)
        raise RuntimeError("Local API server failed to start.")

    webview.create_window(
        WINDOW_TITLE,
        f"http://{HOST}:{port}",
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        min_size=(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT)
    )

    try:
        webview.start()
    finally:
        server.should_exit = True
        server_thread.join(timeout=5)


if __name__ == "__main__":
    main()
