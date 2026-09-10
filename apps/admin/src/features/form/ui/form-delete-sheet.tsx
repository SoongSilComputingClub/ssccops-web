"use client";

import {
  FORM_DELETE_CONFIRM_TITLE,
  FORM_DELETE_HINT,
  FORM_DELETE_NO_RESPONSE_NOTE,
  formDeleteResponseWarning,
} from "@/entities/form";
import { formatDt } from "@/shared/lib/date";
import { Sheet } from "@/shared/ui";

/*
 * 폼 삭제 확인 시트 (ssccops-web#359 · ssccops#261 결정 코멘트).
 *
 * ── 왜 묻는가 ──────────────────────────────────────────────────
 * 접수 마감(FormCloseSheet)과 같은 이유가 아니다. 마감은 되돌리기 전까지의 피해가 응답자 쪽에
 * 생기는 조작이고, 삭제는 **되돌릴 수 있다는 사실을 아는 사람만이 감당할 수 있는 조작**이다.
 * 응답이 들어온 폼을 지우면 신청자의 '내 신청'에서도 그 항목이 사라지는데, 운영진 화면에는
 * 그 결과가 어디에도 드러나지 않는다 — 자기 목록에서 한 줄이 없어지는 것만 보인다.
 *
 * ── 이 시트가 반드시 말해야 하는 것 ────────────────────────────
 * 1. **신청자 화면에서도 사라진다** (응답이 있을 때만 · `formDeleteResponseWarning`)
 * 2. 되살릴 수 있고 그 자리가 어디인지 (`FORM_DELETE_HINT`)
 *
 * 응답 수를 상자에 함께 보여주는 것은 "지금 무엇이 딸려 가는가"를 판단할 유일한 단서라서다 —
 * 마감 시트가 접수 종료 일시를 보여주는 자리와 같다.
 *
 * ── 왜 문구를 여기서 짓지 않는가 ───────────────────────────────
 * 문장은 전부 entities/form/model/display.ts에서 온다. 삭제 안내는 이 시트 말고도 목록 카드의
 * 잠금(시스템 폼)과 오류 매핑에 닿아 있어서, 여기서 새로 쓰면 같은 상황이 화면마다 다른
 * 문장으로 갈린다.
 */
export function FormDeleteSheet({
  open,
  formTtlNm,
  responseCount,
  rcptEndDt,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  formTtlNm: string;
  /** 서버 집계 — 제출 이상만 세고 작성 중 응답은 빠진다 */
  responseCount: number;
  rcptEndDt: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      open={open}
      title={FORM_DELETE_CONFIRM_TITLE}
      hint={FORM_DELETE_HINT}
      onClose={onClose}
      // 연타는 훅이 막지만, 진행 중에는 눌러도 아무 일이 없다는 것을 문구로 보인다
      onOk={() => {
        if (!pending) onConfirm();
      }}
      okLabel={pending ? "지우는 중…" : "지우기"}
    >
      <div className="rounded-[12px] border border-line p-3">
        <div className="text-[15px] font-medium">{formTtlNm}</div>
        <div className="mt-[6px] text-[13.5px] text-n500">
          접수 종료 일시 · {formatDt(rcptEndDt) || "미설정"}
        </div>
        <div className="mt-[2px] text-[13.5px] text-n500">응답 {responseCount}건</div>
      </div>
      {/*
        **응답이 있을 때만 경고한다.** 0건인 폼에까지 "신청자 화면에서 사라진다"고 말하면
        사라질 것이 없는데 경고가 뜨고, 그렇게 매번 뜨는 경고는 정작 응답이 있을 때 넘겨진다.
        대신 지금 사라지는 것이 목록의 한 줄뿐이라는 사실을 담담히 적는다.

        경고를 danger 톤 상자로 감싸는 것은 이 화면에서 **운영진이 유일하게 모를 수 있는
        사실**이기 때문이다 — 나머지는 자기 목록에서 눈으로 확인할 수 있다.
      */}
      {responseCount > 0 ? (
        <div className="mt-3 rounded-[12px] bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger">
          {formDeleteResponseWarning(responseCount)}
        </div>
      ) : (
        <div className="mt-3 text-[13.5px] text-n400">{FORM_DELETE_NO_RESPONSE_NOTE}</div>
      )}
    </Sheet>
  );
}
