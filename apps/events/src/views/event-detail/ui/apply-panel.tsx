import Link from "next/link";
import {
  eventReceiptBadge,
  formatCapacity,
  type EventReceiptStatus,
  type PublicEventDetail,
} from "@/entities/event";
import { ROUTES } from "@/shared/config/routes";
import { formatEventPeriod } from "@/shared/lib/date";
import { Card } from "@/shared/ui";

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
 */
export function ApplyPanel({ event }: { event: PublicEventDetail }) {
  const period = formatEventPeriod(event.eventBgngDt, event.eventEndDt);
  const receipt = eventReceiptBadge(event.receiptStatus);
  const open = event.receiptStatus === "ACCEPTING" && event.formId !== null;

  return (
    <Card className="flex flex-col gap-[10px] lg:sticky lg:top-[16px]">
      {period && <PanelRow label="일시" value={period} />}
      {event.plcNm && <PanelRow label="장소" value={event.plcNm} />}
      <PanelRow label="참가" value={formatCapacity(event.confirmedCount, event.ptcpLmtCnt)} />
      {receipt && <PanelRow label="모집" value={receipt.label} />}

      {event.receiptStatus && (
        <>
          <div className="h-px bg-bg" />
          {open ? (
            <>
              <Link
                href={ROUTES.eventApply(event.eventId)}
                className="rounded-xl bg-accent px-[16px] py-[12px] text-center text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                신청하기
              </Link>
              <p className="text-center text-[12.5px] leading-[1.6] text-n500">
                신청은 회원만 할 수 있습니다 — 아직 회원이 아니어도 신청 화면에서 가입까지
                마칠 수 있습니다
              </p>
            </>
          ) : (
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

/**
 * 신청할 수 없는 이유 한 줄 — **코드로 가른다**(표시 문자열로 비교하지 않는다).
 *
 * 아직 시작하지 않은 모집만 따로 말한다. 그때는 기다리면 열리지만 마감·종료는 그렇지 않아,
 * 하나로 뭉뚱그리면 다시 올 이유가 있는 사람과 없는 사람이 같은 문장을 읽는다.
 *
 * 모집 중인데도 폼을 가리키지 못하는 경우(`ACCEPTING`인데 `formId`가 없다)는 아래 기본 문구로
 * 덮는다 — 신청자에게는 "지금은 신청할 수 없다"이고, 그 이상은 운영 사정이라 화면이 설명할
 * 것이 아니다.
 */
function closedMessage(receiptStatus: EventReceiptStatus | null): string {
  return receiptStatus === "SCHEDULED" || receiptStatus === "DRAFT"
    ? "아직 모집이 시작되지 않았습니다 — 모집 기간에 다시 확인해 주세요"
    : "지금은 신청을 받지 않습니다 — 모집 기간에 다시 확인해 주세요";
}

function PanelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-[12px] text-[14.5px]">
      <span className="shrink-0 text-n500">{label}</span>
      <b className="text-right font-semibold">{value}</b>
    </div>
  );
}
