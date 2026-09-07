#!/usr/bin/env bash
# ============================================================================
# SonarQube 분석 결과를 읽어 PR 코멘트와 job 요약으로 남긴다.
# ============================================================================
# integrate.yml 의 analyze job 이 쓴다. 인라인 bash 를 여기로 뺀 이유는 둘이다 —
# `ssccops-server` 가 같은 자리(.github/scripts/sonar-report.sh)에 같은 스크립트를 두어
# **두 레포의 모양을 맞추기 위해서**이고, 워크플로 YAML 안의 bash 는 `bash -n` 으로
# 문법 검사조차 할 수 없기 때문이다. 이 스크립트가 조용히 틀린 값을 보고한 이력이 있다
# (ssccops-web#306 · 아래 BRANCH_ENC).
#
# **Quality Gate 가 실패해도 이 스크립트는 0 으로 끝난다** (ssccops#231).
# 처음 분석을 켜면 기존 코드의 지적이 수백 건 나오는데, 그 상태로 게이트를 잠그면
# 아무것도 머지할 수 없다. 먼저 숫자를 보고, 기준을 정한 뒤에 잠근다.
#
# 반대로 **인프라 오류(report-task.txt 없음·CE 태스크 실패)는 그대로 실패시킨다.**
# 분석이 아예 안 된 것과 품질이 나쁜 것은 다른 일이다.
#
# 필요한 환경변수:
#   SONAR_TOKEN · SONAR_HOST_URL   분석 서버 접속
#   GH_TOKEN                       PR 코멘트 작성 (gh CLI)
#   REPO                           owner/repo
#   BRANCH                         분석 대상 브랜치명
#   PR_NUMBER                      (선택) 있으면 PR 에 코멘트를 단다
# ============================================================================
set -euo pipefail

REPORT_FILE="${REPORT_FILE:-.scannerwork/report-task.txt}"

if [ ! -f "$REPORT_FILE" ]; then
  echo "::error::$REPORT_FILE 이 없다. 분석이 실제로 돌지 않았다."
  exit 1
fi

CE_TASK_ID=$(grep '^ceTaskId=' "$REPORT_FILE" | cut -d'=' -f2)
PROJECT_KEY=$(grep '^projectKey=' "$REPORT_FILE" | cut -d'=' -f2)
DASHBOARD_URL=$(grep '^dashboardUrl=' "$REPORT_FILE" | cut -d'=' -f2-)

echo "ProjectKey: $PROJECT_KEY"
echo "Branch: $BRANCH"

# 브랜치명을 URL 인코딩한다. 이 저장소의 브랜치는 `{type}/#{이슈번호}-{슬러그}` 형식이라
# **이름에 `#` 이 들어간다** — 그대로 쿼리에 끼우면 curl 이 그 뒤를 fragment 로 잘라내
# `branch=chore/` 만 전송되고, 없는 브랜치라 응답이 비어 커버리지가 0% 로 보고된다.
# 실제로 #304 의 첫 실행이 그렇게 나왔다 (ssccops-web#306 · ssccops-server#284).
BRANCH_ENC=$(jq -rn --arg v "$BRANCH" '$v|@uri')

# ----------------------------------------------------------------------------
# CE 태스크가 끝나기를 기다린다 (분석 제출과 집계는 비동기다)
# ----------------------------------------------------------------------------
TASK_STATUS=""
for i in $(seq 1 30); do
  STATUS_JSON=$(curl -s -u "$SONAR_TOKEN:" "$SONAR_HOST_URL/api/ce/task?id=$CE_TASK_ID")
  TASK_STATUS=$(echo "$STATUS_JSON" | jq -r '.task.status // "UNKNOWN"')

  if [ "$TASK_STATUS" = "SUCCESS" ]; then
    break
  fi

  # FAILED·CANCELED 는 기다려도 바뀌지 않는다 — 30회를 채울 이유가 없다
  if [ "$TASK_STATUS" = "FAILED" ] || [ "$TASK_STATUS" = "CANCELED" ]; then
    echo "::error::SonarQube CE 태스크가 $TASK_STATUS 로 끝났다."
    exit 1
  fi

  echo "Waiting for SonarQube task... ($i)"
  sleep 5
done

if [ "$TASK_STATUS" != "SUCCESS" ]; then
  echo "::error::SonarQube CE 태스크가 150초 안에 끝나지 않았다 (마지막 상태: $TASK_STATUS)."
  exit 1
fi

ANALYSIS_ID=$(echo "$STATUS_JSON" | jq -r '.task.analysisId')

# ----------------------------------------------------------------------------
# Quality Gate
# ----------------------------------------------------------------------------
QG_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/qualitygates/project_status?analysisId=$ANALYSIS_ID")
QG_STATUS=$(echo "$QG_JSON" | jq -r '.projectStatus.status // "UNKNOWN"')

# ----------------------------------------------------------------------------
# 이슈 · 측정값
#
# **조회 실패와 '값이 0' 을 가른다.** 예전에는 둘 다 `// "0"` 으로 뭉개져, 브랜치명이
# 잘려 빈 응답이 온 것을 "커버리지 0%" 로 보고했다 — 그 폴백이 진짜 오류를 가렸고
# 아무도 눈치채지 못한 채 그 숫자가 기준을 정하는 근거로 쓰일 뻔했다(ssccops#231).
#
# 판정 재료는 응답의 모양이다. 조회가 성공하면 `.component`(측정값)·`.facets`(이슈)가
# 있고, 빗나가면 그 자리가 없거나 `.errors` 가 온다. 값이 진짜로 없는 것(테스트 러너가
# 없어 커버리지 측정 자체가 없는 경우)은 조회는 성공하되 그 metric 만 빠진 모양이라
# 셋이 구별된다 — 성공+값 · 성공+없음 · 실패.
# ----------------------------------------------------------------------------
# `facets=types` 로 **집계값**을 받는다. 예전에는 돌아온 `issues` 배열을 세었는데 그 배열은
# 한 페이지(기본 100건)라 **총계가 아니라 페이지 크기를 세고 있었다** — 실제로 web 의 첫
# 보고(4+0+96)와 그다음 보고(1+71+28)가 **둘 다 정확히 100** 이었다. `ps=1` 로 본문은 받지
# 않고 facet 만 받는다.
ISSUES_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/issues/search?projectKeys=$PROJECT_KEY&branch=$BRANCH_ENC&resolved=false&facets=types&ps=1")

if echo "$ISSUES_JSON" | jq -e 'has("facets")' >/dev/null 2>&1; then
  type_count() {
    echo "$ISSUES_JSON" | jq -r --arg t "$1" \
      '[ .facets[] | select(.property=="types") | .values[] | select(.val==$t) | .count ] | first // 0'
  }
  BUGS=$(type_count BUG)
  VULNS=$(type_count VULNERABILITY)
  SMELLS=$(type_count CODE_SMELL)
else
  echo "::warning::이슈 질의가 빗나갔다 (branch=$BRANCH). 응답: $(echo "$ISSUES_JSON" | head -c 200)"
  BUGS="조회 실패"
  VULNS="조회 실패"
  SMELLS="조회 실패"
fi

MEASURES_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/measures/component?component=$PROJECT_KEY&branch=$BRANCH_ENC&metricKeys=coverage,duplicated_lines_density")

# 측정값 하나를 꺼낸다. 조회 자체가 빗나갔으면 "조회 실패", 조회는 됐는데 그 metric 이
# 없으면 "없음"(측정된 적이 없다는 뜻이고, 0% 와 다르다).
measure_of() {
  local metric="$1"
  if ! echo "$MEASURES_JSON" | jq -e 'has("component")' >/dev/null 2>&1; then
    echo "조회 실패"
    return
  fi
  local value
  value=$(echo "$MEASURES_JSON" | jq -r --arg m "$metric" \
    '.component.measures // [] | map(select(.metric==$m)) | .[0].value // ""')
  if [ -z "$value" ]; then
    echo "없음"
  else
    echo "${value}%"
  fi
}

if ! echo "$MEASURES_JSON" | jq -e 'has("component")' >/dev/null 2>&1; then
  echo "::warning::측정값 질의가 빗나갔다 (branch=$BRANCH). 응답: $(echo "$MEASURES_JSON" | head -c 200)"
fi

COVERAGE=$(measure_of coverage)
DUPLICATION=$(measure_of duplicated_lines_density)

if [ "$QG_STATUS" = "OK" ]; then
  ICON="✅"
  RESULT="PASSED"
else
  ICON="⚠️"
  RESULT="$QG_STATUS"
fi

BODY=$(cat <<EOF
## SonarQube 분석 결과

${ICON} **Quality Gate ${RESULT}**

**브랜치:** \`${BRANCH}\`

### 이슈
- 버그: ${BUGS}
- 취약점: ${VULNS}
- 코드 스멜: ${SMELLS}

### 측정값
- 커버리지: ${COVERAGE}
- 중복도: ${DUPLICATION}

Dashboard: ${DASHBOARD_URL}&branch=${BRANCH_ENC}

> Quality Gate는 **머지를 막지 않는다** (ssccops#231). 기준을 정한 뒤에 잠근다.
EOF
)

echo "$BODY" >> "$GITHUB_STEP_SUMMARY"

if [ -n "${PR_NUMBER:-}" ]; then
  gh api "repos/$REPO/issues/$PR_NUMBER/comments" -f body="$BODY"
fi

# Quality Gate 실패로 이 스크립트를 실패시키지 않는다 — 위 주석 참고.
if [ "$QG_STATUS" != "OK" ]; then
  echo "::warning::Quality Gate 가 $QG_STATUS 다. 지금은 막지 않는다 (ssccops#231)."
fi
