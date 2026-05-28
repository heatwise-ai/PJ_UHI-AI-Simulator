"""
services/optimization_service.py
03_optimizer 노트북의 grid_search + calc_cost 로직 반영.

소형 패키지(조합 수 ≤ 500만)  → Grid Search (전수 탐색)
대형 패키지(조합 수 > 500만)  → Greedy (효율 순 할당)
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from itertools import product

import data_loader
from models import model_loader
from services import simulation_service
from utils.helpers import (
    require_df, filter_panel, safe_float, round2,
    VAR_META, VAR_META_MAP, STEP_MAP, RATIO_STEP,
    ALL_PACKAGES, ALBEDO_COVERAGE, ASSUMED_ALBEDO_GAIN,
    DEFAULT_COSTS, MODEL_FEATURES, get_real_step,
)

MAX_GRID_COMBOS = 5_000_000
DEFAULT_DONG_AREA = 1_000_000


def optimize(
    adm_cd: str, year: int, month: int,
    budget: float, package: str = "전체",
    dong_area_m2: float | None = None,
    costs: dict | None = None,
) -> dict:
    panel = require_df(data_loader.panel, "feat_weather")
    row = filter_panel(panel, adm_cd, year, month)
    area = dong_area_m2 or DEFAULT_DONG_AREA

    c = DEFAULT_COSTS.copy()
    if costs:
        c.update(costs)

    unit_cost = _build_unit_cost(c, area)
    pkg_labels = ALL_PACKAGES.get(package, ALL_PACKAGES["전체"])
    policy_info = _build_policy_info(row, pkg_labels)
    if not policy_info:
        return _empty_result(adm_cd, year, month, package, budget)

    n_total = int(np.prod([len(p["candidates"]) for p in policy_info.values()]))

    if model_loader.is_available() and n_total <= MAX_GRID_COMBOS:
        result = _grid_search(row, policy_info, unit_cost, budget)
    else:
        result = _greedy_search(adm_cd, year, month, row, policy_info, unit_cost, budget)

    return _format_result(adm_cd, year, month, package, budget, result, policy_info, unit_cost, row)


def _build_unit_cost(c: dict, dong_area: float) -> dict:
    return {
        "총_가로수":     c["가로수_주"] * 10,
        "누적_조성면적": c["녹화_m2"] * 500,
        "녹지율":        c["녹화_m2"] * 0.001 * dong_area,
        "Albedo":        c["쿨루프_m2"] * (dong_area * 0.02 / ASSUMED_ALBEDO_GAIN),
        "에너지_전기":   c["에너지_인센티브"],
        "에너지_가스":   c["에너지_인센티브"],
        "그늘막":        c["그늘막_개"],
        "차량밀도":      c["차량_인센티브"],
        "NDBI":          0,
        "NDVI":          0,
        "용적률":        0,
        "인구밀도":      0,
    }


def _calc_cost(label: str, delta: float, unit_cost: dict, base_row=None) -> float:
    uc = unit_cost.get(label, 0)
    if uc == 0:
        return 0.0
    if label in RATIO_STEP and base_row is not None:
        col = VAR_META_MAP[label]
        cur = float(base_row.get(col, 0))
        step_size = abs(cur * RATIO_STEP[label])
        if step_size > 0:
            return abs(abs(delta) / step_size * uc)
    step = STEP_MAP.get(label, 1) or 1
    return abs(delta / step) * abs(uc)


def _build_policy_info(row, labels: list[str]) -> dict:
    info = {}
    for label, col, direction, safe_lo, safe_hi, step in VAR_META:
        if label not in labels:
            continue
        if col not in row.index:
            continue

        cur = float(row[col])
        real_step = get_real_step(label, cur)

        if direction == "up":
            d_max = max(safe_hi - cur, 0)
            candidates = np.arange(0, d_max + real_step * 1e-6, real_step)
            candidates = candidates[candidates <= d_max + 1e-9]
        else:
            d_min = min(-(cur - safe_lo), 0)
            candidates = -np.arange(0, abs(d_min) + real_step * 1e-6, real_step)
            candidates = candidates[candidates >= d_min - 1e-9]

        if len(candidates) < 2:
            continue

        if len(candidates) > 20:
            idx = np.linspace(0, len(candidates) - 1, 20, dtype=int)
            candidates = candidates[idx]

        info[label] = {
            "col": col, "direction": direction,
            "cur": cur, "step": real_step,
            "lower": float(candidates.min()),
            "upper": float(candidates.max()),
            "candidates": candidates,
        }
    return info


def _grid_search(row, policy_info, unit_cost, budget):
    labels = list(policy_info.keys())
    cols   = [policy_info[l]["col"] for l in labels]
    cands  = [policy_info[l]["candidates"] for l in labels]
    feat_cols = model_loader.get_feature_cols() or MODEL_FEATURES

    base_arr = np.array([safe_float(row.get(f, 0)) for f in feat_cols])
    lst_base = float(model_loader.predict(base_arr.reshape(1, -1)))

    albedo_idx = labels.index("Albedo") if "Albedo" in labels else None
    has_interaction = "Albedo_x_avg_temp" in feat_cols
    avg_temp = safe_float(row.get("avg_temp (℃)", 0))

    best_lst = lst_base
    best_combo = np.zeros(len(labels))
    best_cost = 0.0

    for combo in product(*cands):
        total_cost = sum(_calc_cost(l, d, unit_cost, row)
                         for l, d in zip(labels, combo))
        if budget > 0 and total_cost > budget:
            continue

        arr = base_arr.copy()
        for i, (col, label, delta) in enumerate(zip(cols, labels, combo)):
            fi = feat_cols.index(col) if col in feat_cols else -1
            if fi < 0:
                continue
            if label == "Albedo":
                arr[fi] = base_arr[fi] + delta * ALBEDO_COVERAGE
            else:
                arr[fi] = base_arr[fi] + delta

        if has_interaction and albedo_idx is not None:
            ai_idx = feat_cols.index("Albedo_x_avg_temp")
            alb_idx = feat_cols.index("Albedo")
            arr[ai_idx] = arr[alb_idx] * avg_temp

        pred = float(model_loader.predict(arr.reshape(1, -1)))
        if pred < best_lst:
            best_lst = pred
            best_combo = np.array(combo)
            best_cost = total_cost

    return {
        "labels": labels, "best_lst": best_lst, "lst_base": lst_base,
        "delta_lst": best_lst - lst_base,
        "best_x": best_combo, "best_cost": best_cost,
    }


def _greedy_search(adm_cd, year, month, row, policy_info, unit_cost, budget):
    labels = list(policy_info.keys())

    effects = []
    for label in labels:
        info = policy_info[label]
        col = info["col"]
        step = info["step"]
        direction = info["direction"]

        new_val = info["cur"] + step if direction == "up" else info["cur"] - step
        sim = simulation_service.simulate(
            adm_cd, year, month, adjustments={label: new_val}
        )
        dt = sim["delta_T"]
        cost = _calc_cost(label, step if direction == "up" else -step, unit_cost, row)

        effects.append({
            "label": label, "col": col, "dt_per_step": dt,
            "cost_per_step": cost, "step": step, "direction": direction,
            "info": info,
        })

    def _efficiency(e):
        c  = e["cost_per_step"]
        dt = e["dt_per_step"]
        if c > 0:
            return dt / c
        return float("-inf") if dt < 0 else float("inf")

    effects.sort(key=_efficiency)

    remaining = budget if budget > 0 else float("inf")
    best_x = {l: 0.0 for l in labels}
    total_cost = 0.0

    for e in effects:
        if e["dt_per_step"] >= 0:
            continue
        label = e["label"]
        info = e["info"]
        cands = info["candidates"]

        for delta in (cands[::-1] if info["direction"] == "up" else cands):
            c = _calc_cost(label, delta, unit_cost, row)
            if c <= remaining:
                best_x[label] = float(delta)
                remaining -= c
                total_cost += c
                break

    combo_adj = {}
    for label, delta in best_x.items():
        if abs(delta) > 1e-9:
            col = VAR_META_MAP[label]
            combo_adj[label] = policy_info[label]["cur"] + delta

    if combo_adj:
        sim = simulation_service.simulate(adm_cd, year, month, adjustments=combo_adj)
        delta_lst = sim["delta_T"]
        after_lst = sim["after_lst"]
        before_lst = sim["before_lst"]
    else:
        before_lst = safe_float(row.get("LST", 0))
        after_lst = before_lst
        delta_lst = 0.0

    return {
        "labels": labels, "best_lst": after_lst, "lst_base": before_lst,
        "delta_lst": delta_lst,
        "best_x": np.array([best_x[l] for l in labels]),
        "best_cost": total_cost,
    }


def _format_result(adm_cd, year, month, package, budget, result, policy_info, unit_cost, row):
    pkg_labels = ALL_PACKAGES.get(package, ALL_PACKAGES["전체"])
    opt_deltas = dict(zip(result["labels"], result["best_x"]))

    recommended = []
    for label in pkg_labels:
        delta = opt_deltas.get(label, 0.0)
        info = policy_info.get(label, {})
        adjusted = abs(delta) >= 1e-9
        cost = _calc_cost(label, delta, unit_cost, row) if adjusted else 0

        if info:
            cur = info.get("cur", 0)
        else:
            col = VAR_META_MAP.get(label, label)
            cur = float(row[col]) if col in row.index else 0

        recommended.append({
            "feature_label": label,
            "feature_col":   VAR_META_MAP.get(label, label),
            "current_value": round2(cur),
            "delta":         round2(delta),
            "recommended_value": round2(cur + delta),
            "cost":          round(cost),
            "adjusted":      adjusted,
        })

    return {
        "adm_cd": adm_cd, "year": year, "month": month,
        "package": package,
        "input_budget":    round(budget),
        "used_budget":     round(result["best_cost"]),
        "savings":         round(budget - result["best_cost"]) if budget > 0 else 0,
        "before_lst":      round2(result["lst_base"]),
        "after_lst":       round2(result["best_lst"]),
        "expected_delta_T": round2(result["delta_lst"]),
        "recommended":     recommended,
    }


def _empty_result(adm_cd, year, month, package, budget):
    return {
        "adm_cd": adm_cd, "year": year, "month": month,
        "package": package,
        "input_budget": round(budget), "used_budget": 0,
        "savings": round(budget) if budget > 0 else 0,
        "before_lst": 0, "after_lst": 0,
        "expected_delta_T": 0, "recommended": [],
    }
