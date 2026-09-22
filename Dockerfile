# 세 앱(admin · www · lms)을 한 Dockerfile로 만든다 (#653 · ssccops#471)
#
# `--build-arg APP=admin|www|lms` 하나로 어느 앱을 만들지 고른다. 앱마다 Dockerfile을 두지
# 않는 이유는 내용이 거의 같아서다 — 사본을 두면 Node 버전·pnpm 단계를 한 곳만 고치고 두 곳을
# 잊는다(레포의 «둘 이상이 같은 것을 쓰면 한 곳에» 규칙과 같은 판단).
#
# **이 파일은 Cloudflare(dev)·Vercel(prod) 배포와 무관하다.** 두 플랫폼은 각자의 빌드를 돌고
# 이 파일을 읽지 않는다 — 컨테이너로 띄우는 자리(동아리방 Coolify)만 쓴다.
#
# `NEXT_PUBLIC_*`은 **빌드 타임에 인라인**되므로 런타임 env로는 늦다. 그래서 빌드 인자로 받아
# `ENV`로 올린다(아래) — 값을 바꾸면 **다시 빌드해야** 반영된다.

# ── 1. 공통 바탕 ───────────────────────────────────────────────────────────────
# Node 20은 CI의 NODE_VERSION과 같은 값이다. alpine인 것은 런타임 이미지를 작게 두기 위한
# 것이고, 이 레포는 네이티브 모듈(sharp 등)을 쓰지 않아 glibc가 필요 없다 — `next/image`
# 최적화 대신 <img> + 직접 URL이라는 ADR-0030의 플랫폼 중립 규칙이 그것을 보장한다.
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# ── 2. prune — 이 앱이 쓰는 워크스페이스만 남긴다 ──────────────────────────────
# `out/json`(package.json + 락파일)과 `out/full`(소스)로 갈라 주므로, 의존성 설치 레이어가
# 소스 변경에 무효화되지 않는다. turbo는 devDependency지만 설치 전에 필요하므로 여기서만
# `pnpm dlx`로 받는다 — 버전은 package.json과 같은 값으로 고정한다(갈리면 prune 결과가 달라진다).
FROM base AS pruner
ARG APP
RUN test -n "$APP" || (echo "APP 빌드 인자가 필요하다 (admin|www|lms)" >&2; exit 1)
COPY . .
RUN pnpm dlx turbo@2.5.8 prune "@ssccops/${APP}" --docker

# ── 3. 설치 · 빌드 ────────────────────────────────────────────────────────────
FROM base AS installer
ARG APP

COPY --from=pruner /repo/out/json/ ./
RUN pnpm install --frozen-lockfile

COPY --from=pruner /repo/out/full/ ./

# 화면·서비스워커가 읽는 값들. 앱마다 다르므로(오리진이 서로를 가리킨다) 배포 쪽에서 앱별로 넣는다.
# 비워 두면 각 앱의 `.env.example`에 적힌 «비었을 때의 동작»으로 떨어진다 — 빌드는 막지 않는다.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_PUBLIC_FORM_ORIGIN=""
ARG NEXT_PUBLIC_LMS_ORIGIN=""
ARG NEXT_PUBLIC_ADMIN_ORIGIN=""
ARG NEXT_PUBLIC_DEPLOY_ENV=""
ARG NEXT_PUBLIC_MEMBER_HARD_DELETE=""
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=""
ARG NEXT_PUBLIC_NAVER_SITE_VERIFICATION=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_PUBLIC_FORM_ORIGIN=$NEXT_PUBLIC_PUBLIC_FORM_ORIGIN \
    NEXT_PUBLIC_LMS_ORIGIN=$NEXT_PUBLIC_LMS_ORIGIN \
    NEXT_PUBLIC_ADMIN_ORIGIN=$NEXT_PUBLIC_ADMIN_ORIGIN \
    NEXT_PUBLIC_DEPLOY_ENV=$NEXT_PUBLIC_DEPLOY_ENV \
    NEXT_PUBLIC_MEMBER_HARD_DELETE=$NEXT_PUBLIC_MEMBER_HARD_DELETE \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_NAVER_SITE_VERIFICATION=$NEXT_PUBLIC_NAVER_SITE_VERIFICATION

# 빌드된 커밋. `.git`을 이미지에 넣지 않으므로(.dockerignore) `next.config.ts`의 git 경로는
# 여기서 답을 못 낸다 — Coolify가 주는 `SOURCE_COMMIT`을 그 해석 순서에 더해 두었다.
# 없으면 `/version`의 sha가 "unknown"이고 배포 이력이 `unverified`로 남을 뿐, 빌드는 산다.
ARG SOURCE_COMMIT=""
ENV SOURCE_COMMIT=$SOURCE_COMMIT

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter="@ssccops/${APP}"

# ── 4. 런타임 — standalone 산출물만 ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 헬스체크용 curl (#655). alpine에는 `wget`만 있는데 **Coolify의 헬스체크는 `curl`로 돈다** —
# 없으면 매 검사가 실패해 컨테이너가 unhealthy로 종료된다(2026-09-23 admin 배포에서 실측).
# 약 4 MB이고, 아래 HEALTHCHECK도 같은 바이너리를 쓴다.
RUN apk add --no-cache curl

# 비루트로 돈다. standalone은 자기 파일만 읽으므로 쓰기 권한이 필요 없다.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -G nodejs -S nextjs

ARG APP
ENV APP=$APP

# standalone은 모노레포 구조를 그대로 옮긴다 — `apps/{APP}/server.js`가 들어온다.
# static·public은 추적 대상이 아니라 따로 복사한다(Next 문서와 같은 순서).
COPY --from=installer --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=installer --chown=nextjs:nodejs /repo/apps/${APP}/public ./apps/${APP}/public

USER nextjs
EXPOSE 3000

# «이 컨테이너가 사는가»의 기준을 이미지 안에 둔다 — 배포 플랫폼이 자기 검사를 덮어써도(Coolify가
# 그렇게 한다) 이미지만으로 돌려 볼 때 같은 판정이 나온다. `/version`은 세 앱이 모두 가진 라우트다.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5   CMD curl -fsS "http://127.0.0.1:${PORT}/version" > /dev/null || exit 1

# `CMD`의 exec 형식에는 ARG·ENV가 펼쳐지지 않아 셸을 거친다. `exec`을 붙여 노드가 PID 1이
# 되게 한다 — 그러지 않으면 셸이 PID 1이 되어 SIGTERM이 노드에 닿지 않고 배포 교체가 10초
# 타임아웃을 기다린다.
CMD ["sh", "-c", "exec node apps/$APP/server.js"]
