"use client";

import { formatDt } from "@/shared/lib/date";
import { Sheet } from "@/shared/ui";
import {
  EVENT_DELETE_CONFIRM_TITLE,
  EVENT_DELETE_HINT,
  EVENT_DELETE_NO_PARTICIPANT_NOTE,
  eventDeleteParticipantWarning,
} from "../model/event-delete-copy";

/*
 * 행사 삭제 확인 시트 (ssccops-web#391 · ADR-0020).
 *
 * 형판은 features/form/ui/form-delete-sheet.tsx다 — 묻는 이유도 같다. 삭제는 **되돌릴 수 있다는
 * 사실을 아는 사람만이 감당할 수 있는 조작**이고, 참가자가 있는 행사를 지우면 참가자의 '내
 * 신청'에서도 그 행사가 사라지는데 운영진 화면에는 그 결과가 어디에도 드러나지 않는다.
 *
 * ── 이 시트가 반드시 말해야 하는 것 ────────────────────────────
 * 1. **참가자 화면에서도 사라진다** (확정 참가자가 있을 때만 · `eventDeleteParticipantWarning`)
 * 2. 되살릴 수 있고 그 자리가 어디인지 (`EVENT_DELETE_HINT`)
 * 3. **서버가 거절했다면 왜인지** (`blockedMessage`) — 폼 시트에는 없는 자리다
 *
 * ── 왜 거절 사유가 시트 안에 남는가 ────────────────────────────
 * 학술 활동이 딸린 행사는 서버가 409로 막는데(ADR-0020), 목록 응답에는 학술 연결 여부가 없어
 * 화면이 버튼을 미리 잠글 수 없다. 그러면 사용자는 확인 시트까지 와서 거절을 받는다 — 그것을
 * 토스트로 날리면 몇 초 뒤 사라져 "왜 안 되지"를 다시 볼 수 없고, 같은 버튼을 다시 누른다.
 * 시트를 닫지 않고 사유를 그 자리에 두면 다음 행동(학술 쪽에서 프로그램을 정리한다)이 눈앞에
 * 남는다. 확인 버튼은 그대로 둔다 — 다른 탭에서 정리한 뒤 여기서 다시 누르는 길을 막지 않는다.
 *
 * ── 왜 문구를 여기서 짓지 않는가 ───────────────────────────────
 * 문장은 전부 features/event/model/event-delete-copy.ts에서 온다. 삭제 안내는 이 시트 말고도
 * 목록 카드의 잠금과 오류 매핑에 닿아 있어서, 여기서 새로 쓰면 같은 상황이 화면마다 다른
 * 문장으로 갈린다.
 */
export function EventDeleteSheet({
  open,
  eventTtl,
  confirmedCount,
  eventBgngDt,
  blockedMessage,
  pending,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  eventTtl: string;
  /** 서버 집계 — 확정 참가자만 센다(심사 중 응답은 목록에 오지 않는다) */
  confirmedCount: number;
  eventBgngDt: string | null;
  /** 서버가 이 행사를 지울 수 없다고 한 사유. 빈 문자열이면 거절받은 적 없다 */
  blockedMessage: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <Sheet
      open={open}
      title={EVENT_DELETE_CONFIRM_TITLE}
      hint={EVENT_DELETE_HINT}
      onClose={onClose}
      // 연타는 훅이 막지만, 진행 중에는 눌러도 아무 일이 없다는 것을 문구로 보인다
      onOk={() => {
        if (!pending) onConfirm();
      }}
      okLabel={pending ? "지우는 중…" : "지우기"}
    >
      <div className="rounded-[12px] border border-line p-3">
        <div className="text-[15px] font-medium">{eventTtl}</div>
        {/* 행사 일시는 "지금 무엇을 지우는가"를 가르는 단서다 — 같은 제목의 회차가 여럿일 때 특히 */}
        <div className="mt-[6px] text-[13.5px] text-n500">
          행사 일시 · {formatDt(eventBgngDt) || "미설정"}
        </div>
        <div className="mt-[2px] text-[13.5px] text-n500">확정 참가자 {confirmedCount}명</div>
      </div>
      {/*
        **확정 참가자가 있을 때만 경고한다.** 0명인 행사에까지 "참가자 화면에서 사라진다"고 말하면
        사라질 것이 없는데 경고가 뜨고, 그렇게 매번 뜨는 경고는 정작 참가자가 있을 때 넘겨진다.
        danger 톤 상자로 감싸는 것은 이 화면에서 **운영진이 유일하게 모를 수 있는 사실**이기
        때문이다 — 나머지는 자기 목록에서 눈으로 확인할 수 있다(폼 시트와 같은 판단).
      */}
      {confirmedCount > 0 ? (
        <div className="mt-3 rounded-[12px] bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger">
          {eventDeleteParticipantWarning(confirmedCount)}
        </div>
      ) : (
        <div className="mt-3 text-[13.5px] text-n400">{EVENT_DELETE_NO_PARTICIPANT_NOTE}</div>
      )}
      {/*
        서버의 거절 사유. 경고 상자와 같은 danger 톤이지만 테두리로 가른다 — 위는 "지우면 이렇게
        된다"이고 이것은 "지울 수 없다"라, 같은 모양이면 둘 다 경고로 읽혀 거절이 묻힌다.
      */}
      {blockedMessage && (
        <div
          role="alert"
          className="mt-3 rounded-[12px] border border-danger bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger"
        >
          {blockedMessage}
        </div>
      )}
    </Sheet>
  );
}
