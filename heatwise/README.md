# 서울시 UHI 시뮬레이터 API 서버

서울시 행정동별 도시열섬(Urban Heat Island) 완화 지원 AI 시뮬레이터의 백엔드 API 서버입니다.

## 프로젝트 구조

```
backend/
├── main.py                     # FastAPI 진입점 (라우터 등록만)
├── data_loader.py              # 서버 시작 시 CSV 1회 로드
├── requirements.txt
├── README.md
│
├── data/                       # CSV 데이터 (Git에서 자동 복사됨)
│   ├── feat_weather.csv        # 메인 패널 (LST + 전체 피처)
│   ├── dim_adm_dong.csv        # 행정동 차원 테이블
│   ├── stat_shap.csv           # SHAP 기여도
│   └── stat_cost_unit.csv      # 정책 비용·조정 단위
│
├── models/
│   └── model_loader.py         # LightGBM model.pkl 로드 관리
│       (model.pkl 여기에 배치)
│
├── services/                   # ★ 비즈니스 로직 전부 여기
│   ├── data_service.py         # 데이터 조회·필터링·요약 통계
│   ├── simulation_service.py   # ΔT = f(X') - f(X) 계산
│   ├── optimization_service.py # 예산 기반 최적 조합 추천
│   └── insight_service.py      # 텍스트 인사이트 생성 (rule-based)
│
├── routers/                    # API 엔드포인트 정의만
│   ├── summary.py              # GET  /summary, /summary/slider-config, ...
│   ├── simulate.py             # POST /simulate
│   ├── optimize.py             # POST /optimize
│   └── insight.py              # POST /insight
│
├── utils/
│   └── helpers.py              # 공통 상수·유틸 함수
│
└── static/
    └── test.html               # 최소 API 테스트 UI
```

## 실행 방법

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API 문서

- Swagger UI: http://localhost:8000/docs
- 테스트 UI:  http://localhost:8000/test

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/summary` | 행정동·연월 LST 현황 + SHAP TOP3 |
| GET | `/summary/slider-config` | Step2 슬라이더 설정 (범위, 단가, 패키지) |
| GET | `/summary/dong-list` | 행정동 목록 (자동완성용) |
| GET | `/summary/years-months` | 조회 가능 연도·월 |
| POST | `/simulate` | 정책 변수 조정 → ΔT 계산 |
| POST | `/optimize` | 예산·패키지 기반 최적 추천 |
| POST | `/insight` | 정책 효과 인사이트 텍스트 |

## 모델 배포

`models/model.pkl`에 학습된 LightGBM 모델을 배치하면 자동으로 로드됩니다.
모델이 없으면 SHAP 기반 선형 근사 폴백을 사용합니다 (개발용).

```bash
# 모델 파일 배치
cp /path/to/model.pkl backend/models/model.pkl
```

## 설계 원칙

- **프론트 분리**: 모든 응답 JSON only, CORS 허용
- **로직 분리**: 라우터 ↔ 서비스 ↔ 데이터 완전 분리
- **프론트 교체 시 백엔드 수정 0**: API 스펙 불변
