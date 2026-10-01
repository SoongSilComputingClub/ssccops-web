import Link from "next/link";
import { programStopOf, type AcademicProgramSummary } from "@/entities/academic-program";
import { recruitmentPhaseOf, type RecruitmentPhase } from "@/entities/form";
import { ROUTES } from "@/shared/config/routes";

/*
 * 접수 상태 필터 (#528).
 *
 * ── 왜 클라이언트 상태가 아니라 링크인가 ────────────────────
 * 이 화면은 SSR이고 거르는 대상이 **이미 서버에서 다 받아 온 배열**이라, 상태를 들고 다시
 * 그릴 이유가 없다. 주소에 남기면 «접수중만 보던 화면»을 그대로 북마크·공유할 수 있고,
 * 카드의 편집 화면에 다녀와도 필터가 유지된다(뒤로 가기가 목록 상태를 되살린다).
 *
 * `Chip`(`shared/ui`)은 `onClick`을 받는 버튼이라 링크로 못 쓴다 — 같은 모양을 링크로
 * 그린다. 접근성상으로도 «다른 주소로 간다»는 링크가 맞다.
 */

/*
 * 카드의 묶음 — 폼 접수 상태에 «쓰기가 멈춘 프로그램»(수료·폐지)을 더한다 (#748 · ssccops#557).
 *
 * 접수 상태만 보던 동안 **승인 상태에서 폐지된 프로그램이 «모집 시작 전»으로 보였다** — 폐지는
 * 접수 중인 폼만 닫고(서버 `closeRecruitmentFormIfOpen` · 폼 상태표가 DRAFT → CLOSED를 막는다)
 * 모집 전 폼은 DRAFT로 남는다. 승인으로 복원하면 그 폼으로 모집을 시작해야 하니 서버가 닫지
 * 않는 것이 맞고, 화면이 프로그램 상태를 먼저 본다. 멈춘 상태는 `programStopOf` 한 곳에서
 * 읽는다(AGENTS.md — 폐지만 따로 비교하면 다음 상태가 들어올 때 또 빠진다). 그래서 수료도
 * «접수 종료»가 아니라 이 묶음이다.
 */
export type CardPhase = RecruitmentPhase | "stopped";

export function cardPhaseOf(program: AcademicProgramSummary): CardPhase {
  if (programStopOf(program.sttsCd)) return "stopped";
  return recruitmentPhaseOf(program.formReceiptStatus ?? "DRAFT");
}

/** 주소의 `?phase=` 값 — 없거나 모르는 값이면 «전체» */
export type PhaseFilter = CardPhase | "all";

export function toPhaseFilter(raw: string | string[] | undefined): PhaseFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "before" || value === "open" || value === "closed" || value === "stopped") {
    return value;
  }
  return "all";
}

const FILTERS: readonly { key: PhaseFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "before", label: "모집 시작 전" },
  { key: "open", label: "접수중" },
  { key: "closed", label: "접수 종료" },
  { key: "stopped", label: "수료·폐지" },
];

export function PhaseFilterChips({
  active,
  counts,
}: Readonly<{
  active: PhaseFilter;
  /** 묶음별 건수 — 거르기 전 전체를 기준으로 센다(고르면 0인 칩도 보여야 고를 수 있다) */
  counts: Record<PhaseFilter, number>;
}>) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {FILTERS.map((filter) => {
        const on = filter.key === active;
        return (
          <Link
            key={filter.key}
            href={
              filter.key === "all"
                ? ROUTES.studioRecruitment
                : `${ROUTES.studioRecruitment}?phase=${filter.key}`
            }
            aria-current={on ? "page" : undefined}
            className={
              on
                ? "rounded-full bg-accent px-[14px] py-[7px] text-[14px] text-on-solid"
                : "rounded-full bg-surface px-[14px] py-[7px] text-[14px] text-n300 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-ink"
            }
          >
            {filter.label} {counts[filter.key]}
          </Link>
        );
      })}
    </div>
  );
}
