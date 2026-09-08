#!/usr/bin/env bash
# ============================================================================
# SonarQube 분석 결과를 읽어 job 요약으로 남긴다.
# ============================================================================
# integrate.yml 의 analyze job 이 쓴다. 인라인 bash 를 여기로 뺀 이유는 둘이다 —
# `ssccops-server` 가 같은 자리(.github/scripts/sonar-report.sh)에 같은 스크립트를 두어
# **두 레포의 모양을 맞추기 위해서**이고, 워크플로 YAML 안의 bash 는 `bash -n` 으로
# 문법 검사조차 할 수 없기 때문이다. 이 스크립트가 조용히 틀린 값을 보고한 이력이 있다
# (ssccops-web#306 — 브랜치명 인코딩. 그 질의 자체는 ssccops#238 에서 걷어냈다).
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
#   REF_NAME                       분석한 ref (표시용. 질의에는 쓰지 않는다 — 아래 참고)
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
echo "Ref: ${REF_NAME:-?}"

# ----------------------------------------------------------------------------
# **질의에 branch 파라미터를 넣지 않는다** (ssccops#238).
#
# 이 서버는 SonarQube Community Build 26.8.0 이고 브랜치 플러그인이 없다(ssccops#234).
# 스캐너가 `sonar.branch.name` 을 선언하지 못해 — 선언하면 업그레이드하라는 오류로 분석이
# 죽는다 — **모든 분석이 프로젝트 기본 브랜치 한 자리에 쌓인다.**
#
# 그 상태에서 `&branch=<브랜치명>` 으로 조회하면 **없는 브랜치를 묻는 것**이라 응답이 빈다.
# ssccops-web#306 이 URL 인코딩을 고쳤지만 그것은 다른 결함이었고, 이쪽은 인코딩이 맞아도
# 여전히 빗나간다 — **제출할 때 브랜치를 밝히지 않았으니 조회에서 무엇을 하든 같은 데이터를
# 되읽는다.** 그래서 파라미터를 뺀다.
#
# 분석이 develop push 한 곳에서만 돌므로 프로젝트 기본 브랜치의 상태가 곧 develop 의
# 상태다. 리포트도 그렇게 말한다.
# ----------------------------------------------------------------------------

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

# **무엇이 게이트를 깨뜨렸는가** (ssccops#233 · #235 — ssccops-server#295 의 구현을 그대로 옮긴다).
#
# 그전까지 이 스크립트는 `ERROR` 한 단어만 찍었다. 응답의 conditions[] 에 어느 지표가 어느
# 임계값에서 걸렸는지가 **이미 들어 있는데** 버리고 있었다 — 추가 왕복이 없다.
#
# 이 레포는 **커버리지가 없다**(테스트 러너가 없다). 그래서 ERROR 가 커버리지 때문인지
# `new_violations` 때문인지 가려야 하는데 둘은 대응이 전혀 다르다 — 하나는 러너를 들이는
# 일이고 하나는 지적을 고치는 일이다. 상태 한 단어로는 갈리지 않는다.
#
# ssccops#235(게이트를 언제·어떤 기준으로 잠글지)는 이 목록 없이는 시작할 수 없다.
# 무엇이 걸리는지 모르는 채로 임계값을 정할 수는 없다.
QG_CONDITIONS=$(echo "$QG_JSON" | jq -r '
  [ (.projectStatus.conditions // [])[] | select(.status != "OK") ]
  | if length == 0 then empty
    else ("| 지표 | 실제 | 조건 | 임계값 |", "|---|---|---|---|"),
         (.[] | "| `\(.metricKey)` | \(.actualValue // "?") | \(.comparator // "?") | \(.errorThreshold // "?") |")
    end')

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
#
# 필터 이름은 `componentKeys` 다. `projectKeys` 는 이 API 에 없는 이름이라 **오류 없이 통째로
# 무시되고 인스턴스 전체가 돌아온다** — server 쪽에서 같은 자리를 고쳤다(ssccops-server#291).
# 이 리포트가 "기본 브랜치 기준" 이라고 말하려면 프로젝트 범위부터 실제로 걸려 있어야 한다.
ISSUES_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/issues/search?componentKeys=$PROJECT_KEY&resolved=false&facets=types,rules&ps=1")

if echo "$ISSUES_JSON" | jq -e 'has("facets")' >/dev/null 2>&1; then
  type_count() {
    echo "$ISSUES_JSON" | jq -r --arg t "$1" \
      '[ .facets[] | select(.property=="types") | .values[] | select(.val==$t) | .count ] | first // 0'
  }
  BUGS=$(type_count BUG)
  VULNS=$(type_count VULNERABILITY)
  SMELLS=$(type_count CODE_SMELL)
else
  echo "::warning::이슈 질의가 빗나갔다. 응답: $(echo "$ISSUES_JSON" | head -c 200)"
  BUGS="조회 실패"
  VULNS="조회 실패"
  SMELLS="조회 실패"
fi

# 규칙별 상위 목록 (ssccops-web#311 -> #310).
#
# 타입별 합계만으로는 **무엇부터 볼지 알 수 없다.** 지적 수가 곧 문제의 가짓수는 아니고,
# 같은 규칙이 여러 파일에서 걸린 것이 대부분이라 규칙으로 묶으면 판단 단위가 몇 개로 줄어든다.
# facets=rules 는 위 요청에 이미 얹혀 오므로 추가 왕복이 없다.
#
# **이 표가 검증 수단이기도 하다** — `java:` 규칙이 섞여 나오면 프로젝트 필터가 또 빠진 것이다.
# server 에서 `typescript:` 규칙이 1위로 나온 것이 필터 결함을 드러낸 방식이 정확히 이것이었다.
RULES_TABLE=$(echo "$ISSUES_JSON" | jq -r '
  [ (.facets // [])[] | select(.property=="rules") | (.values // [])[] ]
  | sort_by(-.count) | .[:15]
  | if length == 0 then empty
    else ("| 규칙 | 건수 |", "|---|---|"), (.[] | "| `\(.val)` | \(.count) |")
    end')

# 취약점만의 규칙 분포 (ssccops#233 — ssccops-server#295 의 구현을 그대로 옮긴다).
#
# 위 RULES_TABLE 은 버그·취약점·코드 스멜을 **한 표에 섞어 놓는다.** 분류의 첫 단추는
# "어느 규칙이 취약점인가"인데 그것을 읽을 수 없다 — 상위가 어떤 규칙 80건일 때 그 80이
# 취약점 중 80인지 코드 스멜 중 80인지 표만 봐서는 갈리지 않는다.
#
# 요청을 하나 더 보내는 것은 `types` 가 facet 이 아니라 **필터**라서다. 같은 응답에서 두 축을
# 동시에 얻을 수 없다. ps=1 이라 본문은 최소이고 왕복 하나가 는다.
# **branch 는 붙이지 않는다** — 위 ISSUES_JSON 과 같은 이유다 (ssccops#238).
VULN_ISSUES_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/issues/search?componentKeys=$PROJECT_KEY&resolved=false&types=VULNERABILITY&ps=1&facets=rules")

VULN_RULES_TABLE=$(echo "$VULN_ISSUES_JSON" | jq -r '
  [ (.facets // [])[] | select(.property=="rules") | (.values // [])[] | select(.count > 0) ]
  | sort_by(-.count) | .[:15]
  | if length == 0 then empty
    else ("| 규칙 | 건수 |", "|---|---|"), (.[] | "| `\(.val)` | \(.count) |")
    end')

# 보안 핫스팟 (ssccops#233 — ssccops-server#295 의 구현을 그대로 옮긴다).
#
# 보안 점검을 하면서 보안 핫스팟을 빼 두는 것은 앞뒤가 맞지 않아 실제로 센다.
#
# **프로젝트 필터 이름이 issues API 와 다르다** — 이쪽은 `projectKey`(단수)이고
# api/issues/search 는 `componentKeys` 다. SonarQube 는 모르는 파라미터를 오류로 만들지 않고
# 조용히 무시하므로(ssccops-server#291 에서 `projectKeys` 로 밟았다) 이름이 틀리면 인스턴스
# 전체가 돌아온다. 값이 총계와 동떨어지면 그것부터 의심할 것.
HOTSPOTS_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/hotspots/search?projectKey=$PROJECT_KEY&status=TO_REVIEW&ps=1")
HOTSPOTS=$(echo "$HOTSPOTS_JSON" | jq -r '.paging.total // "?"')

MEASURES_JSON=$(curl -s -u "$SONAR_TOKEN:" \
  "$SONAR_HOST_URL/api/measures/component?component=$PROJECT_KEY&metricKeys=coverage,duplicated_lines_density")

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
  echo "::warning::측정값 질의가 빗나갔다. 응답: $(echo "$MEASURES_JSON" | head -c 200)"
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

**분석한 커밋:** \`${REF_NAME:-?}\` @ \`${GITHUB_SHA:0:7}\`

### 이슈
- 버그: ${BUGS}
- 취약점: ${VULNS}
- 코드 스멜: ${SMELLS}
- 보안 핫스팟(검토 대기): ${HOTSPOTS}

### 측정값
- 커버리지: ${COVERAGE}
- 중복도: ${DUPLICATION}

Dashboard: ${DASHBOARD_URL}

> **이 수치는 프로젝트 기본 브랜치 기준이다** — 이 서버는 Community Build 라 브랜치를 가르지 못한다(ssccops#234). 분석은 develop push 한 곳에서만 돌므로 곧 develop 의 상태다.
>
> **보안 핫스팟은 취약점 수에 포함되지 않는다** — 별도 API(\`api/hotspots/search\`)라 따로 센다. 취약점 수가 보안 지적의 전부가 아니다.
>
> Quality Gate는 **머지를 막지 않는다** (ssccops#231). 기준을 정한 뒤에 잠근다.
EOF
)

echo "$BODY" >> "$GITHUB_STEP_SUMMARY"

# **본문도 stdout 에 찍는다.** job 요약은 UI 에서만 보이고 Actions API 로는 읽히지 않는다 —
# 로그에 없으면 사람이 브라우저를 열어 옮겨 적기 전에는 아무도(자동화 포함) 이 숫자를 볼 수
# 없고, 기준선이 이슈에 남지 않는다. ssccops#238 의 검증이 실제로 여기서 막혔다.
echo "$BODY"

# 게이트를 깨뜨린 조건 (ssccops#233 · #235). 통과했으면 표가 비어 아무것도 찍지 않는다.
if [ -n "${QG_CONDITIONS:-}" ]; then
  {
    echo
    echo "### Quality Gate 실패 조건"
    echo
    echo "$QG_CONDITIONS"
    echo
    echo "> 게이트를 언제 잠글지는 이 목록을 보고 정한다 (ssccops#235)."
  } >> "$GITHUB_STEP_SUMMARY"

  echo "--- Quality Gate 실패 조건 ---"
  echo "$QG_CONDITIONS"
fi

# 취약점만의 규칙 분포 (ssccops#233). 취약점이 없으면 표가 비어 찍지 않는다.
if [ -n "${VULN_RULES_TABLE:-}" ]; then
  {
    echo
    echo "### 취약점 규칙별 분포"
    echo
    echo "$VULN_RULES_TABLE"
    echo
    echo "> 아래 전체 분포와 달리 **취약점만** 센다. 합이 위의 취약점 총계와 맞지 않으면"
    echo "> 필터가 빗나간 것이다 (ssccops-server#291 에서 실제로 그랬다)."
  } >> "$GITHUB_STEP_SUMMARY"

  echo "--- 취약점 규칙별 분포 ---"
  echo "$VULN_RULES_TABLE"
fi

# 규칙별 분포는 job 요약과 stdout 양쪽에 붙인다.
if [ -n "${RULES_TABLE:-}" ]; then
  {
    echo
    echo "### 규칙별 상위 15개"
    echo
    echo "$RULES_TABLE"
    echo
    echo "> 지적 수가 곧 문제의 가짓수는 아니다 — 같은 규칙이 여러 파일에서 걸린 것이 대부분이라,"
    echo "> 규칙으로 묶으면 판단 단위가 몇 개로 줄어든다 (ssccops#233)."
  } >> "$GITHUB_STEP_SUMMARY"

  echo "--- 규칙별 상위 15개 ---"
  echo "$RULES_TABLE"
fi

# Quality Gate 실패로 이 스크립트를 실패시키지 않는다 — 위 주석 참고.
if [ "$QG_STATUS" != "OK" ]; then
  echo "::warning::Quality Gate 가 $QG_STATUS 다. 지금은 막지 않는다 (ssccops#231)."
fi
