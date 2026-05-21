"""
routers/optimize.py
예산·패키지 기반 최적 정책 추천 API.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import optimization_service

router = APIRouter()


class OptimizeRequest(BaseModel):
    adm_cd: str = Field(..., description="행정동 코드")
    year: int = Field(default=2024)
    month: int = Field(..., ge=1, le=12, description="월")
    budget: float = Field(..., ge=0, description="총 예산 (원). 0=무제한")
    package: str = Field(
        default="전체",
        description="녹지 | 건축포장 | 에너지 | 폭염저감 | 전체",
    )
    dong_area_m2: float | None = Field(
        default=None,
        description="행정동 면적(m²). 비용 계산에 사용. None이면 기본값.",
    )
    costs: dict[str, int] | None = Field(
        default=None,
        description="커스텀 단가 {쿨루프_m2, 녹화_m2, 그늘막_개, 가로수_주, 에너지_인센티브, 차량_인센티브}",
    )

    model_config = {"json_schema_extra": {"examples": [{
        "adm_cd": "11010530",
        "month": 8,
        "budget": 50000000,
        "package": "녹지",
    }]}}


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    """
    예산·패키지 내 최적 정책 조합 추천.

    **알고리즘:**
    - 소형 패키지(≤500만 조합): Grid Search (03_optimizer 원본)
    - 대형 패키지: Greedy 폴백

    **패키지:** 녹지 | 건축포장 | 에너지 | 폭염저감 | 전체

    **비용 공식 (03_optimizer 원본):**
    - 가로수: 단가×10주  |  녹지율: 단가×0.001×동면적
    - Albedo: 단가×(동면적×0.02/0.45)  |  그늘막: 단가×1개
    """
    return optimization_service.optimize(
        adm_cd=req.adm_cd, year=req.year, month=req.month,
        budget=req.budget, package=req.package,
        dong_area_m2=req.dong_area_m2, costs=req.costs,
    )
