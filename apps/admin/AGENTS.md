<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/admin — 운영관리 어드민

**이 파일이 admin 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통(검증·FSD·봉투·데이터 표기·문구·배포·PR)은 루트에 있다.

운영진이 쓰는 앱이다 — 회원·업무·하위 업무·회의·승인함·폼·행사·학술·공유 링크·OAuth 동의. 로그인 없이 열리는 화면은 공유 링크 착지 `/s/{token}` 하나뿐이고, 나머지는 전부 회원이어야 한다. 부원에게 나가는 링크가 이 도메인을 가리키면 안 된다 — 공개 폼 `/f/{formId}`(ssccops#214)와 가입 안내(www #451 · lms #453)가 그 이유로 빠져나갔다.

## 라우트 그룹

`(admin)`(운영 화면 — 사이드바 셸) · `(auth)`(로그인·가입·OAuth 동의 — 셸 없는 단독 레이아웃) · `(public)`(공유 링크 착지 `/s/{token}` 하나) · `auth/`(OAuth 콜백 라우트 핸들러) · `version/`(배포 이력 확인용 `GET /version`).

어드민에 남은 공개 폼 관련은 폼 상세의 **링크 복사**뿐이며 그 주소는 `publicFormUrl()`이 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`으로 만든다.

## 서버 연동 — 이 앱만 리다이렉트까지 끝낸다

- `shared/lib/api/client.ts`의 `apiFetch`는 봉투를 벗기는 것에 더해 **401(재로그인)·403 `SIGNUP_REQUIRED`(가입 화면)의 리다이렉트까지 끝낸다** — 화면이 다시 다루지 않는다. 남은 403은 화면이 문구로 안내한다. www·lms의 클라이언트는 이 로직이 없다(밀어낼 로그인 화면이 없다 — `@ssccops/auth` 주석).
- 커서 페이징 목록은 `apiFetchList`(배열 + `page`), 파일 업로드는 `apiUpload`.
- 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — `syncSessionOnForbidden`으로 세션을 다시 맞춘다.

## 인증 · 권한

- 세션 갱신·가드는 `src/middleware.ts` → `@ssccops/auth`의 `updateSession`에 **`SessionGuard`를 주는 유일한 앱**이다(`shared/lib/supabase/guard.ts`). 미인증은 `/login?next=`로 밀어내고, `PUBLIC_PATHS`에 `/s`가 있는 것은 크롤러가 정의상 미인증이라 리다이렉트되면 `generateMetadata`가 아예 돌지 않기 때문이다(ssccops#200). 이 목록은 admin의 값이지 공유 규칙이 아니다.
- 권한은 서버가 `GET /v1/auth/session`의 `member.capabilities` 배열로 내려준다. 화면이 권한을 묻는 **유일한 통로는 `useCan(CAPABILITY.X)`**다.
- **역할 이름·서열(`indct_seqno`)·권한 트리 펼침을 웹에서 다시 계산하지 않는다.** 판정 규칙은 서버 `AuthorityPolicy` 한 곳에만 있고 웹은 배열에 코드가 있는지만 본다(규칙이 두 벌이 되어 실제 버그가 났던 전례가 있다).
- **묶음 코드로 판정하지 않는다.** 어떤 역할에 `FORM_WRITE`만 직접 부여하면 그 회원의 배열에 `FORM_MANAGE`는 없다 — 화면이 묶음 코드를 찾으면 서버가 허용하는 버튼을 감춘다.
- **조회 권한과 쓰기 권한이 갈린 자리가 있다**(서버 #101): `WORK_READ`/`WORK_MANAGE` · `MEETING_READ`/`MEETING_MANAGE` · `MEETING_AGENDA_WRITE` · `SUB_WORK_TYPE_READ`/`_MANAGE`. 자리마다 **서버가 그 엔드포인트에 요구하는 코드**를 본다. 예: 회의 상세에서 개회·종료·취소는 `MEETING_MANAGE`지만 안건 추가·수정·철회는 `MEETING_AGENDA_WRITE`다(국원도 갖는다).
- **승인·투표 자격도 권한이다**(서버 #123). 투표는 `useCan(CAPABILITY.APPROVAL_VOTE)`로 사전 잠금하고, 승인·반려는 유형마다 요구 결재 권한이 달라 서버가 건별로 내려주는 `canApprove`·`canReject`를 쓴다. 승인자 **표시명**은 응답의 `authorizerAuthorityName`이고 유형 폼의 선택지는 `GET /v1/sub-work-types/authorizer-authorities`가 준다 — 코드 → 이름 사전을 웹에 다시 만들지 말 것.
- **이동은 감추고, 동작은 잠근다.** 사이드바 메뉴는 권한이 없으면 감추고(갈 수 없는 곳을 목차에 남기면 목차 전체를 믿을 수 없다), 화면 안의 버튼은 남긴 채 잠그고 사유를 `title`로 붙인다(이미 그 화면을 보고 있는 사람에게서 버튼만 소리 없이 사라지면 기능이 없어진 것인지 권한 문제인지 알 수 없다).

## 주요 결정 (왜 그렇게 돼 있는가)

- **버튼은 '지금 할 수 있는 전이' 하나만 그린다.** 두 단계를 건너뛰려고 요청을 이어 보내면 앞만 성공한 채 끊겼을 때 사용자가 누른 적 없는 상태로 남는다. 스테퍼가 가리키는 단계와 버튼이 언제나 같은 것을 말하게 한다.
- **권한과 선행 조건을 나눠서 본다.** 서버가 주는 `canApprove`·`canReject`는 **권한만** 답한다. 누를 수 있는지는 업무 상태·완료 점검 목록·정족수로 화면이 따로 판단한다 — 섞으면 정족수가 모자란 승인자와 권한이 아예 없는 사람이 같은 대접을 받아 승인자에게도 버튼이 사라진다.
- **정족수 투표는 하위 업무 상세에서 한다**(#82). 승인함(`/approvals`)은 서버가 `WORK_MANAGE`로 좁혔는데 투표 자격은 그보다 넓어, 국원은 자격만 갖고 투표할 화면이 없었다. 두 화면의 찬반 버튼은 같은 훅(`useApprovalDecisions`)을 쓴다. **정족수는 승인자를 대체하지 않는다** — 표가 다 모여도 완료는 승인자가 누르고, 승인자라도 정족수 전에는 누를 수 없다.
- **부분 갱신과 재조회를 가른다.** 응답이 바뀐 값을 **다시 세어** 주면 그것만 갈아 끼우고(완료 점검 체크), 화면이 그리는 다른 값까지 함께 움직이면 통째로 다시 부른다(상태 전이·투표). 전이 응답으로 부분 갱신하면 반려 직후 화면에 이전 반려 사유가 남는다.
- **서버의 PATCH는 대개 전체 교체다.** 선택 입력도 생략하면 지운 것으로 본다 — 화면은 현재 값을 전부 입력란에 채워 보여주고 부분 입력 폼을 만들지 않는다.
- **단건 수정은 등록 화면을 재사용하지 않고 `views/<slice>-edit`로 따로 둔다.** 등록 화면은 여러 종류를 한 상태 기계로 다뤄, 수정을 얹으려면 그 분기 속에 '종류 고정·기존 값 불러오기·제출 대상 교체'를 끼워 넣어야 한다. 상세 조회가 `ready`가 되기 전에는 폼을 마운트하지 않는다 — 그러면 `useState` 초깃값이 곧 폼 초깃값이라 동기화용 `useEffect`가 필요 없다.
- **업무·하위 업무 수정 화면에서 담당자를 바꿀 수 있다 — 등록과 같은 선택 UI다**(#435 · ssccops#333). 셀렉트는 `features/member`의 `AssignableMemberSelect` 한 벌이고 잠금 판정은 `isAssignablePick`·`assignableBlockReason`이 한다 — 화면마다 복사하지 않는다. 기본값은 현재 담당자, 후보 조회 실패면 저장 버튼을 잠근다. 현재 담당자가 후보에서 빠졌으면(탈퇴·제명) «현재: 이름»으로 남겨 두고 저장은 막지 않는다 — 거절은 서버가 하며 그 코드는 `OWNER_NOT_ACTIVE_MEMBER`라는 이름과 달리 **400 `VALIDATION_FAILED`**라 전용 오류 매핑이 없다.
- **하위 업무 유형은 수정 화면에서 바꿀 수 없다.** 바뀌면 승인 필요 여부·승인자·정족수·완료 점검 항목이 통째로 달라지는데 그 값들은 등록 시점에 이미 복사돼 있고(소급 금지) 재지정을 반영할 방법이 없다. 서버 요청도 이 값을 받지 않는다.
- **화면에 없는 입력란은 만들지 않는다.** 서버가 받지 않는 값(하위 업무 유형의 기준 금액 등)에 입력란만 두면 사용자가 넣은 값이 저장 없이 사라진다.
- **끌 수 있는 기준정보는 꺼진 것도 관리 목록에 싣는다**(취소선). 안 그러면 끈 것을 되돌릴 길이 없다. 반대로 **등록 폼의 선택지에는 켜진 것만** 싣는다 — 목록에 있던 것을 골랐을 뿐인데 400이 나면 사용자는 이유를 알 수 없다.
- **목록은 커서 페이징이라 '더 보기'가 붙는다.** 페이지 번호가 없으므로 페이지네이터를 그리지 않는다.
- **행사 신청의 명단 등록 여부는 서버가 준다**(#422 · ssccops#307). `GET /v1/events/{id}/applications` 행은 `{ application, participant: {eventPtcpId, ptcpSttsCd} | null }` 봉투이고 웹은 `participant`가 있으면 배지 + «명단에서 보기», 없으면 확정/대기 버튼을 그린다. 명단은 상태 필터가 걸린 채 조회되어 웹이 스스로 판정할 수 없다 — 판정을 웹에서 다시 만들지 말 것. 등록·전이 뒤에는 명단·신청 목록·행사 상세를 **함께** 다시 부른다. 참가 상태(명단)와 응답 상태(심사)는 다른 축이라 등록해도 «승인»은 그대로다.
- **정원(`ptcpLmtCnt`)이 없는 행사에는 «대기»로 보내는 조작을 그리지 않는다**(#423 · ssccops#308). 넘길 선이 없어 대기가 뜻을 잃는다. 서버는 거절하지 않고 화면이 감출 뿐이며, 이미 대기인 줄의 «확정으로 올리기»는 남긴다. 고를 수 있는 등록 상태는 `registerableStatuses(ptcpLmtCnt)`(`entities/event`) 한 곳이 정한다. 명단 표에는 «대기로» 전이 자체가 없다(계약은 대기→확정 · 확정→취소뿐).
- **OAuth 동의 화면(`/oauth/consent`)은 Supabase를 직접 부른다**(#430 · ssccops#315 · ADR-0026). Claude(MCP) 연결의 인가 요청은 ssccops-server가 아니라 Supabase OAuth 2.1 서버가 들고 있어, `entities/oauth-authorization`이 supabase-js `auth.oauth`(`getAuthorizationDetails` · `approveAuthorization` · `denyAuthorization`)를 감싼다 — `apiFetch` 봉투 규약이 아니다. 돌아갈 주소 필드는 **`redirect_url`**(`redirect_to`가 아니다). SDK는 승인·거절 응답으로 스스로 `window.location.assign`을 하므로 `skipBrowserRedirect: true`를 주고 화면이 이동한다. 클라이언트 이름·redirect 호스트·scope는 **감추지 않는다** — DCR을 켜면 아무나 클라이언트를 등록할 수 있어 이 화면이 방어선이다. 미가입 사용자에게는 «회원 가입 뒤에 사용할 수 있습니다» 한 줄만 보이고 **승인은 막지 않는다**(판정은 서버의 SIGNUP_REQUIRED 한 곳). Supabase 대시보드 Authorization Path에 적을 값이 `ROUTES.oauthConsent`다.
- **색을 화면에 직접 적지 않는다**(ssccops#226). 다크모드는 `dark:` 유틸리티가 아니라 **`globals.css`의 토큰 값을 갈아 끼우는 것**이다 — 화면 97개가 이미 `text-n500`·`border-line` 같은 이름을 쓰고 있어 변수만 바꾸면 전부 따라온다. `bg-black/5`·`bg-[#f9fafb]`처럼 뜻 없는 값을 쓰면 **그것만 다크에서 밝은 채로 남는다.**
  - 쓸 수 있는 이름: 면은 `bg`·`surface`·`fill`·`fill-soft`·`fill-strong`·`subtle`, 선은 `line`·`line-strong`·`hairline`·`hairline-strong`, 글자는 `ink`·`n300`·`n400`·`n500`, 강조·상태는 `accent(-strong/-soft)`·`danger(-strong)`·`success`·`amber(-soft)`, 모달 뒤는 `scrim`, **진한 면 위 글자는 `on-solid`**.
  - `--color-*: initial`로 **Tailwind 기본 팔레트를 지웠다.** `bg-red-50` 같은 이름은 클래스가 아예 생성되지 않아 색이 조용히 빠진다(달력의 승인 대기 막대가 실제로 그랬다).
  - `fill`·`hairline`·`scrim`은 값에 알파가 들어 있어 `bg-fill/50` 같은 알파 수정자는 쓸 수 없다.
  - 테마 선택은 `localStorage`이고 첫 페인트 전에 `layout.tsx`의 동기 스크립트(`THEME_INIT_SCRIPT`, `@ssccops/ui`)가 `<html data-theme>`에 박는다. **그 스크립트를 걷어내면 밝은 화면이 한 번 번쩍인다.**
- **반응형은 `lg`(1024px) 한 경계로만 가른다**(#85). 예전 `body { min-width: 1024px }` 값을 그대로 브레이크포인트로 삼았으므로 **`lg` 이상은 정의상 예전과 같은 화면**이다. 기본값을 모바일로, `lg:`를 데스크톱으로 쓰고, 기존 클래스를 지우는 대신 `lg:`를 덧붙인다.
  - 셸은 `lg` 미만에서 사이드바 대신 드로어를 쓴다(`_shell/mobile-nav.tsx`). 메뉴 목차·권한 판정은 `_shell/use-shell-nav.ts`, 마크업은 `_shell/nav-panel.tsx` **한 벌뿐이다** — 사이드바에만 메뉴를 더하면 드로어에서 빠진다. 브랜드 마크는 `@ssccops/ui`의 `BrandMark`(#449).
  - `GridTable`은 `lg` 미만에서 카드로 바뀐다. 열이 많으면 `mobileHide`, 제목 줄을 바꾸려면 `mobilePrimary`.
  - **입력란 글자는 좁은 화면에서 16px 아래로 내리지 않는다**(#105) — iOS Safari가 포커스 때 화면을 확대하고 되돌리지 않는다. `text-[16px] lg:text-[원래값]`. `shared/ui/field.tsx`의 `INPUT_BASE`·`SelectField`·`search-input.tsx`에 이미 걸려 있다.
  - **아직 전 화면이 대응된 것은 아니다** — 좁은 폭에서 깨지는 화면은 후속 이슈(ssccops#337 감사 보고서)로 남아 있다.

## 함정

- **`README.md`에는 PoC 시절 서술이 남아 있다**("API 미연동 PoC", zustand 시드). 목 스토어는 `features/approval/model/use-approval-actions.ts`(어디서도 쓰지 않는다)에만 잔재로 남아 있다 — 승인함은 `useApprovalDecisions`를 쓴다.
- **`shared/config/codes.ts`는 서버 표준코드와 함께 움직인다.** 공유 코드값은 `@ssccops/codes`를 재export 하고 admin 전용 70여 개는 여기 있다. 서버가 코드를 추가하면 여기도 더해야 하고, 표시명은 서버 시드와 글자까지 계약이다.
- **supabase-js `auth.oauth`의 `getAuthorizationDetails` 응답은 두 모양이다**(#430) — 동의가 필요하면 `authorization_id`·`client`·`redirect_uri`·`scope`, **이미 동의한 적이 있으면 `redirect_url` 하나뿐**이라 화면을 그리지 않고 그 주소로 보내야 한다. `in`으로 가르지 않고 `data.client.name`을 바로 읽으면 두 번째 연결부터 죽는다. 4xx는 전부 «요청이 유효하지 않습니다»(«다시 시도» 버튼을 두지 않는다), 401·`AuthSessionMissingError`만 로그인으로.
- **행사 참가자 명단의 회원 값은 `member`에 중첩이다**(#421). 서버 `EventParticipantResponse`는 `ResponseMemberSummary`를 `member`로 싣고 `rgtrMbrId`는 싣지 않는다. 변환기(`entities/event/api/event-participants.ts`)가 평면으로 읽으면 이름·학번이 전부 비어 보인다 — 값이 비면 서버 DTO에서 계약을 다시 확인한다. `entities/response`의 같은 모양 타입은 가져오지 않는다(entities 슬라이스끼리 참조 금지).
- **어드민 화면 왼쪽 메뉴 맨 아래에 버전이 보인다.** 값은 `next.config.ts`가 `package.json`에서 주입하므로 따로 넣을 것이 없다 — `.env`로 받지 않는 이유는 배포 설정에 넣는 것을 잊으면 조용히 비기 때문이다.
