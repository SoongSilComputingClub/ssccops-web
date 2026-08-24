"use client";

import { formatDt } from "@/shared/lib/date";
import { Sheet } from "@/shared/ui";

/*
 * 접수 마감 확인 시트.
 *
 * '마감'은 누르는 즉시 공개 링크의 접수를 끊는다. 접수 중인 폼을 잘못 마감하면 그 사이
 * 작성하던 응답자가 제출을 못 하고, 되돌리더라도 그 시간 동안의 이탈은 남는다. 되돌릴 수 없는
 * 행위는 아니지만(마감 철회 CLOSED→OPEN이 있다) **되돌리기 전까지의 피해가 사용자 쪽에
 * 발생**하므로 한 번 묻는다.
 *
 * 반대로 '접수 시작'에는 확인을 두지 않는다. 잘못 눌러도 곧바로 마감할 수 있고, 확인 단계를
 * 양쪽에 다 붙이면 매번 두 번 누르게 되어 정작 마감 확인이 습관적으로 넘겨진다.
 *
 * 응답 수와 접수 종료 일시를 함께 보여주는 것은 "지금 무엇을 끊는가"를 판단할 유일한 단서라서다.
 * 종료 일시가 남아 있는데 마감하는 것이 실수로 누르기 가장 쉬운 경우다.
 */
export function FormCloseSheet({
  open,
  formTtlNm,
  rcptEndDt,
  responseCount,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  formTtlNm: string;
  rcptEndDt: string | null;
  responseCount: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet
      open={open}
      title="접수를 마감할까요?"
      hint="마감하면 공개 링크로 더 이상 응답을 받지 않습니다"
      onClose={onClose}
      // 연타로 두 번 나가는 것은 훅이 막지만, 진행 중에는 눌러도 아무 일이 없다는 것을 문구로 보인다
      onOk={() => {
        if (!pending) onConfirm();
      }}
      okLabel={pending ? "마감하는 중…" : "마감"}
    >
      <div className="rounded-[12px] border border-line p-3">
        <div className="text-[15px] font-medium">{formTtlNm}</div>
        <div className="mt-[6px] text-[13.5px] text-n500">
          접수 종료 일시 · {formatDt(rcptEndDt) || "미설정"}
        </div>
        <div className="mt-[2px] text-[13.5px] text-n500">응답 {responseCount}건</div>
      </div>
      <div className="mt-3 text-[13.5px] text-n400">
        지금 작성 중인 응답자는 제출하지 못합니다. 마감한 뒤에도 다시 접수를 시작할 수 있습니다.
      </div>
    </Sheet>
  );
}
