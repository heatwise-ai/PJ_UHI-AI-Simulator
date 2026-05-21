FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY heatwise/frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY heatwise/frontend/ ./frontend/
RUN mkdir -p static && cd frontend && npm run build

FROM python:3.11-slim
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY heatwise/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY heatwise/ ./heatwise/
COPY --from=frontend-builder /app/static/dist/ ./heatwise/static/dist/
WORKDIR /app/heatwise
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
