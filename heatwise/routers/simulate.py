"""
routers/simulate.py
Step2~3 정책 시뮬레이션 API.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import simulation_service

router = APIRouter()


class SimulateRequest(BaseModel):
    adm_cd: str = Field(..., description="행정동 코드", examples=["11010530"])
    year: int = Field(..., description="연도", examples=[2024])
    month: int = Field(..., ge=1, le=12, description="월", examples=[8])
    features: dict[str, float] = Field(
        ...,
        description="조정된 정책 변수 {feature_name: 새 값}",
        examples=[{"Albedo": 0.10, "녹지율": 0.015}],
    )
    albedo_area_ratio: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Albedo 적용 면적 비율 (0~1, 기본 1.0=전체)",
    )

    model_config = {"json_schema_extra": {"examples": [{
        "adm_cd": "11010530",
        "year": 2024,
        "month": 8,
        "features": {"Albedo": 0.10, "녹지율": 0.015},
        "albedo_area_ratio": 0.25,
    }]}}


class SimulateResponse(BaseModel):
    before_lst: float
    after_lst: float
    delta_T: float
    adjusted_features: dict[str, float]
    model_type: str = "unknown"  # "lightgbm" | "fallback_ridge"

    model_config = {"protected_namespaces": ()}


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    """
    정책 변수 조정 시 LST 변화(ΔT)를 계산합니다.

    **계산 방식:** `ΔT = f(X') - f(X_base)`
    - X_base : 현재 행정동·연월의 원본 피처 벡터
    - X'     : 사용자 조정값이 반영된 피처 벡터
    - Albedo는 `albedo_area_ratio`로 면적 보정 적용
    """
    return simulation_service.simulate(
        adm_cd=req.adm_cd,
        year=req.year,
        month=req.month,
        adjustments=req.features,
        albedo_area_ratio=req.albedo_area_ratio,
    )
