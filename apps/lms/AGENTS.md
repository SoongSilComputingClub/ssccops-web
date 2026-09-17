<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/lms — 학술 공개 앱 (스터디 · 프로젝트 · 기획안)

**이 파일이 lms 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통은 루트에. 이 앱은 학술관리 담당 팀원의 영역이다 — 규칙의 출처는 대부분 코드 주석이며 여기는 그 목차다.

**전 화면이 로그인 필수인 부원용 앱이다**(#169). 스터디장·팀장은 자기 활동을 운영하고(`/studio/*` — 대시보드·회차 기록·출석·팀원), 일반 회원은 기획안을 내고 상태를 본다(`/proposals/new` · `/my/applications`). **참여(모집) 신청 화면은 없다** — 2026-08-28 확정으로 시스템 폼(www의 공개 폼)이 맡는다. 학술 공유 링크는 여기서 **발급**하고 착지는 www가 받는다(ADR-0017).

## 화면과 역할

- 첫 화면 `/`(#228): 스터디장은 `redirect`로 `/studio`를 지나가고, 남은 사람에게는 «무엇을 하러 왔는지» 고르는 카드 둘(기획안 제출·내 신청). 뷰 안에 역할 조건문을 흩지 않는다.
- 상단 바 목차는 `app/_shell/nav-links.ts` **한 벌**을 데스크톱·드로어가 함께 쓴다. 역할 필터는 `visibleNavLinks`(#224) — 근거는 `GET /v1/academic-programs?mine=leader`가 한 건이라도 주는가(`fetchIsAcademicLeader`, 루트 레이아웃이 서버에서 한 번). `leadrMbrId === 내 mbrId`를 웹에서 다시 계산하지 않는다 — 판정은 서버.
- 경로는 `shared/config/routes.ts`의 `ROUTES`로만. 어드민의 `/academic-programs` 계열과 주소가 겹치지 않는다(소스를 공유하지 않는다).

## 규칙

- **조회는 서버 컴포넌트로 그린다**(www와 같은 규약 · #131·#172). `features/*/model/load-*.ts`가 SSR 로더이고 훅이 아니다 — 쿠키의 세션을 서버에서 읽어 토큰을 브라우저에 싣지 않고, 읽기 전용 화면에 상태 기계를 들이지 않는다. **브라우저에서 저장·제출해야 하는 것만** `shared/api/browser-client.ts`를 탄다: 기획안 자동 저장·제출(`use-proposal-form.ts`), 재제출, 회차 기록·출석, 공유 링크 발급·폐기.
- **리다이렉트를 하지 않는다.** `shared/api/client.ts`는 www에서 옮겨 온 것에 커서 페이징 봉투(`apiFetchList` — 어드민의 401 갱신·재로그인 리다이렉트는 함께 옮기지 않았다)만 더했다. 401·403은 오류로 올려 보내고 화면이 안내로 그린다. 미들웨어는 갱신기(가드 없음)이고 매처는 정적 자산·`auth/`·`version`만 뺀 전 경로다.
- **미가입(`SIGNUP_REQUIRED`) 안내는 `features/signup`의 `SignupRequiredNotice`다**(#453) — www의 `SignupStep`(기존 회원 연결 포함)을 가져와 같은 자리에서 가입하고 `router.refresh()`. 어드민 `/signup`으로 보내던 `signupUrl()`·`NEXT_PUBLIC_ADMIN_ORIGIN`은 없다. 문구는 자리마다 다르므로 제목·설명은 부모가 준다(`ProgramSignupNotice`는 그 래퍼).
- **로딩 완료 전에는 폼을 마운트하지 않는다** — 그러면 `useState` 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 없다(admin의 수정 화면과 같은 규칙).
- **검증은 `@ssccops/form-renderer`가 한다.** 필수·정규식·최대 선택 수·분기를 화면에서 한 줄이라도 다시 판정하면 서버 `ResponseAnswerValidator`와 맞춰 둔 규칙이 두 벌이 된다. 자동 저장 경로에는 검증을 걸지 않는다(작성 중 필수가 빈 것이 정상) — '다음'과 '제출'에서만.
- **기획안 자동 저장**(#185): 공개 폼의 초안 경로(`GET`·`PUT /v1/forms/{formId}/responses/draft`)를 쓴다. 저장·제출은 한 프라미스 체인에 줄 세우고, «더러움» 플래그 대신 보낼 본문의 직렬화 문자열과 마지막 저장 성공 본문을 비교하며, 보내는 순간의 본문은 최신 스냅샷에서 읽는다(디바운스 700ms · 재시도 1.5/3/6/12s). 재제출(#171)은 전체 본문 재전송이라 초안이 없다.
- **파일 형식·용량을 웹에서 판정하지 않는다**(출석 인증사진 #128) — 허용 목록과 상한은 서버에만 있고, 업로드는 presigned PUT이며 최종 판정은 업로드 응답 코드로 안내한다.
- **부분 갱신과 재조회를 가른다**(admin과 같은 규칙) — 출석은 해당 회차만 부분 갱신, 전이는 재조회.
- **화면 문구**는 루트 규칙 + #343(lms 전수 확인으로 세운 것): 대시 문장은 마침표 없음, 보조용언 붙여쓰기(`시도해주세요`).
- 오류 코드 → 문구는 `entities/*/api/error-codes.ts`·`features/*/model/*-error.ts`가 맡고 화면은 `ApiError.code`로만 분기한다(#29).

## 공유 링크 발급 (`entities/share/api/share-links.ts`)

서버는 URL이 아니라 **토큰**을 주고 조립은 웹이 한다. **이 앱이 발급하는 대상은 전부 www가 받는다** — 갈래가 하나뿐이고 그 사실을 타입(`ShareTargetOf<"www">`)으로 적어 두었다. 오리진은 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`(www). 익명 미리보기는 읽지 않는다(착지 화면의 일). 토큰은 미리보기 권한까지다(ADR-0016).

## 함정

- **어드민이 멀쩡한 것은 근거가 되지 않는다** — 공유 패키지 클래스가 빠지는 사고(#316)는 앱이 작은 www·lms에서 먼저 드러난다.
- 다크모드·테마 토글은 `@ssccops/ui`의 `useTheme`·`ThemeToggle`(#341)이고 색은 토큰 이름으로만(`text-on-solid` 등 — admin과 같은 팔레트).
- 반응형은 `lg` 하나(admin과 같다). 입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다(#105).
- `shared/config/codes.ts`는 `@ssccops/codes`를 재export 한다 — 표시명은 서버 시드와 글자까지 계약.
