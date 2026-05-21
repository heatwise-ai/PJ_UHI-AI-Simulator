"""
routers/insight.py
정책 효과 인사이트 텍스트 생성 API.
Gemini API 기반, rule-based 폴백 포함.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import insight_service

router = APIRouter()


class InsightRequest(BaseModel):
    delta_T: float = Field(..., description="시뮬레이션 결과 ΔT (°C)")
    features: dict[str, float] = Field(
        ...,
        description="조정된 정책 변수 {label: 조정 후 값}",
    )
    adm_nm: str = Field(default="", description="행정동 이름 (텍스트 생성용)")
    month: int = Field(default=0, ge=0, le=12, description="월 (계절 반영용)")
    background: dict | None = Field(
        default=None,
        description="배경 조건 (avg_temp, season, year). Gemini 프롬프트 강화용.",
    )

    model_config = {"json_schema_extra": {"examples": [{
        "delta_T": -0.9,
        "features": {"Albedo": 0.10, "녹지율": 0.015},
        "adm_nm": "서초3동",
        "month": 8,
        "background": {"avg_temp": 30.4, "season": "JJA", "year": 2024},
    }]}}


class InsightResponse(BaseModel):
    summary: str = Field(description="핵심 인사이트 요약 (1~2문장)")
    caution: str = Field(description="주의요망 사항")
    outlook: str = Field(description="중장기 전망")


@router.post("/insight", response_model=InsightResponse)
def generate_insight(req: InsightRequest):
    """
    정책 효과 기반 인사이트를 생성합니다.

    **3종 텍스트 반환:**
    - `summary` : 핵심 요약 (Gemini 또는 rule-based)
    - `caution` : 비현실적 조합 경고, 면적 특징, 모델 한계 안내
    - `outlook` : 단기·중장기 전략 방향

    GEMINI_API_KEY 환경변수가 있으면 Gemini 사용, 없으면 rule-based 폴백.
    """
    return insight_service.generate_insight(
        delta_T=req.delta_T,
        adjusted_features=req.features,
        adm_nm=req.adm_nm,
        month=req.month,
        background=req.background,
    )
