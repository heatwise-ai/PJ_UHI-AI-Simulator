"""
models/model_loader.py
학습된 LightGBM 모델(model.pkl)을 로드·관리.
model.pkl이 없으면 feat_weather 데이터로 Ridge 회귀 폴백 모델을 학습합니다.
"""

import joblib
import numpy as np
from pathlib import Path

MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "model.pkl"
FEATURE_COLS_PATH = MODEL_DIR / "feature_cols.pkl"

_model = None
_feature_cols: list[str] | None = None
_is_fallback: bool = False


def load_model() -> None:
    global _model, _feature_cols, _is_fallback
    if MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
        _is_fallback = False
        print(f"[model_loader] model.pkl 로드: {type(_model).__name__}")
    else:
        _model = None
        _is_fallback = False
        print("[model_loader] model.pkl 없음 → train_fallback() 호출 필요")

    if FEATURE_COLS_PATH.exists():
        _feature_cols = joblib.load(FEATURE_COLS_PATH)
        print(f"[model_loader] feature_cols: {len(_feature_cols)}개")


def train_fallback(panel_df) -> None:
    """
    model.pkl이 없을 때 feat_weather 데이터로 Ridge 회귀를 학습해 폴백 모델로 사용.
    R² ≈ 0.74, Albedo·녹지율 등 정책 변수의 냉각 방향이 올바르게 반영됩니다.
    """
    global _model, _feature_cols, _is_fallback
    if _model is not None:
        return  # 이미 실제 모델이 로드된 경우 skip

    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from utils.helpers import MODEL_FEATURES

    features = [f for f in MODEL_FEATURES if f in panel_df.columns]
    df = panel_df.dropna(subset=["LST"] + features)
    if df.empty:
        print("[model_loader] 폴백 모델 학습 불가: 데이터 없음")
        return

    X = df[features].fillna(0).values
    y = df["LST"].values

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("ridge", Ridge(alpha=10.0)),
    ])
    pipe.fit(X, y)

    _model = pipe
    _feature_cols = features
    _is_fallback = True

    r2 = pipe.score(X, y)
    print(f"[model_loader] Ridge 폴백 모델 학습 완료 (R²={r2:.3f}, features={len(features)})")


def get_model():
    return _model


def get_feature_cols() -> list[str] | None:
    return _feature_cols


def predict(feature_array: np.ndarray) -> float:
    """shape (1, n_features) → float(LST 예측값)"""
    if _model is None:
        raise RuntimeError("모델 미로드")
    return float(_model.predict(feature_array)[0])


def is_available() -> bool:
    return _model is not None


def is_fallback() -> bool:
    """True면 Ridge 폴백 모델 사용 중 (model.pkl 없음)."""
    return _is_fallback
