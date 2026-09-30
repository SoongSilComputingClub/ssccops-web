"use client";

import { useId, useState } from "react";
import { useMemberHistory } from "@/features/academic-program/model/use-member-history";
import { PTCP_CHG_PATH_SE_NM, PTCP_STTS_NM, ptcpChangeNm } from "@/shared/config/codes";
import { formatDt } from "@/shared/lib/date";

/*
 * 명단 변경 이력 절 (#742 · server#612 · ADR-0042).
 *
 * 추가·제외가 학술국장 승인 없이 바로 반영되는 대신 **누가 · 언제 · 무엇을**이 남고, 그것이 화면에
 * 보여야 연 것이다(ADR-0042 — 이력이 있는데 화면이 없으면 연 것이 아니다). 모집 선발 · 행사 참가자 ·
 * 팀원 관리 세 경로의 줄이 전부 오므로 어느 화면에서 바꿨는지(경로)도 함께 적는다.
 *
 * 펼칠 때 부른다(`useMemberHistory`). 연 동안 명단을 바꾸면 다시 읽는다.
 *
 * «무엇을»은 이전·이후 상태 쌍을 `ptcpChangeNm`(`@ssccops/codes`)이 사람의 말로 옮긴 것이다 —
 * 어드민 프로그램 상세의 이력과 같은 말이다. 처음 명단에 오른 줄(«추가»)만 그때의 상태를 덧붙인다.
 */
export function MemberHistorySection({
  academicProgramId,
  version,
}: Readonly<{ academicProgramId: number; version: number }>) {
  const [open, setOpen] = useState(false);
  const history = useMemberHistory(academicProgramId, open, version);
  const panelId = useId();

  return (
    <section className="flex flex-col gap-[8px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[6px] self-start text-[14px] text-n400 hover:text-ink"
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        명단 변경 이력
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="rounded-2xl bg-surface px-[14px] py-[6px] shadow-[0_0_0_1px_var(--color-line)]"
      >
        {history.status === "loading" && (
          <p className="py-[12px] text-[14px] text-n500">이력을 불러오는 중…</p>
        )}
        {history.status === "error" && (
          <div className="flex flex-col items-start gap-[6px] py-[12px]">
            <p className="text-[14px] text-danger">{history.errorMessage}</p>
            <button
              type="button"
              onClick={history.reload}
              className="text-[13px] text-n400 underline hover:text-ink"
            >
              새로고침
            </button>
          </div>
        )}
        {history.status === "ready" && history.items.length === 0 && (
          <p className="py-[12px] text-[14px] text-n500">아직 남은 이력이 없습니다.</p>
        )}
        {history.status === "ready" && history.items.length > 0 && (
          <ol className="flex flex-col">
            {history.items.map((h) => (
              <li
                key={h.historyId}
                className="flex flex-col gap-[2px] border-t border-line py-[10px] first:border-t-0"
              >
                <span className="text-[14.5px] text-ink">
                  <b className="font-medium">{h.memberName || "-"}</b>{" "}
                  {ptcpChangeNm(h.beforeSttsCd, h.afterSttsCd)}
                  {h.beforeSttsCd === null && (
                    <span className="text-n500"> · {PTCP_STTS_NM[h.afterSttsCd]}</span>
                  )}
                </span>
                <span className="text-[12.5px] text-n500">
                  {h.performerName || "-"} · {PTCP_CHG_PATH_SE_NM[h.changePath] ?? h.changePath}
                  {h.changedAt && ` · ${formatDt(h.changedAt)}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
