/*
 * 커리큘럼 입력 보조의 직렬화·역직렬화 (#342).
 *
 * ── 이 파일이 서버 파서와 만나는 유일한 지점이다 ──────────────
 * 커리큘럼은 `LONG_TEXT` 자유 텍스트 한 칸으로 저장되고, 회차 목록으로 구조화하는 것은
 * **승인 시점의 서버**(`ProposalCurriculumParser` · ssccops-server#150)다. 이 이슈가 바꾸는
 * 것은 저장 형식이 아니라 그 문자열을 **손으로 맞춰 적던 것을 칸으로 받는 것**뿐이다.
 * 그래서 화면 어디에도 줄을 조립하는 코드가 더 있으면 안 된다 — 여기 두 함수가 전부다.
 *
 * ── 형식 안내를 여기에 적지 않는다 ─────────────────────────────
 * `1회차 | 주제 | 2026-03-05`라는 **문장**은 서버 시드가 문항 문구에 직접 넣어 두었고
 * (`ProposalFormSeed.CURRICULUM_LABEL`), 화면은 그것을 그대로 보여 줄 뿐 다시 적지 않는다
 * (`proposal-error.ts`의 결정). 이 파일이 갖는 것은 그 문장의 **복사본이 아니라 구현**이다 —
 * 사람이 읽을 안내는 여전히 한 곳(서버)에만 있고, 사람이 그 형식대로 손으로 적을 일이
 * 없어지는 만큼 두 벌이 갈릴 여지도 함께 줄어든다.
 *
 * ── 서버가 받아 주는 범위 (ProposalCurriculumParser) ──────────
 * 받아 주는 것: `|`로 나뉜 2칸 또는 3칸 · 칸 앞뒤 공백 · 회차 번호의 `회차` 접미사 유무 ·
 * 빈 줄 · 3번째 칸이 비어 있으면 "날짜 생략".
 * 거절하는 것: 칸 수가 2도 3도 아닌 줄 · 회차 번호가 숫자가 아니거나 0 이하 · 주제가 빈 줄 ·
 * ISO(`YYYY-MM-DD`)가 아닌 날짜 · **회차 번호 중복**.
 *
 * 직렬화는 그 허용 범위의 한가운데(`1회차 | 주제 | 2026-03-05`)로만 쓴다 — 받아 준다고 해서
 * 가장자리로 쓸 이유가 없고, 사람이 손으로 적던 모양과 같아야 이번 변경이 회귀가 아니다.
 */

/** 표의 한 행. 회차 번호는 행 순서에서 나오므로 들고 있지 않는다 */
export interface CurriculumRow {
  /** 주제 (crclm_artcl.ttl) */
  title: string;
  /** 계획일 `YYYY-MM-DD` — 생략 가능(crclm_artcl.plan_ymd도 NULL 허용) */
  planYmd: string;
}

/** 칸 구분자. 주제에 쉼표·하이픈·콜론이 흔히 들어가서 서버가 `|`를 골랐다 */
const FIELD_DELIMITER = "|";

/** 회차 번호 접미사 — 서버는 `1`도 `1회차`도 같게 읽지만, 쓸 때는 안내와 같은 쪽으로 쓴다 */
const SEQUENCE_SUFFIX = "회차";

/** `YYYY-MM-DD`. 서버가 ISO만 받는다 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyCurriculumRow(): CurriculumRow {
  return { title: "", planYmd: "" };
}

/**
 * 행 목록 → 저장 문자열.
 *
 * **회차 번호는 행 순서에서 매긴다**(1번째 행 = 1회차). 사람이 셀 이유가 없고, 세게 두면
 * 중간 행을 지웠을 때 번호가 어긋난 채 제출돼 서버가 중복·누락으로 거절한다.
 *
 * 주제도 날짜도 비어 있는 행은 **줄을 만들지 않는다** — 행 추가 버튼을 눌러 두고 채우지 않은
 * 빈 칸이 `2회차 |` 같은 줄이 되어 승인을 막으면, 제출자는 화면에 아무것도 적지 않은 자리가
 * 왜 문제인지 알 수 없다. 그렇게 건너뛴 만큼 뒤 행의 번호는 당겨진다(빈 줄에 번호를 내주면
 * 회차가 비어 서버가 읽을 수 없는 계획이 된다).
 *
 * 반대로 **주제만 비고 날짜가 있는 행은 그대로 내보낸다.** 서버가 "주제가 비어 있습니다"로
 * 거절할 줄이지만, 사용자가 적은 날짜를 화면이 조용히 버리는 것보다 낫다.
 */
export function toCurriculumText(rows: CurriculumRow[]): string {
  const lines: string[] = [];

  for (const row of rows) {
    const title = row.title.trim();
    const planYmd = row.planYmd.trim();
    if (title === "" && planYmd === "") continue;

    const seqno = lines.length + 1;
    const fields = [`${seqno}${SEQUENCE_SUFFIX}`, title];
    if (planYmd !== "") fields.push(planYmd);
    lines.push(fields.join(` ${FIELD_DELIMITER} `));
  }

  return lines.join("\n");
}

/**
 * 저장 문자열 → 행 목록. **한 줄이라도 읽지 못하면 통째로 null**을 돌려준다.
 *
 * null은 "표로 못 연다"는 뜻이고, 화면은 그때 지금까지 쓰던 자유 입력을 그대로 둔다 — 자유
 * 입력으로 낸 기존 기획안(형식이 어긋난 줄이 섞였을 수 있다)을 표에 얹으면 읽지 못한 줄이
 * 사라지고, 제출자가 쓴 내용이 화면에서 없어진다. 퇴화가 안전한 쪽으로 떨어뜨린다.
 *
 * 서버보다 **엄하게** 읽는 자리가 하나 있다: 회차 번호가 행 순서(1,2,3…)와 어긋나면 표로
 * 열지 않는다. 표는 번호를 행 순서에서 만들어 내므로, 3회차가 빠졌거나 번호가 뒤섞인 계획을
 * 표에 얹는 순간 저장할 때 번호가 조용히 다시 매겨진다 — 서버가 그것을 막으려고 번호를
 * 제출자가 적은 값으로 둔 것인데(`ProposalCurriculumParser` 주석), 화면이 대신 고쳐 버리면
 * 검토자는 제출자가 적은 것과 다른 계획을 보게 된다.
 */
export function toCurriculumRows(text: string): CurriculumRow[] | null {
  if (text.trim() === "") return [];

  const rows: CurriculumRow[] = [];

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trim();
    // 빈 줄은 건너뛴다 — 서버도 형식 위반으로 보지 않는다
    if (line === "") continue;

    const fields = line.split(FIELD_DELIMITER);
    if (fields.length !== 2 && fields.length !== 3) return null;

    const seqno = parseSequence(fields[0] ?? "");
    // 표는 번호를 행 순서에서 만든다 — 순서와 어긋난 번호는 표로 열 수 없다
    if (seqno === null || seqno !== rows.length + 1) return null;

    const title = (fields[1] ?? "").trim();
    if (title === "") return null;

    const planYmd = (fields[2] ?? "").trim();
    if (planYmd !== "" && !ISO_DATE_PATTERN.test(planYmd)) return null;

    rows.push({ title, planYmd });
  }

  return rows;
}

/** `1`·`1회차` 둘 다 1로 읽는다 (서버 `parseSequence`와 같은 관대함) */
function parseSequence(rawSequence: string): number | null {
  const trimmed = rawSequence.trim();
  const digits = trimmed.endsWith(SEQUENCE_SUFFIX)
    ? trimmed.slice(0, -SEQUENCE_SUFFIX.length).trim()
    : trimmed;

  if (!/^\d+$/.test(digits)) return null;
  const seqno = Number(digits);
  return seqno > 0 ? seqno : null;
}

/**
 * 숫자만 쳐도 `-`가 들어가게 한다 — `20260305` → `2026-03-05` (#342 제보).
 *
 * `type="date"` 대신 마스킹 입력을 쓰는 이유는 이슈가 정리해 두었다: 모바일에서 키보드 대신
 * 달력이 떠 연속 입력이 오히려 느려지고, 브라우저마다 표시 형식이 달라 화면에 보이는 값과
 * 저장 값이 갈린다.
 *
 * 넣던 값을 지우는 중일 수 있으므로 **자르기만 하고 채우지 않는다.** `2026-0`은 그대로 두고
 * (뒤에 `-`를 붙여 두면 지우기가 그 자리에서 되돌아온다), 숫자가 8자를 넘으면 버린다.
 */
export function maskYmd(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
  return parts.filter((part) => part !== "").join("-");
}
