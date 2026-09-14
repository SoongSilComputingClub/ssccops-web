# packages/form-renderer — `@ssccops/form-renderer`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts` 머리 주석에 있다.

폼 문항 렌더링과 응답 검증. 어드민의 응답자 화면에서 뽑아 왔다(ssccops#136 · wave2 D15) — www의 신청 흐름·공개 폼과 lms의 기획안이 렌더러를 복사하면 클라이언트 검증 규칙이 두 벌이 되고 한 벌만 고쳐지는 순간 서버 검증과 어긋난다.

| 있는 것 | 없는 것 |
|---|---|
| 폼/응답 도메인 타입 · 문항 유형 코드(`QITEM_TYPE_CDS`·`QITEM_TYPE_NM`) · 답 상태(`toggleOption`·`toRspnsCn`) · 분기 경로(`nextPageSeq`·`reachedPageSeqs`) · 검증(`validateAnswers`·`validatePageAnswers` — 필수·정규식·최대 선택 수) · `QitemCard`·`FormDescription` | HTTP 호출, 자동 저장·제출 훅, 화면 셸, 권한 게이트 — 앱마다 클라이언트가 다르고(admin은 401에 리다이렉트, 공개 앱은 안 함) 문구·이동 규칙도 다르다. **전송 계층을 모르는 채로 둔다** |

## 규칙

- **검증 규칙은 서버 `ResponseAnswerValidator`와 맞춰 둔 것이다.** 앱이 한 줄이라도 다시 판정하면 두 벌이 된다 — 앱은 이 패키지 함수를 부르기만 한다(lms `use-proposal-form.ts`·www `use-resubmit-form.ts`가 그 예).
- 클래스를 들고 있으므로 세 앱 `globals.css`에 `@source`로 선언돼 있다 — 새 앱이 생기면 그 줄부터.
