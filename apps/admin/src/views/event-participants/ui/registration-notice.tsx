"use client";

import type { EventParticipantRegistration } from "@/entities/event";
import { Badge, Button } from "@/shared/ui";

/*
 * 등록·승격 직후의 알림 패널 (#145).
 *
 * ── 왜 토스트가 아닌가 ──────────────────────────────────────────
 * 여기 실리는 두 가지는 **막지 않고 알리는 사실**이다. 정원 초과는 D5가 정원을 참고치로
 * 뒀기 때문에 등록이 이미 끝난 뒤에 오고, 탈퇴·제명 경고도 서버가 등록을 거절하지 않는다.
 * 몇 초 뒤 사라지는 토스트로 알리면 정원을 넘긴 사실도, 조직을 떠난 회원을 명단에 올린
 * 사실도 아무도 모르게 지나간다 — 회원 상태 변경의 경고 패널(#48)과 같은 판단이다.
 * 닫기는 사용자가 직접 누른다("봤다"는 표시이지 처리했다는 뜻은 아니다).
 *
 * 경고 문구는 **서버 문장을 그대로** 쓴다. 코드를 모르는 경고가 새로 생겨도 삼키지 않기
 * 위해서다 — 화면이 아는 코드만 그리면 그 사실만 조용히 사라진다.
 */

/** 알릴 것이 있는가 — 없으면 화면은 패널 자체를 그리지 않는다 */
export function hasNotice(registration: EventParticipantRegistration): boolean {
  return registration.overCapacity || registration.warnings.length > 0;
}

export function RegistrationNotice({
  registration,
  onDismiss,
}: {
  registration: EventParticipantRegistration;
  onDismiss: () => void;
}) {
  const { confirmedCount, ptcpLmtCnt, overCapacity, warnings } = registration;

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber bg-amber-soft p-[18px]"
    >
      <div className="flex flex-wrap items-start gap-[10px] lg:flex-nowrap">
        <div className="mt-[3px] flex size-[18px] flex-none items-center justify-center rounded-full bg-amber text-[12px] font-bold text-white">
          !
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-medium text-amber">
            등록은 끝났지만 확인할 것이 있습니다
          </div>
          <div className="mt-[10px] flex flex-col gap-[7px] text-[14.5px]">
            {overCapacity && (
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge tone="amber">정원 초과</Badge>
                <span>
                  확정 인원이 정원을 넘었습니다
                  {/* 서버가 세어 준 값이 있을 때만 수를 적는다 — 없는 값을 만들지 않는다 */}
                  {confirmedCount !== null &&
                    ptcpLmtCnt !== null &&
                    ` (확정 ${confirmedCount}명 · 정원 ${ptcpLmtCnt}명)`}
                </span>
              </div>
            )}
            {warnings.map((warning) => (
              <div key={warning.code} className="flex flex-wrap items-baseline gap-2">
                <Badge tone="grey">회원 상태</Badge>
                <span>{warning.message}</span>
                {warning.count > 0 && (
                  <span className="text-[13px] text-n400">({warning.count}건)</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-[10px] text-[13px] text-n400">
            정원은 참고치라 등록을 막지 않습니다 — 인원을 맞추려면 확정된 참가자의 참가를
            취소해주세요.
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full lg:w-auto"
          onClick={onDismiss}
        >
          확인했습니다
        </Button>
      </div>
    </div>
  );
}
