# packages/codes — `@ssccops/codes`

**이 파일이 정본이고 루트 `AGENTS.md`는 링크만 든다**(ssccops#349). «왜 그 모양인가»는 `src/index.ts` 머리 주석에 있다.

서버 표준코드와 그 표시명 중 **admin과 lms가 실제로 함께 쓰는 것**(응답 상태 등). 앱은 `shared/config/codes.ts`에서 재export 하므로 화면 코드는 `@/shared/config/codes`를 부른다.

## 규칙

- **표시명은 문구가 아니라 계약이다** — 서버 `V3__seed_reference_data.sql` 시드와 글자까지 맞춰져 있어 여기서 다듬으면 화면이 조용히 빈 라벨로 깨진다. 바꾸려면 서버 시드와 함께.
- **코드로 비교한다** — 한글 표시 문자열 비교 금지(루트 «데이터 표기»).
- 선언 순서는 서버 enum 순서다 — 그 순서가 곧 필터 칩의 순서라 심사 진행 차례로 읽힌다.
- admin에만 있는 코드값(회원 등급·업무 상태·행사 분류 등 70여 개)은 admin `shared/config/codes.ts`에 그대로 둔다 — 한 앱만 쓰는 것까지 올리면 이 패키지가 admin의 사본이 되어 무엇이 정말 공유되는지 알 수 없다.
