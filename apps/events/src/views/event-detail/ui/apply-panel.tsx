import {
  eventReceiptBadge,
  formatCapacity,
  type PublicEventDetail,
} from "@/entities/event";
import { formatEventPeriod } from "@/shared/lib/date";
import { Card } from "@/shared/ui";

/**
 * 상세 오른쪽 요약 패널 — 일시 · 장소 · 확정 인원과 신청 버튼 자리.
 *
 * **신청 버튼은 아직 아무 데도 가지 않는다.** 신청 흐름(로그인·간편가입·신청서)은 후속 이슈라
 * 지금은 모집 중일 때만 준비 중임을 알리는 잠긴 버튼을 세운다. 버튼을 아예 감추지 않는 것은
 * 이 화면을 보고 있는 사람에게 신청이라는 길이 있다는 것 자체는 알려야 하기 때문이다
 * (감추면 신청 방법이 없는 행사와 구별되지 않는다).
 *
 * 폼이 연결되지 않은 공지형 행사(receiptStatus === null)는 신청이라는 개념이 없으므로
 * 버튼도 안내도 그리지 않는다.
 */
export function ApplyPanel({ event }: { event: PublicEventDetail }) {
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const accepting = event.receiptStatus === "ACCEPTING";

  return (
    <Card className="flex flex-col gap-[10px] lg:sticky lg:top-[16px]">
      {period && <PanelRow label="일시" value={period} />}
      {event.plcNm && <PanelRow label="장소" value={event.plcNm} />}
      <PanelRow label="참가" value={formatCapacity(event.confirmedCount, event.ptcpLmtCnt)} />
      {receipt && <PanelRow label="모집" value={receipt.label} />}

      {event.receiptStatus && (
        <>
          <div className="h-px bg-bg" />
          <button
            type="button"
            disabled
            title={
              accepting
                ? "신청 기능은 준비 중입니다"
                : "지금은 신청을 받지 않습니다 — 모집 기간에 다시 확인해 주세요"
            }
            className="cursor-not-allowed rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white opacity-45"
          >
            신청하기
          </button>
          <p className="text-center text-[12.5px] leading-[1.6] text-n500">
            {accepting
              ? "신청 기능은 준비 중입니다 — 열리면 이 화면에서 바로 신청할 수 있습니다"
              : "지금은 신청을 받지 않습니다 — 모집 기간에 다시 확인해 주세요"}
          </p>
        </>
      )}
    </Card>
  );
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-[12px] text-[14.5px]">
      <span className="shrink-0 text-n500">{label}</span>
      <b className="text-right font-semibold">{value}</b>
    </div>
  );
}
