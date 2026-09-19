import type { BadgeTone } from "@ssccops/ui";
import type { FormReceiptStatus } from "./types";

/*
 * 접수 상태의 표시 규칙 (#528).
 *
 * **표시명을 `shared/config/codes.ts`에 두지 않았다.** 이 상태들은 표준코드 테이블이 아니라
 * 서버 enum(`FormReceiptStatus`)이고 응답이 raw enum만 내려온다 — 학술 활동 상태(#122)·
 * RAG 상태(#432)와 같은 자리다. 표준코드였다면 서버 시드와 글자까지 맞춰야 한다.
 */

/**
 * 모집 카드가 쓰는 세 묶음 — 서버가 다섯 상태를 내리지만 리더가 알아야 하는 것은 **문항을
 * 지금 고칠 수 있는가**로 갈리는 세 가지다(서버 `AcademicProgramSummaryResponse` 주석과
 * 같은 묶음).
 *
 *   before  DRAFT(접수 일시 미등록) · SCHEDULED(등록됐고 아직 전) — 고칠 수 있는 구간
 *   open    ACCEPTING                                            — 접수 중
 *   closed  EXPIRED(기간 지남) · CLOSED(운영자가 닫음)             — 접수 종료
 *
 * `DRAFT`와 `SCHEDULED`를 한 묶음으로 두는 것이 이 화면의 핵심이다 — 학술국장이 미래
 * 시작일로 모집을 시작하면 **활동은 이미 ONGOING인데 접수는 아직 열리지 않았고**, 리더는 그
 * 구간에도 문항을 고칠 수 있다. 활동 상태로 묶었다면 그 구간이 «접수중»으로 보인다.
 */
export type RecruitmentPhase = "before" | "open" | "closed";

export function recruitmentPhaseOf(status: FormReceiptStatus): RecruitmentPhase {
  switch (status) {
    case "DRAFT":
    case "SCHEDULED":
      return "before";
    case "ACCEPTING":
      return "open";
    default:
      return "closed";
  }
}

const PHASE_LABEL: Record<RecruitmentPhase, string> = {
  before: "모집 시작 전",
  open: "접수중",
  closed: "접수 종료",
};

/*
 * 배지 톤 — «지금 무엇을 할 수 있나»가 색으로 갈린다.
 *
 * before는 amber다. 이 구간에만 문항을 고칠 수 있고 그 창이 닫히면 되돌릴 수 없어서,
 * «지금 해야 하는 일»을 눈에 띄게 둔다. open은 정보(blue), closed는 지나간 것(grey)이다.
 */
const PHASE_TONE: Record<RecruitmentPhase, BadgeTone> = {
  before: "amber",
  open: "blue",
  closed: "grey",
};

export function receiptStatusBadge(status: FormReceiptStatus): {
  label: string;
  tone: BadgeTone;
} {
  const phase = recruitmentPhaseOf(status);
  return { label: PHASE_LABEL[phase], tone: PHASE_TONE[phase] };
}
