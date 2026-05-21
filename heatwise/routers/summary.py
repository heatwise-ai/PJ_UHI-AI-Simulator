"""
routers/summary.py
Step1 현황 진단 API.
"""

from fastapi import APIRouter, Query
from services import data_service

router = APIRouter()


@router.get("/summary")
def get_summary(
    adm_cd: str = Query(..., description="행정동 코드 (예: 11010530)"),
    year: int = Query(..., description="연도 (2020~2024)"),
    month: int = Query(..., ge=1, le=12, description="월 (1~12)"),
):
    """
    행정동·연월별 LST 현황 요약을 반환합니다.

    **응답 필드:**
    - `current_lst` : 해당 행정동 LST (°C)
    - `seoul_avg`   : 서울 전체 평균 LST (°C)
    - `rank_in_gu`  : 자치구 내 LST 순위 (1=가장 높음)
    - `shap_top3`   : SHAP 기여도 상위 3개 변수
    - `background`  : 배경 조건 (기온, 계절)
    """
    return data_service.get_summary(adm_cd, year, month)


@router.get("/summary/slider-config")
def get_slider_config(
    adm_cd: str = Query(..., description="행정동 코드"),
    year: int = Query(..., description="연도"),
    month: int = Query(..., ge=1, le=12, description="월"),
):
    """
    Step2 슬라이더 설정값 반환.
    변수별 현재값, 조정 범위(q5~q95), step 단위, 비용 정보를 포함합니다.
    """
    return data_service.get_slider_config(adm_cd, year, month)


@router.get("/summary/dong-list")
def get_dong_list():
    """행정동 목록 (자동완성용)."""
    return data_service.get_dong_list()


@router.get("/summary/years-months")
def get_years_months():
    """조회 가능한 연도·월 목록."""
    return data_service.get_available_years_months()


@router.get("/summary/all-lst")
def get_all_lst(
    year: int = Query(..., description="연도"),
    month: int = Query(..., ge=1, le=12, description="월"),
):
    """지도 색상용: 전체 행정동 LST 일괄 반환."""
    return data_service.get_all_lst(year, month)
