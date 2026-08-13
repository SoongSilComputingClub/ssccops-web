"use client";

import { useApprovalStore } from "@/entities/approval";
import { useAuditStore } from "@/entities/audit";
import { useSubWorkStore } from "@/entities/sub-work";
import { TODAY } from "@/shared/config/constants";
import { flash } from "@/shared/ui";

/**
 * 승인 처리 오케스트레이션 — 원본 decideApproval 로직 그대로:
 * 승인함 상태 + 하위 업무 단계/진행률 + 감사 로그를 함께 갱신
 */
export function useApprovalActions() {
  const updateApproval = useApprovalStore((s) => s.updateApproval);
  const voteInStore = useApprovalStore((s) => s.vote);
  const rejectByTask = useApprovalStore((s) => s.rejectByTask);
  const updateTask = useSubWorkStore((s) => s.updateTask);
  const appendAudit = useAuditStore((s) => s.append);

  const decide = (id: string, taskId: string, ok: boolean, reason = "") => {
    updateApproval(id, {
      state: ok ? "승인" : "반려",
      reason: ok ? "" : reason,
    });
    updateTask(taskId, {
      approval: "",
      stage: ok ? 4 : 2,
      ...(ok ? { progress: 100, reject: "" } : { reject: reason }),
    });
    appendAudit({
      target: "승인",
      id,
      action: ok ? "승인" : "반려",
      by: "이민우",
      before: "대기",
      after: ok ? "승인" : `반려 · ${reason}`,
      ip: "10.0.12.4",
      at: `${TODAY} 10:00`,
    });
    flash(ok ? "승인했습니다" : `반려했습니다 · ${reason}`);
  };

  const vote = (id: string, yes: boolean) => {
    voteInStore(id, yes);
    flash(yes ? "찬성을 등록했습니다" : "반대를 등록했습니다");
  };

  /** 하위 업무 상세에서의 직접 반려 (연결 승인 건 일괄 반려) */
  const rejectTask = (taskId: string, reason: string) => {
    updateTask(taskId, { approval: "", stage: 2, reject: reason });
    rejectByTask(taskId, reason);
    appendAudit({
      target: "하위 업무",
      id: taskId,
      action: "반려",
      by: "이민우",
      before: "대기",
      after: `반려 · ${reason}`,
      ip: "10.0.12.4",
      at: `${TODAY} 10:00`,
    });
    flash(`반려했습니다 · ${reason}`);
  };

  return { decide, vote, rejectTask };
}
