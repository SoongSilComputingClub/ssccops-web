"use client";

import { useMemo, useState } from "react";
import {
  assignableMemberLabel,
  useAssignableMembers,
} from "@/features/member";
import {
  PTCP_RGST_STTS_CDS,
  PTCP_STTS_NM,
  type PtcpSttsCd,
} from "@/shared/config/codes";
import { cn } from "@/shared/lib/cn";
import { SearchInput, Segmented, Sheet } from "@/shared/ui";

/*
 * 회원 직접 추가 시트 (#145 · POST /v1/events/{eventId}/participants — 수동 등록).
 *
 * 폼 없는 공지형 행사와 현장 등록을 위한 자리다. 후보는 **서버에서 받는다**
 * (GET /v1/members/assignable · 담당자 선택과 같은 목록) — 명부 열람 권한(MEMBER_MANAGE)이
 * 없는 행사 운영자도 회원을 골라야 하는데, 그 목록은 인증만으로 활동 회원 전량을 준다.
 *
 * 검색은 **받아 온 목록 안에서** 한다. `/assignable`에는 검색어 파라미터가 없고 페이징도
 * 없어(features/member/model/use-assignable-members.ts) 목록 전량이 이미 손에 있다 —
 * 이 자리에서 서버로 다시 나가면 없는 계약을 지어내는 것이 된다.
 *
 * 학번·연락처로는 찾을 수 없다. `/assignable`이 그 값을 아예 내리지 않기 때문이고, 화면이
 * 없는 값을 찾는 척하면 "학번으로 검색했는데 안 나온다"가 고장으로 읽힌다.
 */

export function ManualRegisterSheet({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (mbrId: number, ptcpSttsCd: PtcpSttsCd) => void;
}) {
  const assignable = useAssignableMembers();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [sttsLabel, setSttsLabel] = useState<string>(PTCP_STTS_NM.CONFIRMED);

  const matched = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return assignable.members;
    return assignable.members.filter((m) =>
      assignableMemberLabel(m).toLowerCase().includes(q),
    );
  }, [assignable.members, keyword]);

  /* 표시명 → 코드. 화면에는 코드값을 내보내지 않으므로 되돌리는 자리가 한 곳 필요하다 */
  const ptcpSttsCd =
    PTCP_RGST_STTS_CDS.find((cd) => PTCP_STTS_NM[cd] === sttsLabel) ?? "CONFIRMED";

  const close = () => {
    setKeyword("");
    setSelected(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      title="회원 직접 추가"
      hint="폼 없이 진행하는 행사나 현장 등록에 씁니다. 명단에 올린 사람은 신청 기록 없이 남습니다."
      onClose={close}
      okLabel="명단에 추가"
      okDisabled={selected === null || busy || assignable.status !== "ready"}
      okTitle={
        assignable.status !== "ready"
          ? "회원 목록을 불러오는 중입니다"
          : selected === null
            ? "추가할 회원을 골라주세요"
            : undefined
      }
      onOk={() => {
        if (selected === null) return;
        onSubmit(selected, ptcpSttsCd);
        close();
      }}
    >
      <div className="flex flex-col gap-3">
        <Segmented
          options={PTCP_RGST_STTS_CDS.map((cd) => PTCP_STTS_NM[cd])}
          value={sttsLabel}
          onChange={setSttsLabel}
        />
        <SearchInput
          value={keyword}
          onChange={setKeyword}
          placeholder="이름 · 기수 · 역할로 찾기"
        />
        <div className="max-h-[240px] overflow-y-auto rounded-[12px] border border-line">
          {assignable.status === "loading" && (
            <div className="px-3 py-4 text-[14px] text-n500">불러오는 중…</div>
          )}
          {assignable.status === "error" && (
            <div className="px-3 py-4 text-[14px] text-danger">
              {assignable.errorMessage}
            </div>
          )}
          {assignable.status === "ready" && matched.length === 0 && (
            <div className="px-3 py-4 text-[14px] text-n500">
              {keyword.trim()
                ? "조건에 맞는 회원이 없습니다."
                : "고를 수 있는 회원이 없습니다."}
            </div>
          )}
          {assignable.status === "ready" &&
            matched.map((m) => (
              <button
                key={m.memberId}
                type="button"
                onClick={() => setSelected(m.memberId)}
                className={cn(
                  "block w-full cursor-pointer px-3 py-[9px] text-left text-[15px] hover:bg-accent-soft",
                  m.memberId === selected && "bg-accent-soft font-semibold text-accent",
                )}
              >
                {assignableMemberLabel(m)}
              </button>
            ))}
        </div>
      </div>
    </Sheet>
  );
}
