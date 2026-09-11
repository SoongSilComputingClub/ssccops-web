"use client";

import { useState } from "react";
import type { MemberDeletionPreview } from "@/entities/member";
import { Field, Sheet, TextField } from "@/shared/ui";
import {
  MEMBER_DELETE_CONFIRM_TITLE,
  MEMBER_DELETE_GOOGLE_NOTE,
  MEMBER_DELETE_HINT,
  MEMBER_DELETE_NAME_REQUIRED,
  MEMBER_DELETE_OK_LABEL,
  MEMBER_DELETE_PENDING_LABEL,
  memberDeleteBlockedText,
  memberDeleteCascadeText,
} from "../model/member-delete-copy";

/*
 * 회원 삭제 확인 시트 (임시 · ADR-0021 · ssccops-web#411).
 *
 * 형판은 features/event/ui/event-delete-sheet.tsx다. 다른 점은 **되돌릴 수 없다**는 것이고,
 * 그 차이가 이 시트에 폼·행사 시트에 없는 두 가지를 넣었다.
 *
 * ── 1. 회원명을 직접 입력해야 열린다 ────────────────────────────
 * 폼·행사는 지워도 휴지통에서 되살린다. 이쪽은 행이 사라지고 응답·참가·이력이 딸려 가며
 * 되살릴 길이 없다. 그래서 «지우기»를 한 번 더 누르는 확인이 아니라, **지금 누구를 지우는지를
 * 손으로 쓰게** 한다 — 회원 목록에서 옆 사람을 눌러 들어온 채 습관적으로 확인을 누르는 실수를
 * 막는 것은 이름을 옮겨 적는 동작뿐이다. 대조는 trim 후 완전 일치다 — 앞뒤 공백은 실수이고
 * 그 밖의 차이는 다른 사람이다.
 *
 * 버튼은 감추지 않고 잠근다(`okDisabled` + `okTitle`) — 왜 안 눌리는지가 화면에 있어야 한다.
 *
 * ── 2. 구글 계정 안내가 반드시 있다 ─────────────────────────────
 * `MEMBER_DELETE_GOOGLE_NOTE` 주석 참고. 이것이 복구 경로이고, 중복 계정을 정리하는 목적
 * 자체가 «지우고 → 다시 로그인 → 명부 행에 연결»이다. 시트에서 이 문장이 빠지면 운영진은
 * 지운 뒤 당사자에게 무엇을 안내해야 하는지 모른다.
 *
 * ── `blockedBy`가 있으면 확인 버튼이 없다 ───────────────────────
 * 행사 시트는 서버 거절(409)이 와도 버튼을 남겼다 — 다른 탭에서 정리한 뒤 다시 누르는 길을
 * 막지 않으려고. 이쪽은 미리보기가 이미 "지울 수 없다"고 말한 상태라 버튼이 있으면 눌러 봐야
 * 409다. 대신 무엇으로 남아 있는지를 그대로 보여 준다(폼 작성자 · 승인자 …). 그 자리는 이
 * 회원의 것이 아니라 남의 기록이라 여기서 정리할 수 없고, 정리한 뒤 다시 열면 된다.
 */
export function MemberDeleteSheet({
  preview,
  memberName,
  blockedMessage,
  pending,
  onClose,
  onConfirm,
}: Readonly<{
  /** 미리보기 응답 — null이면 닫혀 있다 */
  preview: MemberDeletionPreview | null;
  /** 대조할 회원명 — 회원 상세 응답의 `name` */
  memberName: string;
  /** 서버가 삭제를 거절한 사유. 빈 문자열이면 거절받은 적 없다 */
  blockedMessage: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  const [typed, setTyped] = useState("");

  if (!preview) return null;

  const blocked = preview.blockedBy.length > 0;
  const matches = typed.trim() === memberName.trim();

  const close = () => {
    setTyped("");
    onClose();
  };

  return (
    <Sheet
      open
      title={MEMBER_DELETE_CONFIRM_TITLE}
      hint={blocked ? undefined : MEMBER_DELETE_HINT}
      onClose={close}
      // 막힌 회원에게는 확인 버튼 자체가 없다 — onOk를 주지 않으면 Sheet가 그리지 않는다
      onOk={
        blocked
          ? undefined
          : () => {
              if (!pending && matches) onConfirm();
            }
      }
      okLabel={pending ? MEMBER_DELETE_PENDING_LABEL : MEMBER_DELETE_OK_LABEL}
      okDisabled={pending || !matches}
      okTitle={matches ? undefined : MEMBER_DELETE_NAME_REQUIRED}
      okVariant="danger"
      cancelLabel={blocked ? "닫기" : "취소"}
    >
      <div className="rounded-[12px] border border-line p-3">
        <div className="text-[15px] font-medium">{memberName}</div>
        {/* 건수는 미리보기가 준 값 그대로다 — 무엇이 딸려 가는지를 판단할 유일한 단서 */}
        <div className="mt-[6px] text-[13.5px] text-n500">{memberDeleteCascadeText(preview)}</div>
      </div>

      {blocked ? (
        <div
          role="alert"
          className="mt-3 rounded-[12px] border border-danger bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger"
        >
          {memberDeleteBlockedText(preview.blockedBy)}
        </div>
      ) : (
        <>
          {/*
            복구 경로. danger가 아니라 amber인 것은 경고가 아니라 **안내**라서다 — 지운 뒤에도
            남는 것이 무엇이고 그것으로 어떻게 되돌아오는지를 말한다.
          */}
          <div className="mt-3 rounded-[12px] border border-amber bg-amber-soft px-3 py-[10px] text-[13px] leading-[1.6] text-amber">
            {MEMBER_DELETE_GOOGLE_NOTE}
          </div>

          <Field label="회원명 확인" required className="mt-4">
            <TextField
              value={typed}
              placeholder={memberName}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
            <div className="mt-[6px] text-[12.5px] text-n500">
              지울 회원의 이름 <b>{memberName}</b>을(를) 그대로 입력해주세요
            </div>
          </Field>

          {/*
            서버의 거절 사유. 안내 상자와 색을 가른다 — 위는 "지우면 이렇게 된다"이고 이것은
            "지울 수 없었다"라, 같은 모양이면 거절이 안내에 묻힌다(행사 시트와 같은 판단).
          */}
          {blockedMessage && (
            <div
              role="alert"
              className="mt-3 rounded-[12px] border border-danger bg-danger/10 px-[14px] py-[10px] text-[13.5px] leading-[1.6] text-danger"
            >
              {blockedMessage}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
