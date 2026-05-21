"""
services/simulation_service.py
ΔT = f(X') - f(X_base) 계산.
"""

from __future__ import annotations
import numpy as np
import pandas as pd

import data_loader
from models import model_loader
from utils.helpers import (
    require_df, filter_panel, safe_float, round2,
    MODEL_FEATURES, VAR_META, VAR_META_MAP,
    ALBEDO_COVERAGE,
)


def simulate(
    adm_cd: str,
    year: int,
    month: int,
    adjustments: dict[str, float],
    albedo_area_ratio: float | None = None,
) -> dict:
    panel = require_df(data_loader.panel, "feat_weather")
    row = filter_panel(panel, adm_cd, year, month)

    coverage = albedo_area_ratio if albedo_area_ratio is not None else ALBEDO_COVERAGE

    base_vec = _row_to_dict(row)
    adj_vec = base_vec.copy()
    _apply_adjustments(adj_vec, base_vec, adjustments, coverage)

    actual_lst = safe_float(row.get("LST", 0))

    if model_loader.is_available():
        before_lst = _predict(base_vec)
        after_lst  = _predict(adj_vec)
        delta_t    = after_lst - before_lst
    else:
        before_lst = actual_lst
        after_lst  = actual_lst
        delta_t    = 0.0

    changed = {}
    for label, col, *_ in VAR_META:
        if col in adj_vec and abs(adj_vec[col] - base_vec[col]) > 1e-9:
            changed[label] = round2(adj_vec[col])

    return {
        "before_lst": round2(before_lst),
        "after_lst":  round2(after_lst),
        "delta_T":    round2(delta_t),
        "adjusted_features": changed,
        "model_type": "fallback_ridge" if model_loader.is_fallback() else "lightgbm",
    }


def _apply_adjustments(adj: dict, base: dict, adjustments: dict, coverage: float):
    label_to_col = VAR_META_MAP

    for key, new_val in adjustments.items():
        col = label_to_col.get(key, key)
        if col not in adj:
            continue
        current = base[col]
        delta = float(new_val) - current
        if col == "Albedo":
            adj[col] = current + delta * coverage
        else:
            adj[col] = float(new_val)

    if "Albedo_x_avg_temp" in adj:
        adj["Albedo_x_avg_temp"] = adj["Albedo"] * adj.get("avg_temp (℃)", 0)


def _row_to_dict(row: pd.Series) -> dict:
    cols = model_loader.get_feature_cols() or MODEL_FEATURES
    return {f: safe_float(row.get(f, 0)) for f in cols}


def _predict(feature_dict: dict) -> float:
    cols = model_loader.get_feature_cols() or MODEL_FEATURES
    arr = np.array([[feature_dict.get(f, 0) for f in cols]])
    return model_loader.predict(arr)
