#!/usr/bin/env bash
#
# Deploy «Читаем вместе» to Yandex Serverless Containers.
#
# The container runs server.js, which serves both the built frontend and the
# /api/claude proxy on one origin — so there is no CORS to configure and the
# Anthropic key never leaves the server.
#
# Prerequisites:
#   - yc CLI installed and initialised (`yc init`)
#   - docker running locally
#   - the Anthropic key available (see KEY SETUP below)
#
# Usage:
#   ./deploy/yandex-cloud.sh
#
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-chitaem-vmeste}"
REGISTRY_NAME="${REGISTRY_NAME:-chitaem-vmeste}"
SA_NAME="${SA_NAME:-chitaem-vmeste-sa}"
SECRET_NAME="${SECRET_NAME:-chitaem-vmeste-anthropic}"
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"
MEMORY="${MEMORY:-256MB}"
CORES="${CORES:-1}"
# Anthropic calls can take a while; well under the 10 min ceiling.
TIMEOUT="${TIMEOUT:-300s}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# Extract a top-level string field from JSON on stdin. Uses jq when available
# and falls back to python3, so the script works on a bare machine.
jget() {
  if command -v jq >/dev/null 2>&1; then
    jq -r --arg k "$1" '.[$k] // empty'
  else
    python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get(sys.argv[1],""))' "$1"
  fi
}

command -v yc >/dev/null || { echo "yc CLI not found: https://yandex.cloud/docs/cli/quickstart"; exit 1; }
command -v docker >/dev/null || { echo "docker not found"; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running"; exit 1; }

FOLDER_ID="$(yc config get folder-id)"
[ -n "$FOLDER_ID" ] || { echo "No folder-id in yc config. Run: yc init"; exit 1; }
say "Folder: $FOLDER_ID"

# --- Container registry -----------------------------------------------------
say "Container registry «$REGISTRY_NAME»"
REGISTRY_ID="$(yc container registry get --name "$REGISTRY_NAME" --format json 2>/dev/null | jget id || true)"
if [ -z "$REGISTRY_ID" ]; then
  REGISTRY_ID="$(yc container registry create --name "$REGISTRY_NAME" --format json | jget id)"
  echo "created: $REGISTRY_ID"
else
  echo "exists: $REGISTRY_ID"
fi

# --- Service account --------------------------------------------------------
say "Service account «$SA_NAME»"
SA_ID="$(yc iam service-account get --name "$SA_NAME" --format json 2>/dev/null | jget id || true)"
if [ -z "$SA_ID" ]; then
  SA_ID="$(yc iam service-account create --name "$SA_NAME" --format json | jget id)"
  echo "created: $SA_ID"
else
  echo "exists: $SA_ID"
fi

say "Granting roles to the service account"
# Pull the image from the registry, and read the key out of Lockbox.
for ROLE in container-registry.images.puller lockbox.payloadViewer; do
  yc resource-manager folder add-access-binding "$FOLDER_ID" \
    --role "$ROLE" --subject "serviceAccount:$SA_ID" >/dev/null 2>&1 \
    && echo "  + $ROLE" || echo "  = $ROLE (already granted)"
done

# --- Build & push -----------------------------------------------------------
IMAGE="cr.yandex/$REGISTRY_ID/$CONTAINER_NAME:$IMAGE_TAG"
say "Building $IMAGE"
# Serverless Containers run on amd64 — force it, so the image also works when
# built on an Apple Silicon Mac.
docker build --platform linux/amd64 -t "$IMAGE" .

say "Pushing to registry"
yc container registry configure-docker
docker push "$IMAGE"

# --- Secret -----------------------------------------------------------------
say "Lockbox secret «$SECRET_NAME»"
SECRET_ID="$(yc lockbox secret get --name "$SECRET_NAME" --format json 2>/dev/null | jget id || true)"
if [ -z "$SECRET_ID" ]; then
  : "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY once so the secret can be created, e.g. ANTHROPIC_API_KEY=sk-ant-... ./deploy/yandex-cloud.sh}"
  SECRET_ID="$(yc lockbox secret create --name "$SECRET_NAME" \
    --payload "[{'key': 'ANTHROPIC_API_KEY', 'text_value': '$ANTHROPIC_API_KEY'}]" \
    --format json | jget id)"
  echo "created: $SECRET_ID"
else
  echo "exists: $SECRET_ID (key unchanged; update it in the console or with 'yc lockbox secret add-version')"
fi

# Pin the revision to the secret's current version. Prefer the secret's own
# current_version field; fall back to the newest entry in list-versions.
secret_current_version() {
  yc lockbox secret get --id "$SECRET_ID" --format json 2>/dev/null | {
    if command -v jq >/dev/null 2>&1; then jq -r '.current_version.id // empty'
    else python3 -c 'import sys,json;print(json.load(sys.stdin).get("current_version",{}).get("id",""))'
    fi
  }
}
secret_newest_version() {
  yc lockbox secret list-versions --id "$SECRET_ID" --format json 2>/dev/null | {
    if command -v jq >/dev/null 2>&1; then jq -r '.[0].id // empty'
    else python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")'
    fi
  }
}
SECRET_VERSION_ID="$(secret_current_version)"
[ -n "$SECRET_VERSION_ID" ] || SECRET_VERSION_ID="$(secret_newest_version)"
[ -n "$SECRET_VERSION_ID" ] || { echo "Could not resolve a version for secret $SECRET_ID"; exit 1; }
echo "secret version: $SECRET_VERSION_ID"

# --- Container --------------------------------------------------------------
say "Serverless container «$CONTAINER_NAME»"
yc serverless container get --name "$CONTAINER_NAME" >/dev/null 2>&1 \
  || yc serverless container create --name "$CONTAINER_NAME" >/dev/null

say "Deploying revision"
yc serverless container revision deploy \
  --container-name "$CONTAINER_NAME" \
  --image "$IMAGE" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --execution-timeout "$TIMEOUT" \
  --service-account-id "$SA_ID" \
  --secret "id=$SECRET_ID,version-id=$SECRET_VERSION_ID,key=ANTHROPIC_API_KEY,environment-variable=ANTHROPIC_API_KEY"

say "Allowing public access"
yc serverless container allow-unauthenticated-invoke "$CONTAINER_NAME"

URL="$(yc serverless container get --name "$CONTAINER_NAME" --format json | jget url)"
say "Done"
echo "  $URL"
