/*
 * @ssccops/date — 서버가 준 일시·일자 문자열을 화면 표기로 옮기는 규칙.
 *
 * 세 앱의 `shared/lib/date.ts`에 **같은 이름의 함수가 서로 다른 몸으로** 흩어져 있었다
 * (admin↔www 206줄 · admin↔lms 267줄). `ssccops#243`이 `codes`·`cn`·`Badge`·`Card`를 공유로
 * 걷어 올릴 때 이 파일만 남긴 이유가 그 차이다 — 배지·카드는 겉모습이 달라지면 눈에 보이지만
 * **날짜가 하루 어긋나거나 시간대가 밀리는 것은 화면에 그럴듯한 숫자가 그대로 찍힌다.**
 * 타입도 린트도 잡지 못하고, 세 벌 중 한 벌만 고쳐지면 그 사실을 아무도 모른다.
 *
 * ── 시간대: 문자열을 잘라 쓴다 ──────────────────────────────
 * ssccops-server는 응답 일시를 서비스 시간대(Asia/Seoul)의 `OffsetDateTime`으로 준다(각 응답
 * DTO의 `SERVICE_ZONE = ZoneId.of("Asia/Seoul")` · `"2026-09-15T18:00:00+09:00"`). 그래서 여기
 * 있는 표기 함수는 `new Date(...)`로 파싱하지 않고 **앞자리를 잘라 쓴다** — 파싱해서 브라우저·
 * 워커의 로컬 시간대로 그리면 서울 밖에서 열었을 때 같은 값이 다른 시각으로 보인다. 화면에 뜬
 * 일시는 운영진이 함께 보는 하나의 사실이라 보는 사람에 따라 달라지면 안 된다.
 *
 * **오늘을 세는 것만은 계산이 필요하다.** `todayInSeoul`은 `Intl`로 서비스 시간대의 날짜를
 * 읽는다 — 로컬 시간대로 세면 해외에서 접속한 운영자에게 하루가 어긋난다.
 *
 * 잘라 쓰는 규칙은 **값에 Asia/Seoul 오프셋이 붙어 있다는 전제**에 기대고 있다. 서버가 어떤
 * 자리에서 `Instant`(`"...Z"`)를 그대로 내리면 앞자리는 UTC라 아홉 시간 어긋난 시각이 뜬다 —
 * 그런 자리는 잘라 쓰지 말고 시간대를 옮겨야 한다(admin `shared/lib/date.ts`의 `formatInstant`).
 *
 * ── 여기 없는 것 ────────────────────────────────────────────
 * **한 앱에만 있는 함수는 그 앱에 남겼다.** #328이 올리기로 한 것은 ① 세 앱에 같은 이름·같은
 * 동작으로 있던 것과 ② 같은 이름인데 동작이 갈려 어느 쪽이 맞는지 판단을 끝낸 것뿐이다.
 * 무엇이 왜 남았는지는 각 앱 `shared/lib/date.ts`에 적혀 있다 — admin의 폼 입력 변환·서비스
 * 오프셋·D-day·마감 배지, www의 행사 기간 표기, lms의 점 표기 일자.
 *
 * **값이 없을 때의 문구도 없다.** "-"를 쓸지 "미정"을 쓸지는 그리는 화면이 정한다 — 여기서
 * 채우면 "서버가 준 값"과 구별할 수 없다(`@ssccops/share-meta`와 같은 선 긋기다).
 */

/** 일시TS 모양 — 연-월-일에 시:분까지 있어야 일시로 본다 */
const TS_SHAPE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** 일자D 모양 — 일시TS도 앞자리가 이 모양이다 */
const YMD_SHAPE = /^\d{4}-\d{2}-\d{2}/;

/**
 * 일시TS → `"2026-08-12 19:00"`. 값이 없거나 모양이 어긋나면 빈 문자열(추측하지 않는다).
 *
 * ── 세 벌이 갈렸던 자리 (#328 ②) ────────────────────────────
 * admin·www는 모양을 보지 않고 앞 16자를 잘랐고, lms만 일시TS 모양을 확인한 뒤 잘랐다.
 * **모양을 보는 쪽으로 합쳤다.**
 *
 * 두 구현의 답이 갈리는 입력은 일시TS가 아닌 값뿐이다 — 일자D(`"2026-08-12"`)나 깨진 문자열.
 * 그때 느슨한 쪽은 `"2026-08-12"`처럼 **날짜로 읽히는 조각**을 화면에 그대로 내보내고, 그것이
 * 시각을 잃은 값인지 원래 그런 값인지는 화면에서 구별되지 않는다. 엄격한 쪽은 빈 문자열을
 * 주므로 그리는 자리가 이미 갖고 있는 대체 문구("-"·"미설정")가 뜬다 — **틀린 값을 그럴듯하게
 * 보여 주는 것보다 비어 보이는 편이 낫다.**
 *
 * 합치기 전 admin·www의 호출 26곳을 확인했다. 모두 일시TS 필드(`sbmsnDt`·`mdfcnDt`·`prcsDt`·
 * `rcptBgngDt`·`startAt`·`dueAt`·`crtDt`·`approvedAt` 등)를 넘기므로 이 변경으로 달라지는
 * 화면은 없다. lms에는 빈 문자열에 의미를 두는 자리가 있다 — `formatDt(x) || formatYmdDotted(x)`.
 */
export function formatDt(value: string | null | undefined): string {
  if (!value) return "";
  if (!TS_SHAPE.test(value)) return "";
  return value.slice(0, 16).replace("T", " ");
}

/**
 * 일시TS·일자D → `"2026-08-12"`. 값이 없거나 모양이 어긋나면 빈 문자열(추측하지 않는다).
 *
 * ── 이름이 겹쳤던 자리 (#328 ②) ─────────────────────────────
 * admin은 `"2026-08-12"`를, lms는 `"2026. 8. 12."`를 **같은 `formatYmd`라는 이름으로** 주고
 * 있었다. 같은 이름·다른 결과라, 한쪽 화면에서 쓰던 줄을 다른 앱으로 옮기면 표기가 소리 없이
 * 바뀐다 — #328이 없애려는 것이 정확히 그것이다.
 *
 * 여기 올린 것은 `YYYY-MM-DD` 쪽이다. `AGENTS.md` §데이터 표기가 일자D의 표기로 못 박은
 * 모양이고, 화면·CSV·복사한 값이 모두 같은 글자로 이어진다. lms의 점 표기는 **화면 표기
 * 취향**이라 근거의 종류가 다르고 눈으로 확인하지 않고 뒤집을 것이 아니라서, 그 앱에
 * `formatYmdDotted`라는 제 이름으로 남겼다. 이름이 갈렸으니 둘을 헷갈려 부를 일은 이제 없다.
 *
 * 모양을 확인하는 것은 `formatDt`와 같은 규율이다 — 어긋난 값에서 앞 열 자를 떼면 날짜처럼
 * 읽히는 조각이 나온다.
 */
export function formatYmd(value: string | null | undefined): string {
  if (!value) return "";
  if (!YMD_SHAPE.test(value)) return "";
  return value.slice(0, 10);
}

/**
 * 오늘 날짜(Asia/Seoul) — `"YYYY-MM-DD"`.
 *
 * **서버에서 받아 온 값의 D-day·이번 주 판정은 이 함수를 기준일로 센다**(`AGENTS.md`
 * §데이터 표기). PoC 시절의 고정 기준일을 쓰면 이미 지난 마감이 미래로 보인다.
 *
 * 브라우저의 로컬 시간대가 아니라 서비스 시간대로 세는 것은 이 패키지의 다른 함수와 같은
 * 판단이다 — 서버가 일시를 Asia/Seoul 오프셋으로 내려주고 화면은 그 문자열을 잘라 쓰므로,
 * 여기서만 현지 시간대를 쓰면 해외에서 접속한 사람에게 하루가 어긋난다.
 *
 * admin·lms에 **글자까지 같은 사본**이 있던 것을 걷어 왔다(#328 ①).
 */
export function todayInSeoul(): string {
  // sv-SE 로케일이 ISO와 같은 YYYY-MM-DD 표기를 준다
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

/**
 * `today`(YYYY-MM-DD)가 속한 주(월요일 시작)의 [시작, 끝] 일자.
 *
 * "이번 주" 판정을 서버가 내려주지 않으므로(대시보드 #126) 회차 목록을 받아 이 범위로 거른다 —
 * 기준일은 `todayInSeoul()`이다. 월요일 시작으로 잡는 것은 학술 회차가 대개 주 단위
 * 커리큘럼이라 주말을 한 주의 끝으로 두는 편이 읽기 자연스러워서다(ISO-8601 주 정의와 같다).
 *
 * admin·lms에 같은 정의가 두 벌 있었다(#328 ①). lms 쪽 주석은 "두 앱은 소스를 공유하지 않으니
 * 한쪽을 고치면 다른 쪽도 함께 본다"고 적어 두고 있었는데, 그 당부가 필요 없어진 자리다.
 *
 * 날짜 계산에 UTC 자정(`T00:00:00Z`)을 쓰는 것은 **일자만 다루기 위해서다** — 값에 시간대가
 * 섞이지 않아 어디서 계산하든 같은 답이 나온다(들어오는 `today`는 이미 서울 기준 일자다).
 */
export function weekBounds(today: string = todayInSeoul()): {
  start: string;
  end: string;
} {
  const base = new Date(`${today}T00:00:00Z`);
  // getUTCDay(): 일=0…토=6 → 월요일까지 되돌릴 일수
  const backToMonday = (base.getUTCDay() + 6) % 7;
  const start = new Date(base.getTime() - backToMonday * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** `date`(YYYY-MM-DD)가 `today` 기준 이번 주(월~일) 안에 드는가. 값이 없으면 false */
export function isWithinThisWeek(
  date: string | null | undefined,
  today: string = todayInSeoul(),
): boolean {
  if (!date) return false;
  const ymd = date.slice(0, 10);
  const { start, end } = weekBounds(today);
  return ymd >= start && ymd <= end;
}
