"""
data_loader.py
서버 시작 시 모든 CSV를 메모리에 1회 로드.
서비스 레이어는 이 모듈의 전역 DataFrame을 참조합니다.

실제 파일:
  feat_weather.csv                  → 메인 패널 (LST + 모든 피처 통합)
  feat_satellite_2020_2024.csv      → GEE 위성 피처 (LST, NDVI, NDBI, Albedo)
  feat_anthropogenic_2020_2024.csv  → 도시·인프라·사회 피처
  dim_adm_dong.csv                  → 행정동 차원 테이블
  stat_shap.csv                     → SHAP 값
  stat_cost_unit.csv                → 비용·조정 단위
"""

import pandas as pd
from pathlib import Path

panel: pd.DataFrame | None = None
feat_satellite: pd.DataFrame | None = None
feat_anthropogenic: pd.DataFrame | None = None
dim_dong: pd.DataFrame | None = None
stat_shap: pd.DataFrame | None = None
stat_cost: pd.DataFrame | None = None

DATA_DIR = Path(__file__).parent / "data"


def load_all() -> None:
    global panel, feat_satellite, feat_anthropogenic, dim_dong, stat_shap, stat_cost

    panel              = _load("feat_weather.csv")
    feat_satellite     = _load("feat_satellite_2020_2024.csv")
    feat_anthropogenic = _load("feat_anthropogenic_2020_2024.csv")
    dim_dong           = _load("dim_adm_dong.csv")
    stat_shap          = _load("stat_shap.csv")
    stat_cost          = _load("stat_cost_unit.csv")

    if panel is not None:
        panel.rename(columns={"ADM_CD": "adm_cd", "ADM_NM": "adm_nm"}, inplace=True)
        panel["adm_cd"] = panel["adm_cd"].astype(str)
    if feat_satellite is not None:
        feat_satellite.rename(columns={"ADM_CD": "adm_cd"}, inplace=True)
        feat_satellite["adm_cd"] = feat_satellite["adm_cd"].astype(str).str.zfill(10).str[2:]
    if feat_anthropogenic is not None:
        feat_anthropogenic["adm_cd"] = feat_anthropogenic["adm_cd"].astype(str)
    if dim_dong is not None:
        dim_dong["adm_cd"] = dim_dong["adm_cd"].astype(str)
    if stat_shap is not None:
        stat_shap["adm_cd"] = stat_shap["adm_cd"].astype(str)

    print("[data_loader] 모든 CSV 로드 완료")


def _load(filename: str) -> pd.DataFrame | None:
    path = DATA_DIR / filename
    if not path.exists():
        print(f"[data_loader] WARNING: {filename} 없음")
        return None
    df = pd.read_csv(path, encoding="utf-8-sig")
    df.columns = df.columns.str.strip()
    print(f"[data_loader] {filename}: {len(df):,}행")
    return df
