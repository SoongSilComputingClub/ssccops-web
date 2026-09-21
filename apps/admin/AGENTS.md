<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/admin — 운영관리 어드민

**이 파일이 admin 규칙의 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). 세 앱 공통(검증·FSD·봉투·데이터 표기·문구·배포·PR)은 루트에 있다.

운영진이 쓰는 앱이다 — 회원·업무·하위 업무·회의·승인함·폼·행사·학술·콘텐츠·공유 링크·OAuth 동의. 로그인 없이 열리는 화면은 공유 링크 착지 `/s/{token}` 하나뿐이고, 나머지는 전부 회원이어야 한다. 부원에게 나가는 링크가 이 도메인을 가리키면 안 된다 — 공개 폼 `/f/{formId}`(ssccops#214)와 가입 안내(www #451 · lms #453)가 그 이유로 빠져나갔다.

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
- **사이드바·드로어 발치의 «홍보 사이트 ↗»·«학술 LMS ↗»는 `shared/config/site-links.ts`다**(#577 · ssccops#430). www는 `NEXT_PUBLIC_PUBLIC_FORM_ORIGIN`(ADR-0017의 재사용 — 이름의 빚은 `routes.ts` 주석), lms는 `NEXT_PUBLIC_LMS_ORIGIN`이고 비면 그 항목이 없다. `nav.ts`의 목차가 아니라 따로인 것은 외부 앱에는 `isActive`도 권한 판정도 없어서이며, `NavRow`(라우터 이동)가 아니라 `<a>`다. 새 env 없음.

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
- **폼 목록의 접수 상태 칩은 다중 선택이다**(#544 · ssccops#408 · 서버 #492). 기본은 작성 중 + 접수 예정 + 접수 중(마감·기간 종료만 빠진다), «전체»는 다섯을 다 켠 것과 같고 그때는 파라미터를 비워 서버가 전체 경로로 간다. 주소는 `?receiptStatuses=DRAFT,ACCEPTING`(`ALL` = 전체)이고 옛 `?receiptStatus=X`는 값 하나짜리 집합으로 읽는다. 마지막 칩 하나는 끄지 않는다.
- **시스템 폼(`sysYn`)은 폼 목록에서 빠지고 `/forms/system`(`views/system-form-list`)이 싼다**(#553 · ssccops#415 → #588 · ssccops#436 · ADR-0044). 시스템 폼은 «코드가 **가리키는** 폼»이고 둘이다 — 계약이 있는 기획안(`PROPOSAL`)과 계약이 없는 신입회원 모집(`RECRUIT`). 표는 `entities/form/model/system-form-code.ts`(`SYSTEM_FORM_SLOTS`) 한 곳이고 «시스템 폼» 페이지는 그 표대로 **고정 두 줄**을 세운다 — 자리에 폼이 있으면 카드, 모집 자리가 비면 «지정된 모집 폼이 없습니다 — 폼 상세에서 «신입회원 모집 폼으로 지정»»(학기 초에 지정을 잊으면 `/join`에 «지원하기»가 없는데 나열 방식으로는 그 사실이 안 보였다). 표에 없는 코드는 «그 밖» 절에 남긴다. 판정은 서버의 `sysYn`·`sysFormCd`이지 라벨·제목이 아니고, 서버 필터 파라미터는 더하지 않는다(`GET /v1/forms` 전량을 화면이 가른다). 시스템 폼 카드에는 복제·삭제가 없다.
  - **응답 받는 곳은 코드로 가른다.** 기획안(`sysFormCd === PROPOSAL`)만 상세가 «공개 링크» 카드 대신 «응답 받는 곳»을 그리고(`publicUrl`도 `null`), `NEXT_PUBLIC_LMS_ORIGIN`(`shared/config/lms-routes.ts`)이 있을 때만 LMS 제출 화면 버튼을 둔다 — 비면 문구만. 모집 지정 폼은 **공개 링크 카드가 그대로다** — www `/f/{key}`가 곧 지원서다(#553에서는 `sysYn`이 조건이었는데 #588에서 좁혔다).
  - **신입회원 모집 폼 지정은 폼 상세의 한 줄이다**(`PUT /v1/forms/system/RECRUIT {formId}` · `entities/form` `designateSystemForm` · `features/form` `useDesignateSystemForm`·`FormDesignateSheet`). 시스템 폼이 아닌 폼에만 그리고(기획안은 서버가 409 `SYSTEM_FORM_ALREADY_DESIGNATED`), 권한은 접수 상태 전이와 같은 `FORM_STATUS_CHANGE`(서버가 그 코드로 건다 — 잠긴 사유도 그 이름). 확인 시트가 **이전 지정 폼의 지정이 풀려 일반 폼이 된다**는 것을 말하고, 성공 토스트가 `prevFormId`로 «폼 #N의 지정은 풀렸습니다»를 덧붙인다. 성공 뒤는 재조회(배지·삭제 잠금·카드가 함께 바뀐다). 지정된 폼의 배지는 «신입회원 모집(지정)»(`RECRUIT_FORM_BADGE` · `systemFormBadge(sysFormCd)`) — «시스템 폼»이라고만 쓰면 기획안처럼 문항이 잠기고 LMS에서 받는 폼으로 읽힌다.
  - 행사 분류 «모집»(`RECRUIT`)은 시드에 남되 쓰지 않는다 — 분류 관리 화면이 이름 옆에 «쓰지 않음 — 신입 모집은 지정 폼(ADR-0044)»(`entities/event` `UNUSED_EVENT_CLSF_NOTE` · 코드 매핑)을 붙일 뿐 수정·삭제는 막지 않는다(지난 행사가 가리켜 삭제는 서버가 409).
- **계약이 있는 시스템 폼의 문항 구조는 편집기가 잠근다**(#554 · ssccops#416 · 서버 #498 → 좁힘 #563 · ssccops#421 · 서버 #505 → «계약이 있는»으로 좁힘 #588 · ADR-0044 · 서버 #520). 잠금 조건은 `sysYn`이 아니라 **`sysYn && systemRequiredQitemIds.length > 0`**(훅 `useFormEditor`의 `questionsLocked` — 편집기·버전 안내·배너가 그 값 하나를 본다). 기획안은 코드가 답을 읽어 계약이 있고 잠기지만 신입회원 모집 지정 폼은 코드가 가리키기만 해 문항이 자유다 — 서버도 같은 기준으로 409를 낸다. 잠금 문구는 «시스템 폼이라서»가 아니라 «코드가 답을 읽는 폼이라»를 이유로 든다(`SYSTEM_FORM_QUESTIONS_LOCKED*`). `QitemComposer`의 `questionsLocked`가 문항 추가·삭제·이동·구조 속성(유형·필수·선택지·분기·형식 검증·최대 선택 수)과 페이지 추가·삭제·순서를 잠그고(문항의 `pageSeq`가 페이지 index라 페이지 구조가 곧 문항이다), 펼친 카드(`LockedQitemBody`)는 **질문 문구·문항 설명 두 칸만 입력란**이고 나머지는 값만 그린다 — 이관이 읽는 것은 답이지 문구가 아니라 운영진이 학기마다 안내를 다듬는 자리를 막지 않는다. 제목·페이지 설명·접수 기간·라벨·다중 응답도 열려 있다. 서버는 구조 속성이 바뀐 저장만 409 `SYSTEM_FORM_QUESTIONS_LOCKED`로 거절하므로 설명만 고친 자동 저장(구성을 그대로 되보내는 전체 PATCH)은 통과하고, 409는 저장 상태 표시줄이 «저장 실패 — 코드가 답을 읽는 폼이라 문항이 잠겨 있습니다»로 받는다. 삭제 잠금(`SYSTEM_FORM_IMMUTABLE`)은 계약과 무관하게 **모든 시스템 폼**이다 — 모집 폼도 지정된 동안은 못 지운다. `systemRequiredQitemIds`의 삭제 잠금은 이 안에 들어가지만 서버가 아직 내리므로 코드 경로는 남긴다.
- **목록은 커서 페이징이라 '더 보기'가 붙는다.** 페이지 번호가 없으므로 페이지네이터를 그리지 않는다.
- **행사 목록은 카드·리스트 두 보기다**(#569 · ssccops#424). 같은 `events`를 `EventCard`와 `EventTable`(`GridTable` — lg 미만은 카드로 접힘)로 그리고 필터 줄의 `Segmented`로 오간다. 선택은 URL이 아니라 `localStorage`(`views/event-list/model/use-event-view-mode.ts` · `useSyncExternalStore`, 서버 스냅샷은 카드)에 기억한다 — «무엇을 보나»(필터)는 링크로 공유할 값이지만 «어떻게 보나»는 사람마다 달라서다. 표에는 행 클릭을 걸지 않는다(셀 안 버튼과 겹친다)와 복제가 없다(두 단계 확인이 한 줄에 안 들어간다).
- **참가자 명단 CSV**(#545 · ssccops#409)는 응답 CSV(ssccops#223)와 같은 모양 — 누르는 순간 명단을 **다시 조회**해(켜 둔 상태 필터 그대로) 순번·이름·학번·참가 상태·등록 일시만 담는다(`features/event/model/participant-csv.ts` · `use-participant-csv-export.ts`). 연락처는 명단 API에 없어 싣지 않는다. 내려받기는 조회 권한이면 되고 쓰기 잠금과 무관하다.
- **운영 건 첨부**(#546 · ssccops#410 · 서버 #493)는 업무·하위 업무·회의 상세가 같은 `features/attachment` `AttachmentSection`을 그린다 — 대상은 세 화면이 다 가진 `operationId` 하나(`/v1/operations/{operationId}/attachments`). 흐름은 콘텐츠 갤러리와 같다(발급 → 브라우저 PUT → 실패면 DELETE로 치움), 목록은 부분 갱신. 권한은 화면이 넘긴다 — 업무 `canManage`(WORK_MANAGE) · 하위 업무 `canActOnOwnerTasks`(담당자 또는 WORK_MANAGE) · 회의 `canManage`(MEETING_MANAGE); 내려받기는 보는 사람 누구나. **내려받기는 서명 URL을 JSON으로 받아 `window.location.assign`** — 인증 경로라 `<a href>`로는 Bearer를 못 붙인다. 형식 허용 목록은 서버 한 곳(응답 코드로 안내), 25MB는 왕복 없이 먼저 거른다.
- **행사 신청의 명단 등록 여부는 서버가 준다**(#422 · ssccops#307). `GET /v1/events/{id}/applications` 행은 `{ application, participant: {eventPtcpId, ptcpSttsCd} | null }` 봉투이고 웹은 `participant`가 있으면 배지 + «명단에서 보기», 없으면 확정/대기 버튼을 그린다. 명단은 상태 필터가 걸린 채 조회되어 웹이 스스로 판정할 수 없다 — 판정을 웹에서 다시 만들지 말 것. 등록·전이 뒤에는 명단·신청 목록·행사 상세를 **함께** 다시 부른다. 참가 상태(명단)와 응답 상태(심사)는 다른 축이라 등록해도 «승인»은 그대로다.
- **정원(`ptcpLmtCnt`)이 없는 행사에는 «대기»로 보내는 조작을 그리지 않는다**(#423 · ssccops#308). 넘길 선이 없어 대기가 뜻을 잃는다. 서버는 거절하지 않고 화면이 감출 뿐이며, 이미 대기인 줄의 «확정으로 올리기»는 남긴다. 고를 수 있는 등록 상태는 `registerableStatuses(ptcpLmtCnt)`(`entities/event`) 한 곳이 정한다. 명단 표에는 «대기로» 전이 자체가 없다(계약은 대기→확정 · 확정→취소뿐).
- **OAuth 동의 화면(`/oauth/consent`)은 Supabase를 직접 부른다**(#430 · ssccops#315 · ADR-0026). Claude(MCP) 연결의 인가 요청은 ssccops-server가 아니라 Supabase OAuth 2.1 서버가 들고 있어, `entities/oauth-authorization`이 supabase-js `auth.oauth`(`getAuthorizationDetails` · `approveAuthorization` · `denyAuthorization`)를 감싼다 — `apiFetch` 봉투 규약이 아니다. 돌아갈 주소 필드는 **`redirect_url`**(`redirect_to`가 아니다). SDK는 승인·거절 응답으로 스스로 `window.location.assign`을 하므로 `skipBrowserRedirect: true`를 주고 화면이 이동한다. 클라이언트 이름·redirect 호스트·scope는 **감추지 않는다** — DCR을 켜면 아무나 클라이언트를 등록할 수 있어 이 화면이 방어선이다. 미가입 사용자에게는 «회원 가입 뒤에 사용할 수 있습니다» 한 줄만 보이고 **승인은 막지 않는다**(판정은 서버의 SIGNUP_REQUIRED 한 곳). Supabase 대시보드 Authorization Path에 적을 값이 `ROUTES.oauthConsent`다.
- **색을 화면에 직접 적지 않는다**(ssccops#226). 다크모드는 `dark:` 유틸리티가 아니라 **`globals.css`의 토큰 값을 갈아 끼우는 것**이다 — 화면 97개가 이미 `text-n500`·`border-line` 같은 이름을 쓰고 있어 변수만 바꾸면 전부 따라온다. `bg-black/5`·`bg-[#f9fafb]`처럼 뜻 없는 값을 쓰면 **그것만 다크에서 밝은 채로 남는다.**
  - 쓸 수 있는 이름: 면은 `bg`·`surface`·`fill`·`fill-soft`·`fill-strong`·`subtle`, 선은 `line`·`line-strong`·`hairline`·`hairline-strong`, 글자는 `ink`·`n300`·`n400`·`n500`, 강조·상태는 `accent(-strong/-soft)`·`danger(-strong)`·`success`·`amber(-soft)`, 모달 뒤는 `scrim`, **진한 면 위 글자는 `on-solid`**.
  - `--color-*: initial`로 **Tailwind 기본 팔레트를 지웠다.** `bg-red-50` 같은 이름은 클래스가 아예 생성되지 않아 색이 조용히 빠진다(달력의 승인 대기 막대가 실제로 그랬다).
  - `fill`·`hairline`·`scrim`은 값에 알파가 들어 있어 `bg-fill/50` 같은 알파 수정자는 쓸 수 없다.
  - 테마 선택은 `localStorage`이고 첫 페인트 전에 `layout.tsx`의 동기 스크립트(`THEME_INIT_SCRIPT`, `@ssccops/ui`)가 `<html data-theme>`에 박는다. **그 스크립트를 걷어내면 밝은 화면이 한 번 번쩍인다.**
- **콘텐츠(페이지·포스트 · #521 · ssccops#383 · ADR-0038)는 행사 화면의 부품을 그대로 쓴다.** 본문 Markdown 편집기(편집/미리보기·이미지 첨부·글자 수)는 행사 폼에서 `shared/ui/markdown-editor.tsx`(`MarkdownEditor`·`ImagePickButton`·`insertImageMarkdown`)로 올려 행사·페이지·포스트 셋이 한 벌을 쓴다. **페이지·포스트는 `flavor="markdoc"`**(ADR-0039 · #532) — 미리보기가 `@ssccops/ui` `ContentMarkdoc`(www와 같은 렌더러)이고, 편집칸 위에 태그 삽입 버튼 줄(`CONTENT_TAG_SNIPPETS` — 안내 상자·카드·단계·FAQ·연혁)이 서며, 미리보기 아래에 검증 오류(모르는 태그·닫히지 않은 태그 · `markdocErrors`)가 줄 번호와 함께 뜬다. 저장 전 `bodyError`가 같은 검증을 돌려 첫 오류를 칸 아래에 둔다. 행사 폼은 `markdown`(react-markdown) 그대로 — lms와 공유하고 레이아웃 태그가 필요 없다 — features 슬라이스끼리는 참조할 수 없고, 사본을 두면 «미리보기는 맞는데 실제가 다른» 상태가 두 곳에서 따로 생긴다. 이미지 업로드 흐름(확장자·크기로 발급 → 발급 응답의 `contentType`으로 R2 PUT)·저장 훅 골격(`inFlightRef`·문구 반환)·단건 조회 상태(`not-found` 분리)도 행사와 같은 모양이다. 서버 계약은 서버 PR #480 «API 계약 › 어드민»이 정본이고 `entities/content/api`가 응답 모양을 아는 유일한 곳이다.
  - **페이지 탭은 서버 목록이 아니라 카탈로그다**(#534 · ssccops#392). www 라우트 표(`@ssccops/content` `CONTENT_PAGES`)의 자리마다 «없음/초안/게시»를 보이고(`views/content-list/ui/page-catalog.tsx` · `useContentCatalog`가 서버 페이지 전부를 슬러그로 짝지운다), 누르면 편집 — 없으면 그 슬러그로 만들기 화면(`?slug=` 필수 · 첫 저장이 생성). **«페이지 만들기» 버튼·슬러그 입력란은 없다** — 페이지 구성은 FE 라우트와 함께 가는 정형 구조라 새 페이지 종류는 코드(패키지 표 + www 라우트)가 정하고 홍보국은 자리를 열어 쓴다. 폼의 슬러그는 표시만(바꾸면 라우트에서 떨어져 나간다). 예외는 기수 운영진 `operators-{n}`(패턴 · «기수 페이지 열기»에 숫자 하나). 서버에 있지만 표에 없는 페이지는 «표에 없는 페이지» 절에 — 숨기지 않되 «어디에도 나타나지 않습니다»를 붙인다(서버·MCP는 슬러그를 자유롭게 받는다 — 허용 목록을 서버에 두면 서버가 www 라우트를 알게 된다). 포스트 탭은 그대로 서버 목록·자유 생성.
  - **PATCH가 통째 교체다**(서버 F2). 페이지·포스트 저장 본문(`ContentPage/PostSaveRequest`)은 필드가 전부 필수이거나 생략 = 비움이라 부분 본문을 보낼 길이 없다 — 위 «서버의 PATCH는 대개 전체 교체다» 그대로이고, 폼은 현재 값을 전부 채워 보낸다. MCP `update_page/update_post`의 읽고-합치기는 서버 안의 일이다.
  - **표지(`coverFileId`)는 갤러리 안의 `fileId`만 된다.** 다른 값은 400 `COVER_NOT_IN_GALLERY`라 표지 입력란(주소)을 두지 않고 갤러리 카드의 «표지로»만으로 고른다. 고른 값은 저장 본문에 실려 PATCH로 가고(고른 즉시 서버에 가지 않는다), 갤러리에서 그 장을 지우면 서버가 표지도 비우므로 폼도 같은 규칙으로 비운다.
  - **갤러리 발급 = 갤러리에 한 장.** `POST …/images` 응답의 `fileId`가 곧 `file_rfrnc` 행이라 업로드 완료 확인 API가 없다(서버가 기각). PUT이 실패하면 훅이 그 `fileId`를 곧바로 DELETE로 치운다 — 안 그러면 바이트 없는 장이 공개 화면에 깨진 그림으로 남는다. 갤러리·표지는 **폼 안의 상태**로 부분 갱신한다(올리기·지우기마다 상세를 다시 부르면 쓰던 본문이 사라진다). 순서 바꾸기는 없다(정렬 컬럼 없음).
  - **올리기 전에 브라우저가 줄인다**(`shared/lib/resize-image.ts` — 긴 변 1600px·webp 0.85, canvas만). GIF·디코딩 실패·webp 인코딩 실패·원본보다 커지는 경우는 원본 그대로. 발급 요청의 확장자·크기는 **줄인 뒤의 값**이다 — 원본 크기를 보내면 서명과 바이트가 어긋난다.
  - **게시·게시 취소 뒤 공개 화면은 최대 5분 늦다.** 공개 API가 `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`이라(ADR-0038) 게시 카드에 «공개 화면에는 최대 5분 뒤 반영됩니다» 한 줄을 고정으로 둔다 — 없으면 «게시가 안 됐다» 문의가 온다. 같은 상태로의 재전이는 409(`CONTENT_ALREADY_PUBLISHED`·`CONTENT_NOT_PUBLISHED`)라 화면이 낡은 것이고 다시 부른다.
  - 어드민 API는 목록까지 전부 `CONTENT_MANAGE`라 메뉴를 감춘다(행사·RAG와 같다). 시드는 회장·부회장뿐이고 홍보국은 배포 뒤 역할별 권한 화면에서 켠다. 행사 수정 화면의 «포스트 만들기»는 그 화면을 여는 권한(`EVENT_MANAGE`)과 달라 잠근 채 사유를 붙인다. 포스트의 행사 연결 후보는 `GET /v1/events` 전체(페이징 없음)를 제목으로 걸러 고른다 — 전용 검색 API도 «행사 고르기» 컴포넌트도 없어 새로 만들지 않았고, 조회 권한이 `EVENT_MANAGE`라 홍보국원이 그 권한이 없으면 후보가 비고 문구가 그것을 말한다.
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
- **하위 업무 상세의 «점검 목록 변경 이력»은 펼칠 때 부른다**(#543 · ssccops#407 · 서버 #307 `GET /v1/sub-works/{id}/checklist/history`). 추가·수정·삭제마다 전/후 문구·수행자·시각 한 줄(`views/sub-work-detail/ui/checklist-history.tsx`). 항목 편집이 성공하면 상세가 `checklistVersion`을 올려 펼쳐 둔 이력이 다시 읽힌다 — 상세 조회에 얹지 않는 것은 콘텐츠 이력과 같은 이유. 진행 단계에서 편집을 열면 «착수 뒤 수정입니다 — 이력에 남습니다» 한 줄이 선다(판정은 여전히 서버 플래그 `isChecklistItemEditable`). 외부 URL(`otsd_url_addr`·`externalLink`)은 «추가 정보» 표의 한 행이다(값이 없으면 «-»).
- **콘텐츠 이력은 스냅샷이고 되돌리기가 없다**(#521). `GET …/history`는 생성·수정·게시·게시 취소마다 본문 전체를 한 줄로 싣고(최신 먼저) «무엇이 바뀌었나»는 없다 — 화면은 누가·언제·제목·상태만 펼치고 본문은 «본문 보기»로 그 스냅샷만 연다. 이력은 편집 화면의 첫 조회에 얹지 않고 «이력» 탭을 열 때 부른다. 포스트 이력에는 갤러리·표지·행사 연결이 없다.
- **행사에서 포스트 만들기(from-event)는 같은 행사로 여러 번 누르면 초안이 여러 건 생긴다.** 서버가 막지 않고 slug만 `event-{id}-2`…로 피한다. 화면은 만든 즉시 편집 화면으로 이동해 반복을 끊을 뿐이다.
- **어드민 화면 왼쪽 메뉴 맨 아래에 버전이 보인다.** 값은 `next.config.ts`가 `package.json`에서 주입하므로 따로 넣을 것이 없다 — `.env`로 받지 않는 이유는 배포 설정에 넣는 것을 잊으면 조용히 비기 때문이다.
