"""
services/insight_service.py
Gemini API 기반 정책 효과 인사이트 생성 (rule-based 폴백 포함).
"""

from __future__ import annotations
import os
import json
import logging

logger = logging.getLogger(__name__)

FEATURE_LABELS: dict[str, str] = {
    "Albedo":        "반사율(Albedo)",
    "NDBI":          "NDBI(건물밀집도)",
    "NDVI":          "NDVI(녹지)",
    "그늘막":        "그늘막",
    "녹지율":        "녹지율",
    "누적_조성면적": "녹지 조성면적",
    "총_가로수":     "가로수",
    "에너지_전기":   "전기 에너지 사용량",
    "에너지_가스":   "가스 에너지 사용량",
    "차량밀도":      "차량밀도",
    "용적률":        "용적률",
    "인구밀도":      "인구밀도",
}

POLICY_METHODS: dict[str, str] = {
    "Albedo":        "쿨루프(지붕 반사도료 도색) 보급사업",
    "NDBI":          "건축밀도 규제",
    "NDVI":          "녹지 확충",
    "그늘막":        "스마트 그늘막 설치",
    "녹지율":        "공공용지 녹지 조성 사업",
    "누적_조성면적": "옥상녹화 및 소규모 녹지 조성",
    "총_가로수":     "가로수 식재 사업",
    "에너지_전기":   "에코마일리지 참여 확대",
    "에너지_가스":   "에코마일리지 가스 절감 프로그램",
    "차량밀도":      "승용차 마일리지 및 교통수요 관리",
    "용적률":        "건축밀도 규제 및 도시계획 조정",
    "인구밀도":      "용적률·주택공급 연동 도시구조 개편",
}

_gemini_model = None


def _init_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        logger.info("[insight] Gemini 초기화 완료")
    except Exception as e:
        logger.warning(f"[insight] Gemini 초기화 실패: {e}")
    return _gemini_model


def generate_insight(
    delta_T: float,
    adjusted_features: dict[str, float],
    adm_nm: str = "",
    month: int = 0,
    background: dict | None = None,
) -> dict:
    """summary / caution / outlook 3종 텍스트 반환."""
    model = _init_gemini()
    if model:
        result = _gemini_insight(model, delta_T, adjusted_features, adm_nm, month, background)
        if result:
            return result
    return _rule_based_insight(delta_T, adjusted_features, adm_nm, month)


def generate_cause_summary(shap_top3: list, adm_nm: str = "") -> str:
    """SHAP TOP3 기반 한 줄 원인 요약문."""
    model = _init_gemini()
    if model:
        result = _gemini_cause(model, shap_top3, adm_nm)
        if result:
            return result
    return _rule_cause(shap_top3)


def _gemini_insight(model, delta_T, features, adm_nm, month, background):
    feat_lines = []
    for label, val in features.items():
        disp   = FEATURE_LABELS.get(label, label)
        method = POLICY_METHODS.get(label, "관련 정책")
        feat_lines.append(f"  - {disp}({method}): {val:+.4f}")

    bg_str = ""
    if background:
        bg_str = (
            f"\n배경 조건: 기온 {background.get('avg_temp', 'N/A')}°C, "
            f"계절 {background.get('season', '')}, {background.get('year', '')}년"
        )

    prompt = f"""서울시 열환경 시뮬레이터 정책 효과 분석 결과입니다.

행정동: {adm_nm or '(미지정)'}
조정 월: {month}월
예상 ΔT: {delta_T:+.2f}°C
조정 정책 변수:{bg_str}
{chr(10).join(feat_lines)}

서울시 담당 공무원을 위한 실무 인사이트를 한국어로 작성해주세요.
두괄식 서술, 구체적 수치·정책명 포함, 간결하게 작성합니다.

다음 JSON 형식으로만 응답해주세요 (JSON 외 텍스트 금지):
{{
  "summary": "핵심 요약 2문장. 정책명과 구체 수치 포함.",
  "caution": "주의요망 2-3문장. 모델 한계·면적 특징·극단값 경고 포함.",
  "outlook": "전망 2문장. 단기(즉시~1년)와 중장기(3년 이상) 구분."
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        logger.warning(f"[insight] Gemini 인사이트 실패: {e}")
        return None


def _gemini_cause(model, shap_top3: list, adm_nm: str) -> str:
    if not shap_top3:
        return ""
    lines = []
    for i, s in enumerate(shap_top3[:3], 1):
        feat = FEATURE_LABELS.get(s.get("feature", ""), s.get("feature", ""))
        val  = s.get("shap_value", 0)
        lines.append(f"  {i}위: {feat} ({val:+.2f}°C)")

    prompt = f"""서울시 행정동 '{adm_nm or ''}' LST(지표면온도) SHAP 분석 결과:
{chr(10).join(lines)}

위 결과를 바탕으로 이 지역의 열섬 원인을 짧고 명확한 한 문장으로 요약해주세요.
(예: "건물 밀집과 낮은 반사율이 주요 원인이며, 녹지가 일부 완화 중")
문장만 반환하세요. 따옴표나 마침표 없이."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip().strip('"').strip("'")
    except Exception as e:
        logger.warning(f"[insight] Gemini 원인 요약 실패: {e}")
        return None


def _rule_based_insight(delta_T, features, adm_nm, month):
    return {
        "summary": _build_summary(delta_T, features, adm_nm, month),
        "caution": _build_caution(features),
        "outlook": _build_outlook(features),
    }


def _rule_cause(shap_top3: list) -> str:
    if not shap_top3:
        return ""
    ups = [FEATURE_LABELS.get(s["feature"], s["feature"])
           for s in shap_top3 if s.get("direction") == "상승"]
    dns = [FEATURE_LABELS.get(s["feature"], s["feature"])
           for s in shap_top3 if s.get("direction") == "하강"]
    parts = []
    if ups:
        parts.append(f"{', '.join(ups)}이(가) 주요 상승 원인")
    if dns:
        parts.append(f"{', '.join(dns)}이(가) 일부 완화 중")
    return "이며, ".join(parts)


def _build_summary(delta_T: float, features: dict, adm_nm: str, month: int) -> str:
    if not features:
        return "정책 변수가 조정되지 않았습니다."

    parts = []
    for feat in features:
        disp   = FEATURE_LABELS.get(feat, feat)
        method = POLICY_METHODS.get(feat, "관련 정책")
        parts.append(f"{disp}({method})")

    policy_desc = ", ".join(parts[:3])
    if len(parts) > 3:
        policy_desc += f" 외 {len(parts) - 3}개 변수"

    loc = f"{adm_nm}의 " if adm_nm else ""
    season_note = ""
    if month in [6, 7, 8]:
        season_note = " 여름철 효과가 가장 크므로 하절기 전 사업 완료를 권장합니다."
    elif month in [12, 1, 2]:
        season_note = " 겨울철에는 효과가 상대적으로 작습니다."

    if delta_T < -1.0:
        effect = f"큰 폭의 LST 저감({delta_T:+.2f}°C)"
    elif delta_T < 0:
        effect = f"LST {delta_T:+.2f}°C 저감"
    elif delta_T == 0:
        effect = "유의한 LST 변화 없음"
    else:
        effect = f"LST {delta_T:+.2f}°C 상승이 예상되어 정책 재검토가 필요합니다"

    return f"{loc}{policy_desc}을 통해 {effect}이 기대됩니다.{season_note}"


def _build_caution(features: dict) -> str:
    notes = []

    if len(features) >= 3:
        notes.append(
            "3개 이상 변수를 동시에 극단값으로 조정하면 "
            "학습 데이터 범위를 벗어나 예측 신뢰도가 저하될 수 있습니다."
        )

    if "Albedo" in features:
        notes.append(
            "Albedo 등 지수형 변수의 효과는 행정동 전체 평균 기준이며, "
            "실제 시공 면적 비율에 따라 효과가 비례 축소됩니다. "
            "적용 면적 비율 설정을 확인해 주세요."
        )

    if "인구밀도" in features:
        notes.append(
            "인구밀도는 직접 레버가 아닌 장기 구조 변화 시나리오입니다. "
            "용적률·주택공급 연동 정책과 함께 해석해 주세요."
        )

    notes.append(
        "본 시뮬레이션은 LightGBM 모델 기반 추정이며 "
        "실제 정책 효과와 차이가 있을 수 있습니다."
    )
    return " ".join(notes)


def _build_outlook(features: dict) -> str:
    short_policies = {"Albedo", "그늘막", "총_가로수"}
    long_policies  = {"녹지율", "용적률", "인구밀도", "누적_조성면적"}

    short_term, long_term = [], []
    for feat in features:
        label = FEATURE_LABELS.get(feat, feat)
        if feat in short_policies:
            short_term.append(label)
        elif feat in long_policies:
            long_term.append(label)

    parts = []
    if short_term:
        parts.append(
            f"단기적으로는 {', '.join(short_term)} 조정이 즉시~1년 내 효과를 볼 수 있습니다."
        )
    if long_term:
        parts.append(
            f"중장기적으로는 {', '.join(long_term)} 관리가 지속적 LST 저감에 효과적입니다."
        )

    if not parts:
        parts.append("선택된 정책의 단기·중장기 효과를 종합적으로 검토해 주세요.")

    return " ".join(parts)
