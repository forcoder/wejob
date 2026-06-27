#!/usr/bin/env bash
#
# alias-promote.sh — 把 GitHub 自动部署 promote 到 wejob-gold.vercel.app
#
# 背景：wejob 启用了 GitHub 集成，每次 push 后 Vercel 会自动部署，但不会自动
# 切 alias（项目有多个域名，vercel deploy --prod 只切主 alias；wejob 主站用
# wejob-gold.vercel.app 这个 alias，所以 push 后要手动切）。
#
# 用法：
#   export VERCEL_TOKEN=vcp_xxx           # 必须，Vercel API token
#   export VERCEL_PROJECT_ID=prj_xxx       # 可选，默认从 .vercel/repo.json 读
#   export VERCEL_TEAM_ID=team_xxx         # 可选，默认从 .vercel/repo.json 读
#   ./scripts/alias-promote.sh             # 切 wejob-gold.vercel.app
#   ALIAS=wejob-cookie-8-projects.vercel.app ./scripts/alias-promote.sh
#
# 返回码：
#   0 = 切换成功或已是最新
#   1 = token 缺失
#   2 = 项目未找到
#   3 = 部署未就绪
#   4 = API 失败
#

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALIAS="${ALIAS:-wejob-gold.vercel.app}"

# 读取 token
if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "❌ VERCEL_TOKEN 未设置" >&2
  echo "   export VERCEL_TOKEN=vcp_xxx" >&2
  exit 1
fi

# 读取 project / team ID
if [[ -z "${VERCEL_PROJECT_ID:-}" || -z "${VERCEL_TEAM_ID:-}" ]]; then
  REPO_JSON="$PROJECT_DIR/.vercel/repo.json"
  if [[ ! -f "$REPO_JSON" ]]; then
    echo "❌ 找不到 $REPO_JSON，请先 vercel link" >&2
    exit 1
  fi
  VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-$(python3 -c "import json; d=json.load(open('$REPO_JSON')); print(d['projects'][0]['id'])")}"
  VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-$(python3 -c "import json; d=json.load(open('$REPO_JSON')); print(d['projects'][0]['orgId'])")}"
fi

API="https://api.vercel.com"
AUTH="Authorization: Bearer ${VERCEL_TOKEN}"

echo "▶ 项目: ${VERCEL_PROJECT_ID}"
echo "▶ 团队: ${VERCEL_TEAM_ID}"
echo "▶ 目标 alias: ${ALIAS}"
echo

# 1. 获取最新 production 部署
echo "→ 查询最新 production 部署..."
LATEST_JSON=$(curl -sS -m 15 -H "$AUTH" \
  "${API}/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&target=production&limit=5&state=READY")

LATEST_ID=$(echo "$LATEST_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
deps = d.get('deployments', [])
if not deps:
    sys.exit(2)
print(deps[0]['uid'])
")

if [[ -z "$LATEST_ID" ]]; then
  echo "❌ 找不到 READY 状态的 production 部署" >&2
  exit 3
fi

echo "✓ 最新部署: ${LATEST_ID}"

# 2. 查询 alias 当前指向的部署
echo "→ 查询当前 alias 状态..."
PROJECT_JSON=$(curl -sS -m 15 -H "$AUTH" \
  "${API}/v1/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_TEAM_ID}")

CURRENT_ID=$(echo "$PROJECT_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for a in d.get('alias', []):
    if a.get('domain') == '${ALIAS}':
        dep = a.get('deployment') or {}
        print(dep.get('id', ''))
        break
")

if [[ "$CURRENT_ID" == "$LATEST_ID" ]]; then
  echo "✓ alias 已指向最新部署，无需切换"
  exit 0
fi

echo "  当前: ${CURRENT_ID:-<未分配>}"
echo "  目标: ${LATEST_ID}"

# 3. 切换 alias
echo "→ 切换 alias..."
RESP=$(curl -sS -m 30 -X POST \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"alias\": \"${ALIAS}\"}" \
  "${API}/v2/deployments/${LATEST_ID}/aliases?teamId=${VERCEL_TEAM_ID}")

if echo "$RESP" | grep -q '"error"'; then
  echo "❌ 切换失败:" >&2
  echo "$RESP" | python3 -m json.tool >&2
  exit 4
fi

echo "✓ 切换成功"
echo "  https://${ALIAS}/"
