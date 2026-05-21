"""
main.py
서울시 행정동별 열섬 현상 완화 지원 AI 시뮬레이터.

실행: uvicorn main:app --reload --port 8000
UI:   http://localhost:8000
문서: http://localhost:8000/docs
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

import data_loader
from models import model_loader
from routers import summary, simulate, optimize, insight


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_loader.load_all()
    model_loader.load_model()
    if not model_loader.is_available() and data_loader.panel is not None:
        model_loader.train_fallback(data_loader.panel)
    yield


app = FastAPI(
    title="서울시 UHI 시뮬레이터 API",
    description=(
        "서울시 행정동별 도시열섬(UHI) 완화 지원 시뮬레이터.\n\n"
        "- **GET /summary** : LST 현황 조회 + SHAP TOP3\n"
        "- **POST /simulate** : 정책 변수 조정 → ΔT 계산\n"
        "- **POST /optimize** : 예산·패키지 기반 최적 조합 추천\n"
        "- **POST /insight** : 정책 효과 인사이트 텍스트 생성"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API 라우터 ──
app.include_router(summary.router,  tags=["Step1: 현황 진단"])
app.include_router(simulate.router, tags=["Step2: 정책 시뮬레이션"])
app.include_router(optimize.router, tags=["Step2: 최적 추천"])
app.include_router(insight.router,  tags=["Step3: 인사이트"])

# ── 프론트엔드 서빙 (uhi-simulator-main 빌드 결과) ──
DIST = Path(__file__).parent / "static" / "dist"
STATIC = Path(__file__).parent / "static"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")
    if (DIST / "data").exists():
        app.mount("/data", StaticFiles(directory=str(DIST / "data")), name="data")

if STATIC.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC)), name="static_legacy")


@app.get("/", include_in_schema=False)
async def serve_ui():
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"service": "Seoul UHI Simulator API", "version": "1.0.0", "docs": "/docs"}


@app.get("/test", include_in_schema=False)
async def test_ui():
    return FileResponse(str(STATIC / "test.html"))
