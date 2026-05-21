"""
services/data_service.py
CSV 데이터 조회·필터링 서비스.
"""

from __future__ import annotations
import data_loader
from utils.helpers import (
    require_df, filter_panel, safe_float, round2,
    VAR_META, VAR_META_MAP, RATIO_STEP,
    ALBEDO_COVERAGE, get_real_step,
)

_POLICY_COLS = frozenset(col for _, col, *_ in VAR_META)


def get_summary(adm_cd: str, year: int, month: int) -> dict:
    panel = require_df(data_loader.panel, "feat_weather")
    row = filter_panel(panel, adm_cd, year, month)

    current_lst = safe_float(row["LST"])
    adm_nm = row.get("adm_nm", "")
    gu_nm  = row.get("자치구", "")

    month_df = panel[(panel["year"] == year) & (panel["month"] == month)]
    seoul_avg = round2(month_df["LST"].mean())

    rank, rank_total = None, None
    if gu_nm:
        gu_df = month_df[month_df["자치구"] == gu_nm].sort_values("LST", ascending=False).reset_index(drop=True)
        rank_s = gu_df[gu_df["adm_cd"] == str(adm_cd)].index
        rank = int(rank_s[0]) + 1 if len(rank_s) > 0 else None
        rank_total = len(gu_df)

    shap_top3 = get_shap_top3(adm_cd, year, month)

    background = {
        "avg_temp": safe_float(row.get("avg_temp (℃)", None)),
        "season": row.get("season", ""),
        "year": year,
    }

    past_years = sorted([y for y in panel["year"].unique() if y < year])[-3:]
    three_yr_avg = None
    if past_years:
        past_mask = (
            (panel["adm_cd"] == str(adm_cd)) &
            (panel["year"].isin(past_years)) &
            (panel["month"] == month)
        )
        past_df = panel[past_mask]
        if not past_df.empty:
            three_yr_avg = round2(past_df["LST"].mean())

    cause_summary = ""
    try:
        from services.insight_service import generate_cause_summary
        cause_summary = generate_cause_summary(shap_top3, adm_nm=str(adm_nm))
    except Exception:
        pass

    return {
        "adm_cd": str(adm_cd), "adm_nm": adm_nm, "gu_nm": gu_nm,
        "year": year, "month": month,
        "current_lst": round2(current_lst),
        "seoul_avg": seoul_avg,
        "three_yr_avg_lst": three_yr_avg,
        "rank_in_gu": rank, "rank_total": rank_total,
        "shap_top3": shap_top3,
        "background": background,
        "cause_summary": cause_summary,
    }


def get_shap_top3(adm_cd: str, year: int, month: int) -> list[dict]:
    shap_df = require_df(data_loader.stat_shap, "stat_shap")
    mask = (
        (shap_df["adm_cd"] == str(adm_cd)) &
        (shap_df["year"] == year) &
        (shap_df["month"] == month)
    )
    filtered = shap_df[mask].copy()
    # Fallback to most recent available year if no data
    if filtered.empty:
        available_years = sorted(shap_df["year"].unique(), reverse=True)
        for fallback_year in available_years:
            mask2 = (
                (shap_df["adm_cd"] == str(adm_cd)) &
                (shap_df["year"] == fallback_year) &
                (shap_df["month"] == month)
            )
            filtered = shap_df[mask2].copy()
            if not filtered.empty:
                break
    if filtered.empty:
        return []

    filtered = filtered[filtered["feature_name"].isin(_POLICY_COLS)]
    if filtered.empty:
        return []

    filtered["abs_shap"] = filtered["shap_value"].abs()
    top3 = filtered.nlargest(3, "abs_shap")
    return [
        {"feature": r["feature_name"], "shap_value": round2(r["shap_value"]),
         "direction": "상승" if r["shap_value"] > 0 else "하강"}
        for _, r in top3.iterrows()
    ]


def get_slider_config(adm_cd: str, year: int, month: int) -> list[dict]:
    panel = require_df(data_loader.panel, "feat_weather")
    cost_df = data_loader.stat_cost
    row = filter_panel(panel, adm_cd, year, month)

    cost_map = {}
    if cost_df is not None:
        for _, c in cost_df.iterrows():
            cost_map[c["feature_name"]] = c

    result = []
    for label, col, direction, safe_lo, safe_hi, step in VAR_META:
        cur = safe_float(row.get(col, 0))
        real_step = get_real_step(label, cur)
        ci = cost_map.get(col, {})

        result.append({
            "label": label,
            "col": col,
            "direction": direction,
            "current_value": round2(cur),
            "safe_low": safe_lo,
            "safe_high": safe_hi,
            "step": round(real_step, 6),
            "is_ratio_step": label in RATIO_STEP,
            "ratio": RATIO_STEP.get(label),
            "cost_per_step": safe_float(ci.get("step_representative_cost_krw", 0)),
            "adjustment_unit": ci.get("adjustment_unit", ""),
            "package_type": ci.get("package_type", ""),
        })

    return result


def get_all_lst(year: int, month: int) -> list[dict]:
    panel = require_df(data_loader.panel, "feat_weather")
    mask = (panel["year"] == year) & (panel["month"] == month)
    df = panel[mask][["adm_cd", "LST"]].copy()
    df["LST"] = df["LST"].apply(safe_float)
    return [{"adm_cd": str(r["adm_cd"]), "lst": r["LST"]} for _, r in df.iterrows()]


def get_dong_list() -> list[dict]:
    panel = require_df(data_loader.panel, "feat_weather")
    unique = (
        panel[["adm_cd", "adm_nm", "자치구"]]
        .drop_duplicates(subset=["adm_cd"])
        .rename(columns={"자치구": "gu_nm"})
        .sort_values(["gu_nm", "adm_nm"])
    )
    return unique.to_dict(orient="records")


def get_available_years_months() -> dict:
    panel = require_df(data_loader.panel, "feat_weather")
    return {
        "years": sorted(panel["year"].unique().tolist()),
        "months": sorted(panel["month"].unique().tolist()),
    }
