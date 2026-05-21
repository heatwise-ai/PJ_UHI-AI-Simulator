"""
utils/helpers.py
노트북 02_scenario / 03_optimizer에서 추출한 상수·메타데이터.
"""

from fastapi import HTTPException
import pandas as pd
import numpy as np

# ─────────────────────────────────────────────────────────────
# var_meta — 12개 정책 변수 (02_scenario 원본)
# (label, col, direction, safe_low, safe_high, step_or_None)
# ─────────────────────────────────────────────────────────────
VAR_META = [
    ("Albedo",       "Albedo",                  "up",   0.0071,    0.9662,     0.02),
    ("NDBI",         "NDBI",                    "down", -0.6719,   0.0795,     0.01),
    ("NDVI",         "NDVI",                    "up",   0.0446,    0.7681,     0.01),
    ("그늘막",       "그늘막 개수",              "up",   0.0,       43.0,       1.0),
    ("녹지율",       "녹지율",                   "up",   0.0058,    0.0508,     0.001),
    ("누적_조성면적", "누적_조성면적합계(m^2)",   "up",   0.0,       18678.0,    500.0),
    ("총_가로수",     "총_가로수_개수",           "up",   0.0,       6911.0,     10.0),
    ("에너지_전기",   "에너지사용량_전기",        "down", 93.051,    106166.963, None),
    ("에너지_가스",   "에너지사용량_가스",        "down", 0.0011,    20280.367,  None),
    ("차량밀도",      "차량밀도",                "down", 260.5505,  422916.667, None),
    ("용적률",        "용적률_행정동별",          "down", 2.2908,    3502.2271,  None),
    ("인구밀도",      "인구밀도",                "down", 1659.3432, 105650.582, None),
]

VAR_META_MAP = {label: col for label, col, *_ in VAR_META}
STEP_MAP     = {label: step for label, col, d, lo, hi, step in VAR_META}

RATIO_STEP = {
    "에너지_전기": 0.10, "에너지_가스": 0.10,
    "차량밀도": 0.10, "용적률": 0.10, "인구밀도": 0.10,
}

ALBEDO_COVERAGE     = 0.25
ASSUMED_ALBEDO_GAIN = 0.45

DEFAULT_COSTS = {
    "쿨루프_m2": 25_000, "녹화_m2": 123_000, "그늘막_개": 8_500_000,
    "가로수_주": 1_000_000, "에너지_인센티브": 30_000, "차량_인센티브": 30_000,
}

# 모델 피처 순서 (01_model 원본)
MODEL_FEATURES = [
    "NDVI", "NDBI", "Albedo",
    "year_norm", "month_sin", "month_cos",
    "season_DJF", "season_JJA", "season_MAM", "season_SON",
    "avg_temp (℃)", "avg_humi (%)", "avg_ultra_rays (UV)",
    "avg_inte_illu (lux)", "avg_noise (dB )",
    "에너지사용량_전기", "용적률_행정동별", "에너지사용량_가스",
    "누적_조성면적합계(m^2)", "water_smog_유무", "그늘막 개수",
    "총_가로수_개수", "녹지율", "차량밀도", "인구밀도",
    "avg_elevation", "Albedo_x_avg_temp",
]

# 03_optimizer 패키지 구조
ALL_PACKAGES = {
    "녹지":     ["총_가로수", "누적_조성면적", "녹지율"],
    "건축포장": ["Albedo"],
    "에너지":   ["에너지_전기", "에너지_가스", "차량밀도"],
    "폭염저감": ["그늘막"],
    "전체":     [label for label, *_ in VAR_META],
}


# ─────────────────────────────────────────────────────────────
# 유틸 함수
# ─────────────────────────────────────────────────────────────

def require_df(df, name: str):
    if df is None:
        raise HTTPException(503, f"데이터 미로드: {name}")
    return df

def filter_panel(df, adm_cd: str, year: int, month: int):
    mask = (df["adm_cd"] == str(adm_cd)) & (df["year"] == year) & (df["month"] == month)
    rows = df[mask]
    if rows.empty:
        raise HTTPException(404, f"데이터 없음: adm_cd={adm_cd}, year={year}, month={month}")
    return rows.iloc[0]

def safe_float(v, default=0.0):
    try:
        f = float(v)
        return default if pd.isna(f) else round(f, 6)
    except (TypeError, ValueError):
        return default

def round2(v):
    return round(float(v), 4)

def get_real_step(label: str, current_value: float) -> float:
    step = STEP_MAP.get(label)
    if step is not None:
        return step
    ratio = RATIO_STEP.get(label, 0.10)
    return max(abs(current_value) * ratio, 1e-6)
