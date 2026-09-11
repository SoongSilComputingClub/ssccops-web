import { eventReceiptBadge, formatCapacity, type PublicEventDetail } from "@/entities/event";
import { formatEventPeriod } from "@/shared/lib/date";
import { Card } from "@/shared/ui";
import { ApplyActions } from "./apply-actions";
import { closedMessage } from "./closed-message";

/**
 * 상세 오른쪽 요약 패널 — 일시 · 장소 · 확정 인원과 신청 버튼.
 *
 * **버튼이 열리는 조건은 둘이다** (wave2 D3 · #154): 연결된 폼이 모집 중(`ACCEPTING`)이고
 * 그 폼을 실제로 가리킬 수 있어야 한다(`formId`). 접수 상태만 보고 열면 폼을 가리키지 못하는
 * 행사에서 신청 화면이 "신청서를 찾을 수 없습니다"로 끝난다.
 *
 * 모집 중이 아니어도 **버튼 자리를 감추지 않는다.** 감추면 신청이라는 길이 없는 공지형 행사와
 * 구별되지 않는다 — 잠긴 버튼과 상태에 맞는 문구로 "지금은 아니다"를 말한다. 문구는 배지
 * 사전(`entities/event`)의 표시명을 쓰고 코드값은 드러내지 않는다.
 *
 * 폼이 연결되지 않은 공지형 행사(`receiptStatus === null`)는 신청이라는 개념이 없으므로
 * 버튼도 안내도 그리지 않는다.
 *
 * 버튼 자리 자체는 클라이언트 컴포넌트(`ApplyActions`)다 (ssccops#278). 이 패널은 익명 SSR이라
 * "이 회원이 이미 냈는가"를 알 수 없고, 그것을 모르면 낸 사람에게도 '신청하기'만 보여 자기가
 * 무엇을 냈는지 볼 길이 없다. 일시·장소·인원은 크롤러도 읽는 값이라 여기 남는다.
 */
export function ApplyPanel({ event }: { event: PublicEventDetail }) {
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);
  const receipt = eventReceiptBadge(event.receiptStatus);

  return (
    <Card className="flex flex-col gap-[10px] lg:sticky lg:top-[16px]">
      {period && <PanelRow label="일시" value={period} />}
      {event.plcNm && <PanelRow label="장소" value={event.plcNm} />}
      <PanelRow label="참가" value={formatCapacity(event.confirmedCount, event.ptcpLmtCnt)} />
      {receipt && <PanelRow label="모집" value={receipt.label} />}

      {event.receiptStatus && (
        <>
          <div className="h-px bg-bg" />
          {event.formId !== null ? (
            <ApplyActions
              eventId={event.eventId}
              formId={event.formId}
              receiptStatus={event.receiptStatus}
              mltplRspnsYn={event.mltplRspnsYn}
            />
          ) : (
            /*
              접수 상태는 있는데 폼을 가리키지 못한다 — 열면 신청 화면이 "신청서를 찾을 수
              없습니다"로 끝난다. 운영 사정이라 화면이 설명할 것이 아니고, 잠긴 버튼과 기본
              문구로 "지금은 아니다"만 말한다.
            */
            <>
              <button
                type="button"
                disabled
                title={closedMessage(event.receiptStatus)}
                className="cursor-not-allowed rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white opacity-45"
              >
                신청하기
              </button>
              <p className="text-center text-[12.5px] leading-[1.6] text-n500">
                {closedMessage(event.receiptStatus)}
              </p>
            </>
          )}
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
