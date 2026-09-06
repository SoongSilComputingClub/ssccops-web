import type { SubWorkDetail } from "@/entities/sub-work";
import { WORK_STTS_NM } from "@/shared/config/codes";
import { formatDt } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui";

/*
 * 다음 단계 안내 (ssccops#197).
 *
 * 상세는 '지금 할 수 있는 전이 하나'만 버튼으로 그린다 — 그 설계는 그대로 두고, **버튼 옆의
 * 말**을 고친다. 버튼이 왜 잠겼는지가 `title` 툴팁에만 있으면 모바일(국장단이 보는 화면)에서는
 * 아무 말도 없는 것과 같고, 권한이 없어 버튼 자체가 없으면 데스크톱에서도 그렇다.
 *
 * 잠긴 이유는 세 가지를 **섞지 않는다** — 권한은 다른 사람이, 점검은 담당자가, 정족수는
 * 투표자가 풀어야 한다. 한 문장으로 뭉치면 누가 움직여야 하는지가 사라진다.
 *
 * 판정 재료는 전부 서버가 준 값이다(`canApprove` · `checklistSummary` · `quorum` ·
 * `approvalRequired`). 화면이 권한 트리를 다시 계산하지 않는다 — 착수·완료 승인 요청의
 * 주체(담당자 또는 WORK_MANAGE)는 서버 SubWorkOwnershipPolicy와 같은 축이며, 버튼 노출에
 * 이미 쓰고 있는 판정을 그대로 문장으로 옮길 뿐이다.
 */

export type BlockKind = "permission" | "checklist" | "quorum";

export interface NextStepBlock {
  kind: BlockKind;
  text: string;
}

export interface NextStep {
  /** 지금 단계 표시명 (기획 · 진행 · 검토 · 완료) */
  stage: string;
  /** 다음에 누를 전이의 이름. 완료면 null */
  next: string | null;
  /** 지금 그 전이를 막고 있는 것들. 비어 있으면 누를 수 있다 (또는 완료다) */
  blocks: NextStepBlock[];
  /** 승인 단계에 대한 설명 — 있는데 못 누르는 것과 '단계 자체가 없는 것'을 가른다 */
  approval: string;
}

const BLOCK_LABEL: Record<BlockKind, string> = {
  permission: "권한",
  checklist: "점검",
  quorum: "정족수",
};

/** 승인 필요 없는 유형의 완료·착수·요청 주체 — 서버 SubWorkOwnershipPolicy(#101)와 같은 말 */
const OWNER_OR_MANAGER = "담당자나 업무 관리(WORK_MANAGE) 권한이 있는 사람";

/** 남은 점검 항목을 셋까지만 이름으로 적는다 — 좁은 화면에서 목록이 문장을 삼키지 않게 */
function remainingArticles(subWork: SubWorkDetail): string {
  const left = subWork.checklist.filter((i) => !i.isCompleted).map((i) => i.article);
  if (left.length === 0) return "";
  const shown = left.slice(0, 3).join(", ");
  return left.length > 3 ? `${shown} 외 ${left.length - 3}개` : shown;
}

function checklistBlock(subWork: SubWorkDetail, verb: string): NextStepBlock | null {
  const { completedCount, totalCount } = subWork.checklistSummary;
  const remaining = totalCount - completedCount;
  if (remaining <= 0) return null;
  const names = remainingArticles(subWork);
  return {
    kind: "checklist",
    text:
      `완료 점검 ${remaining}개가 남았습니다 — 다 체크해야 ${verb} 수 있습니다` +
      (names ? `: ${names}` : ""),
  };
}

/** 결재 권한을 `이름(코드)`로 적는다 (#117) — 이름은 서버가 준 운영 데이터다 */
function approverLabel(subWork: SubWorkDetail): string {
  const name = subWork.authorizerAuthorityName ?? "승인자";
  return subWork.authorizerAuthorityCode ? `${name}(${subWork.authorizerAuthorityCode})` : name;
}

export function nextStepOf(
  subWork: SubWorkDetail,
  ctx: { canActOnOwnerTasks: boolean },
): NextStep {
  const stage = WORK_STTS_NM[subWork.workStatus];
  const approval = subWork.approvalRequired
    ? `완료 승인은 ${approverLabel(subWork)} 권한이 있는 사람이 합니다.`
    : `이 유형은 승인 단계가 없습니다 — 검토 단계에서 ${OWNER_OR_MANAGER}이 완료 승인을 누르면 완료됩니다.`;

  const blocks: NextStepBlock[] = [];

  switch (subWork.workStatus) {
    case "PLANNING": {
      if (!ctx.canActOnOwnerTasks) {
        blocks.push({ kind: "permission", text: `착수는 ${OWNER_OR_MANAGER}이 누릅니다.` });
      }
      return { stage, next: "착수", blocks, approval };
    }
    case "IN_PROGRESS": {
      // 완료 점검으로 잠그는 것은 #39의 규칙 — 서버는 이 단계에서 보지 않지만 덜 채운 채 올리면
      // 승인자가 곧바로 반려할 수밖에 없어 한 바퀴가 헛돈다
      const checklist = checklistBlock(subWork, "요청할");
      if (checklist) blocks.push(checklist);
      if (!ctx.canActOnOwnerTasks) {
        blocks.push({
          kind: "permission",
          text: `완료 승인 요청은 ${OWNER_OR_MANAGER}이 누릅니다.`,
        });
      }
      return { stage, next: "완료 승인 요청", blocks, approval };
    }
    case "REVIEW": {
      const checklist = checklistBlock(subWork, "완료 승인할");
      if (checklist) blocks.push(checklist);
      if (subWork.quorum.needed && subWork.quorum.met !== true) {
        blocks.push({
          kind: "quorum",
          text: `동의 ${subWork.quorum.currentCount ?? 0}/${subWork.quorum.requiredCount ?? 0} — 정족수를 채워야 완료 승인할 수 있습니다.`,
        });
      }
      if (!subWork.canApprove) {
        blocks.push({
          kind: "permission",
          text: subWork.approvalRequired
            ? `완료 승인 권한이 없습니다 — ${approverLabel(subWork)} 권한이 필요합니다.`
            : `완료 승인은 ${OWNER_OR_MANAGER}이 누릅니다.`,
        });
      }
      return { stage, next: "완료 승인", blocks, approval };
    }
    case "DONE":
      return { stage, next: null, blocks, approval };
  }
}

export function NextStepGuide({
  subWork,
  canActOnOwnerTasks,
  className,
}: {
  subWork: SubWorkDetail;
  canActOnOwnerTasks: boolean;
  className?: string;
}) {
  const step = nextStepOf(subWork, { canActOnOwnerTasks });

  if (step.next === null) {
    return (
      <div className={cn("text-center text-[13.5px] text-n400", className)}>
        완료했습니다 · {formatDt(subWork.completedAt) || "완료 일시 없음"}
      </div>
    );
  }

  return (
    <div className={cn("rounded-[10px] bg-black/3 px-3 py-[10px] text-[13.5px]", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span>
          <span className="text-n500">지금</span>{" "}
          <span className="font-medium">{step.stage}</span>
        </span>
        <span>
          <span className="text-n500">다음</span>{" "}
          <span className="font-medium">{step.next}</span>
          {step.blocks.length === 0 && (
            <span className="text-n400"> · 지금 누를 수 있습니다</span>
          )}
        </span>
      </div>
      {step.blocks.length > 0 && (
        <ul className="mt-[6px] flex flex-col gap-[4px]">
          {step.blocks.map((b) => (
            <li key={b.kind} className="flex items-start gap-2 text-n400">
              <Badge tone="outline" className="flex-none">
                {BLOCK_LABEL[b.kind]}
              </Badge>
              <span className="min-w-0">{b.text}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-[6px] text-n500">{step.approval}</div>
    </div>
  );
}
