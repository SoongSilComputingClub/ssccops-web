import Link from "next/link";
import { fetchPublicPageSummaries } from "@/entities/content";
import { OPERATORS_SLUG_PREFIX, parseOperatorsCohort } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";

/**
 * 역대 운영진 — 운영진 문서 **아래**에 서는 목록 (#723 · ssccops#533 · ADR-0056 추신).
 *
 * #571이 만든 것은 탭 줄이었다(«지금» + «44대»·«43대»…). 그 자리를 옮긴 이유는 둘이다.
 *
 * 1. **대수는 축의 자매 페이지가 아니다.** 소개 축의 탭 줄은 소개·연혁·핵심 가치·운영진·문의 —
 *    서로 다른 이야기를 하는 다섯 문서다. 대수는 그중 «운영진» 한 문서의 **과거 판본**이라
 *    같은 줄에 섞이면 «다른 문서»와 «지난 판본»이 한 가지로 보인다.
 * 2. **게시된 페이지 수만큼 자란다.** 학기마다 한 대씩 늘어 탭 줄이 길어지고, 좁은 화면에서는
 *    그만큼 먼저 넘친다.
 *
 * 목록은 서버가 답한다(`GET /public/v1/pages?slugPrefix=operators-`) — 슬러그를 숫자로 파싱해
 * **최신 대수가 앞**이다(서버는 문자열 오름차순이라 `operators-9`가 `operators-44` 뒤에 온다).
 * 패턴이 아닌 슬러그는 버린다.
 *
 * **조회가 실패하거나 한 대도 없으면 절 자체가 없다** — 본문은 이미 열려 있고, 없는 것을 빈 상자로
 * 알리지 않는다(`ContentPage`가 조회 실패를 «준비 중»으로 받는 것과 같은 태도).
 *
 * `/operators`와 `/operators/{n}` 둘 다에 둔다 — 한 대를 보고 있을 때 다른 대로 건너갈 길이
 * 그 자리에 있어야 한다. 보고 있는 대수는 링크가 아니라 켜진 칩이다.
 */
export async function OperatorCohorts({
  current,
}: Readonly<{
  /** 지금 보고 있는 대수. 목록 화면(`/operators`)에서는 없다 */
  current?: number;
}>) {
  let cohorts: number[] = [];
  try {
    const rows = await fetchPublicPageSummaries(OPERATORS_SLUG_PREFIX);
    cohorts = rows
      .map((row) => parseOperatorsCohort(row.slug))
      .filter((n): n is number => n !== null)
      .sort((a, b) => b - a);
  } catch {
    cohorts = [];
  }

  if (cohorts.length === 0) return null;

  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[17px] font-semibold">역대 운영진</h2>
      <ul className="flex flex-wrap gap-[8px]">
        {current !== undefined && (
          <li>
            <Link
              href={ROUTES.operators}
              className="inline-flex rounded-full border border-line px-3 py-[6px] text-[14px] text-n300 hover:border-accent hover:text-accent-strong"
            >
              지금
            </Link>
          </li>
        )}
        {cohorts.map((n) => (
          <li key={n}>
            {n === current ? (
              <span
                aria-current="page"
                className="inline-flex rounded-full border border-accent-strong bg-accent-soft px-3 py-[6px] text-[14px] text-accent-strong"
              >
                {n}대
              </span>
            ) : (
              <Link
                href={ROUTES.operatorsCohort(n)}
                className="inline-flex rounded-full border border-line px-3 py-[6px] text-[14px] text-n300 hover:border-accent hover:text-accent-strong"
              >
                {n}대
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
