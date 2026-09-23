# packages/signup — `@ssccops/signup`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts` 머리 주석에 있다 — 여기는 규칙만.

www·lms가 함께 쓰는 **회원 가입 화면 한 벌**(#664). 두 앱이 같은 화면을 통째로 복사해 두고 있었다(`signup-step.tsx` 281줄 × 2 · `member-link-step.tsx` 209줄 × 2 · `link-form.ts` 187줄 × 2 · `entities/member` 한 벌 × 2). 화면·문구·동작은 그대로 두고 구현만 합친 것이다 — «부원 앱은 각자 자리에서 가입을 끝낸다»(#451 · #453)는 결정은 그대로다.

| 있는 것 | 없는 것과 이유 |
|---|---|
| `SignupStep`(가입 폼 카드 · 재학/졸업 칩 · 학번 중복 갈림길) · `MemberLinkStep`(기존 회원 연결) · 폼 값·검증·요청 변환(`signup-form.ts`·`link-form.ts`) · 서버 오류 코드 → 화면 처리 · 가입/연결 API(`POST /v1/members/signup`·`/v1/members/link`) | **전송 계층** — 토큰을 어디서 꺼내는지·401을 어떻게 다루는지가 앱마다 다르다(루트 `AGENTS.md` «인증»). 인증 호출 하나를 `apiFetch` prop으로 받는다 |
| 선택 칩(`ui/chip.tsx` · 이 패키지 안에서만) | **다음 단계** — 가입이 끝나면 `onSignedUp` 한 줄만 올린다. www는 신청서로, lms는 `router.refresh()`로 잇는다 |
| | **미가입 안내 문구·펼침 버튼** — 자리마다 다르므로 앱에 남는다(lms `SignupRequiredNotice`) |
| | **어드민** — 가입 화면이 리다이렉트로 서고(`apiFetch`가 401·403을 끝낸다) 오류를 그리는 부품도 달라 «감싸고 있는 것이 전부 다르다». `apps/admin`의 `features/auth/model/link-form.ts`는 그대로 둔다 |

## 규칙

- **앱을 모른다.** 행사도 학술 프로그램도 오리진도 모른다 — 앱마다 다른 것은 `apiFetch`(인증 호출)와 `onSignedUp`(다음 단계)뿐이고, 새 차이가 생기면 prop으로 받는다. 패키지 안에 앱 이름으로 갈라지는 분기를 만들지 않는다.
- **`instanceof ApiError`를 쓰지 않는다**(`model/api-failure.ts`). `ApiError` 클래스는 앱마다 따로 있어 한쪽을 임포트하면 다른 앱에서 판정이 늘 거짓이 되고, 학번 중복(연결 갈림길)도 429 잠금도 «잠시 후 다시 시도해주세요» 한 줄로 뭉개진다. `name === "ApiError"` + `code`·`status` 모양으로 읽는다.
- **`CLIENT_ERROR`의 네 값은 앱 클라이언트의 것을 옮겨 적은 것이다**(`shared/api/client.ts`의 `API_ERROR` · `shared/api/auth-error.ts`의 `AUTH_ERROR`). 주입하는 통로를 바꾸는 사람은 값이 같은지 함께 본다 — 갈리면 타입·린트는 통과하고 문구만 조용히 떨어진다.
- **색은 토큰 이름으로 적는다** — `var(--color-danger)`처럼. 값으로 박으면 다크모드에서 그 자리만 밝은 채로 남는다(lms 사본의 `#f04452`가 실제로 그랬다 · `packages/ui/AGENTS.md`와 같은 규칙).
- **서버 계약(`POST /v1/members/signup`·`/v1/members/link`)은 이 패키지가 정본이다.** 등급은 요청에 없고(서버가 TEMP로 고정한다) 연결 실패는 항목별로 나누지 않는다(VR-M23) — 이유는 `model/*-api.ts` 주석에 있다.
- 클래스를 들고 있으므로 세 앱 `globals.css`에 `@source`로 선언한다(#316 — 빠뜨리면 타입·린트·빌드가 전부 통과한 채 화면만 무너진다). 어드민은 이 화면이 없지만 «패키지마다 한 줄» 규칙은 지킨다. `transpilePackages`는 쓰는 앱(www·lms)에만 — 어드민은 의존성 자체가 없다.
