"use client";

import { useState } from "react";
import type { RspnsCn } from "@ssccops/form-renderer";
import { answerText, type AnswerColumn, type FormResponseItem } from "@/entities/response";
import { cn } from "@/shared/lib/cn";

/*
 * 응답 표 보기 — 문항이 열, 응답자가 행 (ssccops#227).
 *
 * 운영진 증언: *"현재는 제출 여부 위주로 보여서, 참여 여부를 확인할 수 없는 점이 불편해요"*.
 * 목록은 "누가 냈는가"만 답하므로, 참가 여부처럼 답 한 줄만 알면 되는 일에도 응답을 하나씩
 * 열어야 했다.
 *
 * ── GridTable을 쓰지 않는다 ──────────────────────────────────
 *
 * `GridTable`은 열 트랙이 인라인 style이고 `lg` 미만에서 카드로 바뀐다(#85). 문항이 열이 되는
 * 표는 열 수가 폼마다 달라 가로 스크롤이 전제이고, 카드로 접으면 "여러 사람의 같은 문항 답을
 * 나란히 본다"는 목적 자체가 사라진다. 그래서 **이 표는 데스크톱 전용**이고(부르는 쪽이
 * `hidden lg:block`으로 감춘다) 여기서는 스크롤되는 표 하나만 그린다.
 *
 * ── 첫 두 열은 고정한다 ─────────────────────────────────────
 *
 * 오른쪽으로 밀어 문항을 보다 보면 그 답이 누구 것인지 사라진다. 회원명·학번을 `sticky`로 묶어
 * 두면 가로로 아무리 밀어도 행의 주인이 남는다 — 엑셀에서 틀 고정을 하는 것과 같은 이유다.
 */

/** 한 줄로 자를 때의 최소 폭 — 서술형은 넓게, 나머지는 좁게 */
const COL_WIDTH = { long: "260px", short: "160px" } as const;

export function ResponseAnswerTable({
  rows,
  columns,
  answers,
  onRowClick,
}: Readonly<{
  rows: FormResponseItem[];
  /** 보이기로 한 열만 넘어온다 — 끄고 켜는 판단은 부르는 쪽이 한다 */
  columns: AnswerColumn[];
  /** formRspnsId → 답. 아직 안 왔거나 실패한 건은 없다 */
  answers: Record<number, RspnsCn>;
  onRowClick: (formRspnsId: number) => void;
}>) {
  /*
   * 펼친 칸은 한 번에 하나다. 여러 칸을 동시에 펼치면 행 높이가 제각각이 되어 표로 훑는 이점이
   * 사라진다 — 자르는 이유와 같은 이유로 펼침도 하나로 묶는다.
   */
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-max border-collapse text-[14px]">
        <thead>
          <tr className="text-left text-[13px] text-n500">
            <th className="sticky left-0 z-20 bg-surface px-3 py-2 font-normal">회원명</th>
            <th className="sticky left-[140px] z-20 bg-surface px-3 py-2 font-normal">
              학번
            </th>
            {columns.map((c) => (
              <th
                key={c.qitemId}
                className="px-3 py-2 font-normal"
                style={{ minWidth: c.long ? COL_WIDTH.long : COL_WIDTH.short }}
              >
                {/* 문항 문구가 길면 머리글이 표를 밀어내므로 여기도 한 줄로 자른다 */}
                <div className="truncate" title={c.label}>
                  {c.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rspnsCn = answers[r.formRspnsId];
            return (
              <tr key={r.formRspnsId} className="border-t border-hairline">
                {/*
                  이름과 학번은 상세로 가는 자리다 — 목록의 이름 열이 하던 일을 표에서도 유지한다
                  (심사 흐름이 끊기지 않는다). 답 칸은 펼침이 걸려 있어 이동에 쓰지 않는다.
                */}
                <td className="sticky left-0 z-10 w-[140px] max-w-[140px] bg-surface px-3 py-2 font-semibold">
                  {/* td onClick 은 키보드로 못 연다 — 안에 버튼을 둔다 (UI 감사 D8 · #473). 저장소의 다른 셀(#403)과 같은 규약 */}
                  <button
                    type="button"
                    onClick={() => onRowClick(r.formRspnsId)}
                    className="block w-full cursor-pointer truncate rounded-[4px] text-left hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
                  >
                    {r.member.mbrNm || "-"}
                  </button>
                </td>
                <td className="sticky left-[140px] z-10 w-[110px] max-w-[110px] truncate bg-surface px-3 py-2 text-n400">
                  {r.member.stdntNo || "-"}
                </td>
                {columns.map((c) => {
                  const cellKey = `${r.formRspnsId}:${c.qitemId}`;
                  const open = expanded === cellKey;
                  return (
                    <AnswerCell
                      key={c.qitemId}
                      text={answerText(rspnsCn, c.qitemId)}
                      long={c.long}
                      open={open}
                      onToggle={() => setExpanded(open ? null : cellKey)}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 답 한 칸 — 답이 있을 때만 펼침이 걸린다.
 *
 * **`role="button"`을 얹은 `td`가 아니라 `td` 안의 `button`이다**(#658 · S6819 · S3776). 바로
 * 왼쪽의 회원명 칸(#473)과 같은 규약이고, 버튼이 Enter·Space를 스스로 받으므로 `onKeyActivate`도
 * 필요 없다. 자르기·펼치기와 누르는 자리는 버튼으로 내려가고 `td`에는 여백과 폭만 남는다 —
 * 칸을 한 바퀴 도는 삼항이 여기로 모이면서 부르는 쪽의 인지 복잡도도 함께 내려간다.
 *
 * 답이 없으면 빈 칸이다. 눌러도 아무 일이 없는 자리를 Tab 정거장으로 두면 사용자는 고장으로
 * 읽는다(D8).
 */
function AnswerCell({
  text,
  long,
  open,
  onToggle,
}: Readonly<{
  text: string;
  /** 서술형인가 — 자른 상태의 폭이 갈린다 */
  long: boolean;
  open: boolean;
  onToggle: () => void;
}>) {
  /* 펼치면 폭을 풀어 전문이 줄바꿈으로 흐르게 한다 */
  const maxWidth = open ? undefined : long ? COL_WIDTH.long : COL_WIDTH.short;

  /*
   * 빈 칸을 `-`로 채우지 않는다. 답을 비워 둔 것인지 그 응답 당시에는 없던 문항인지 화면이
   * 구별할 수 없어서인데(서버가 qitem_ver를 내려주지 않는다), `-`를 넣으면 "답이 없다"는 한
   * 가지 뜻으로 굳는다. 비워 두면 읽는 사람이 표의 다른 칸과 비교해 판단한다.
   */
  if (!text) return <td className="px-3 py-2 align-top" style={{ maxWidth }} />;

  return (
    /* 마우스로 잠깐 올려도 전문이 보이게 — 누르는 것과 두 경로를 준다 */
    <td className="px-3 py-2 align-top" style={{ maxWidth }} title={text}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "block w-full cursor-pointer rounded-[4px] text-left focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none",
          open ? "whitespace-pre-wrap" : "truncate",
        )}
      >
        {text}
      </button>
    </td>
  );
}
