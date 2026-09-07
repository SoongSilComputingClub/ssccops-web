"use client";

import { QITEM_TYPE_NM } from "@ssccops/form-renderer";
import type { QitemDistribution } from "@/entities/response";
import { ProgressBar } from "@/shared/ui";

/*
 * 문항별 응답 분포 (ssccops#224).
 *
 * ── 분모를 화면이 말한다 ────────────────────────────────────────
 *
 * 비율의 분모는 **그 문항에 답한 사람 수**이지 전체 응답자가 아니다. 그렇게 둔 이유는
 * `answer-table.ts`의 `answeredCount` 주석에 있다 — 답이 없는 것이 "비워 뒀다"인지 "그때는
 * 없던 문항이다"인지 가릴 수 없어(`qitem_ver`가 응답에 실려 오지 않는다) 전체를 분모로 삼으면
 * 나중에 추가된 문항의 비율이 실제보다 낮게 나온다.
 *
 * 그래서 문항마다 **답한 사람 수를 숫자로 적는다.** 비율만 보여 주고 분모를 감추면 보는 사람이
 * 전체 응답자를 분모로 짐작하는데, 그 짐작이 틀리는 폼이 실재한다.
 *
 * ── 다중선택 ────────────────────────────────────────────────
 *
 * 한 사람이 여럿 고르므로 **비율의 합이 100%를 넘는다.** 넘는 것 자체는 정상이지만 아무 말도
 * 없으면 집계가 틀린 것처럼 보이므로 문항 머리에 그 사실을 적는다. 막대 하나하나는 여전히
 * "답한 사람 중 이 선택지를 고른 비율"이라 각각은 100%를 넘지 않는다.
 *
 * ── 차트 라이브러리를 쓰지 않는다 ──────────────────────────────
 *
 * 막대 하나에 라이브러리를 들이면 Cloudflare Workers 번들에 그만큼 얹힌다(#224 기각 목록).
 * 진행률 막대는 이미 `shared/ui`에 있고 그것으로 충분하다.
 */

/** 0으로 나누지 않는다 — 아무도 답하지 않은 문항은 모든 막대가 0이다 */
function ratio(count: number, denominator: number): number {
  return denominator === 0 ? 0 : (count / denominator) * 100;
}

export function ResponseDistribution({
  distributions,
  totalCount,
}: {
  distributions: QitemDistribution[];
  /** 지금 목록에 있는 응답 수 — 문항별 답한 사람 수와 견주는 기준 */
  totalCount: number;
}) {
  if (distributions.length === 0) {
    return <div className="py-6 text-[14px] text-n500">문항이 없는 폼입니다.</div>;
  }

  return (
    <div className="flex flex-col gap-[22px] py-2">
      {distributions.map((d) => (
        <section key={d.qitemId}>
          <div className="mb-[2px] flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px]">
            <h3 className="text-[15px] font-semibold">{d.label}</h3>
            <span className="text-[13px] text-n500">{QITEM_TYPE_NM[d.typeCd]}</span>
          </div>

          {/*
            답한 사람 수를 응답 수와 나란히 적는다. 두 숫자가 다른 이유(비워 뒀거나, 그 응답
            이후에 추가된 문항이거나)는 화면이 알 수 없으므로 **말하지 않는다** — 지어내면
            문항을 추가한 폼에서 거짓이 된다.
          */}
          <div className="mb-[10px] text-[13px] text-n500">
            답한 사람 {d.answeredCount}명 / 응답 {totalCount}건
            {d.multi && " · 복수 응답이라 선택지 비율의 합은 100%를 넘을 수 있습니다"}
          </div>

          {!d.choice ? (
            /*
              서술형·단답형·날짜는 값이 제각각이라 선택지처럼 묶이지 않는다. 억지로 같은 문자열
              끼리 세면 오타 하나가 다른 항목이 되어 목록만 길어진다 — 건수까지만 말한다.
            */
            <div className="text-[14px] text-n300">
              집계하지 않는 유형입니다. 답은 표 보기나 응답 상세에서 봅니다.
            </div>
          ) : d.buckets.length === 0 ? (
            <div className="text-[14px] text-n500">선택지가 없는 문항입니다.</div>
          ) : (
            <ul className="flex flex-col gap-[7px]">
              {d.buckets.map((b) => (
                <li key={b.label} className="flex items-center gap-[10px]">
                  <div className="w-[180px] shrink-0 text-[14px]">
                    <span className={b.count === 0 ? "text-n500" : undefined}>
                      {b.label}
                    </span>
                    {/*
                      접수를 연 뒤 지워진 선택지 — 답은 남아 있는데 폼에는 없다. 표시하지 않으면
                      "폼에 없는 선택지가 왜 있지"로 읽히고, 버리면 합이 답한 사람 수와 어긋난다.
                    */}
                    {!b.declared && (
                      <span className="ml-[5px] text-[12px] text-n500">지워진 선택지</span>
                    )}
                  </div>
                  <ProgressBar value={ratio(b.count, d.answeredCount)} height={8} />
                  <div className="w-[86px] shrink-0 text-right text-[13px] tabular-nums text-n400">
                    {b.count}명
                    <span className="ml-[5px] text-n500">
                      {Math.round(ratio(b.count, d.answeredCount))}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
