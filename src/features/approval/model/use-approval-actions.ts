"use client";

import { useAprvStore } from "@/entities/approval";
import { useSessionStore } from "@/entities/session";
import { completedPatch, useSubWorkStore } from "@/entities/sub-work";
import { TODAY } from "@/shared/config/constants";
import { flash } from "@/shared/ui";

/**
 * 승인 처리 오케스트레이션 —
 * sub_work_aprv(승인) · sub_work_rjct(반려) · sub_work(승인_상태·업무_상태)를 함께 갱신한다.
 */
export function useApprovalActions() {
  const approveInStore = useAprvStore((s) => s.approve);
  const voteInStore = useAprvStore((s) => s.vote);
  const rejectInStore = useAprvStore((s) => s.reject);
  const updateSubWork = useSubWorkStore((s) => s.updateSubWork);
  const addSubWorkSttsHstry = useSubWorkStore((s) => s.addSubWorkSttsHstry);
  const mbrId = useSessionStore((s) => s.mbrId);

  const decide = (
    subWorkAprvId: number,
    subWorkId: number,
    ok: boolean,
    rjctRsn = "",
  ) => {
    if (ok) {
      approveInStore(subWorkAprvId, mbrId);
      updateSubWork(subWorkId, { aprvSttsCd: "APPROVED", ...completedPatch() });
    } else {
      rejectInStore(subWorkId, mbrId, rjctRsn);
      updateSubWork(subWorkId, {
        aprvSttsCd: "REJECTED",
        workSttsCd: "IN_PROGRESS",
      });
    }
    addSubWorkSttsHstry({
      subWorkId,
      prfmrId: mbrId,
      chgRsn: ok ? "승인 완료" : `반려 · ${rjctRsn}`,
      chgDt: `${TODAY}T10:00:00`,
    });
    flash(ok ? "승인했습니다" : `반려했습니다 · ${rjctRsn}`);
  };

  const vote = (subWorkAprvId: number, agreYn: boolean) => {
    voteInStore(subWorkAprvId, mbrId, agreYn);
    flash(agreYn ? "동의를 등록했습니다" : "부동의를 등록했습니다");
  };

  /** 하위 업무 상세에서의 직접 반려 */
  const rejectSubWork = (subWorkId: number, rjctRsn: string) => {
    rejectInStore(subWorkId, mbrId, rjctRsn);
    updateSubWork(subWorkId, {
      aprvSttsCd: "REJECTED",
      workSttsCd: "IN_PROGRESS",
    });
    addSubWorkSttsHstry({
      subWorkId,
      prfmrId: mbrId,
      chgRsn: `반려 · ${rjctRsn}`,
      chgDt: `${TODAY}T10:00:00`,
    });
    flash(`반려했습니다 · ${rjctRsn}`);
  };

  return { decide, vote, rejectSubWork };
}
