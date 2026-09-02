FROM python:3.12-slim AS base

WORKDIR /app

# ffmpeg: required by Whisper fallback (yt-dlp audio extraction for
#   no-caption YouTube videos). git: required by GitHub clone-mode imports
#   (gitpython shells out to `git clone`). Both are used by currently
#   supported source-import features.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3001

# Render sets $PORT (often 10000). Fall back to 3001 for local docker-compose.
# --proxy-headers --forwarded-allow-ips="*" lets uvicorn trust the platform
# proxy so slowapi rate limiting sees real client IPs.
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3001} --proxy-headers --forwarded-allow-ips=\"*\""]
