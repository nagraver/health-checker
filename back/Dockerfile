FROM python:3.11-slim

WORKDIR /app

# Установим uv
RUN pip install --no-cache-dir uv

# Копируем проект
COPY . .

# Устанавливаем зависимости через uv
RUN uv venv && \
    uv pip install fastapi uvicorn redis pydantic

# Запуск через uv
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
