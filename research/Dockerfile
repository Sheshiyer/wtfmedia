FROM python:3.13.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHON_DOTENV_DISABLED=1 \
    RESEARCH_RUNNER_DB=/data/runner.sqlite
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libmagic1 libpango-1.0-0 libpangoft2-1.0-0 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --gid 10001 runner && useradd --uid 10001 --gid 10001 --no-create-home runner && \
    mkdir /data && chown 10001:10001 /data && chmod 700 /data
COPY requirements.lock /app/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /app/requirements.lock
COPY --chown=10001:10001 . /app/research
USER 10001:10001
VOLUME ["/data"]
EXPOSE 8080
CMD ["python", "-m", "uvicorn", "research.api:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--no-access-log"]
