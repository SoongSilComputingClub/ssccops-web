"use client";

import { useState } from "react";
import { overlapsAssignment, type MemberRoleAssignment } from "@/entities/member";
import { todayInSeoul } from "@/shared/lib/date";
import { Chip, Field, Sheet, TextField, Toggle } from "@/shared/ui";
import { useAssignableRoles } from "../model/use-member-roles";
import type { MemberRoles } from "../model/use-member-roles";

/*
 * 역할 부여 시트 (#50 · POST /v1/members/{memberId}/roles · 서버 #81).
 *
 * ── 목 스토어 조작을 서버 호출로 바꾼 자리다 ────────────────────
 * 예전에는 목 역할 스토어의 시드 역할을 늘어놓고 목 회원 스토어에 관계 행을 하나 넣었다
 * (둘 다 #54에서 제거).
 * 토스트는 떴지만 새로고침하면 되돌아갔고, 무엇보다 **그 `roleId`는 서버의 같은 번호와 아무
 * 관계가 없어** 화면에 뜬 이름과 실제로 붙는 역할이 갈릴 자리였다. 이제 선택지는 역할 조회
 * API로 받고 부여는 서버로 간다.
 *
 * ── 이 시트가 하는 판정은 셋뿐이다 ──────────────────────────────
 * 역할을 골랐는가 · 그 역할이 고른 시작일에 이미 부여돼 있는가 · 요청이 나가 있는가.
 * 셋 다 서버가 어차피 거절하거나(409 `ROLE_ALREADY_ASSIGNED`) 무의미한 요청이라 왕복 없이
 * 그 자리에서 막는다. **판정 근거는 언제나 서버다** — 여기 규칙이 낡으면 화면이 통과시킨
 * 값이 서버에서 막힐 뿐 그 반대는 없다.
 *
 * ── 종료일 입력란이 없는 것은 계약이다 ──────────────────────────
 * 서버의 부여 요청에 종료일 자리가 없다. 부여는 언제나 무기한으로 시작하고 임기가 끝나면
 * 역할 카드의 '종료'가 `roleEndYmd`를 채운다 — 받아 주면 "이미 끝난 역할을 만드는" 요청이
 * 정상 경로가 된다(서버 `MemberRoleAssignRequest` 주석).
 */

/**
 * 대표 역할이 무엇인지 화면에 남기는 한 줄 (BR-M26).
 *
 * 상세 화면이 '대표' 배지만 보여 주던 동안 그것은 **권한이 더 있는 역할처럼 읽혔다.** 실제로는
 * 사이드바 프로필 부제에 무엇을 내걸지를 정하는 표시용 값이고, 인가 판정(`AuthorityPolicy`)은
 * 이 값을 아예 보지 않는다. 역할을 붙이는 자리에서 한 번은 말해 두어야 오해가 이어지지 않는다.
 */
const REPRESENTATIVE_NOTE =
  "대표 역할은 회원당 1건이며 사이드바 프로필에 무엇을 내걸지를 정하는 표시용입니다 — 권한과는 무관합니다";

export function RoleSheet({
  memberId,
  memberName,
  open,
  roles,
  onClose,
  onAssigned,
}: {
  memberId: number;
  /** 누구에게 붙이는지를 시트 제목 아래에 남긴다 — 목록에서 잘못 누른 것을 여기서 알아채야 한다 */
  memberName: string;
  open: boolean;
  /**
   * 상세 화면이 들고 있는 훅 그대로를 받는다.
   *
   * 시트가 자기 훅을 따로 부르면 배정 목록이 두 벌이 되어, 부여 직후 카드와 시트가 서로 다른
   * 목록으로 겹침을 판정한다 — 방금 붙인 역할이 시트에서는 아직 열려 있는 상태가 된다.
   */
  roles: MemberRoles;
  onClose: () => void;
  /** 부여 성공 — 상세 화면이 토스트를 띄운다 (목록 갱신은 훅이 이미 끝냈다) */
  onAssigned: (assignment: MemberRoleAssignment) => void;
}) {
  /* 시트가 닫혀 있는 동안에는 역할 목록을 받지 않는다 — 열 때 한 번만 나간다 */
  const { roles: options, loading, errorMessage: optionsError } = useAssignableRoles(open);

  const [pick, setPick] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [representative, setRepresentative] = useState(false);

  if (!open) return null;

  /*
   * 겹침은 **고른 시작일 기준**으로 본다. 비워 두면 서버가 자기 오늘로 채우므로 미리 보기의
   * 기준도 서울 기준 오늘이다 — 브라우저 시간대로 세면 해외에서 접속한 운영자에게 하루
   * 어긋난 잠금이 보인다(shared/lib/date의 `todayInSeoul` 주석과 같은 판단).
   */
  const effectiveStart = startDate || todayInSeoul();
  const isLocked = (roleId: number) =>
    overlapsAssignment(roles.all, roleId, effectiveStart);

  const selectedLocked = pick !== null && isLocked(pick);

  const blockedReason =
    pick === null
      ? "부여할 역할을 선택하세요"
      : selectedLocked
        ? "이미 그 기간에 부여된 역할입니다 — 겹치지 않는 시작일을 고르세요"
        : "";

  const close = () => {
    setPick(null);
    setStartDate("");
    setRepresentative(false);
    roles.clearSaveError();
    onClose();
  };

  const submit = async () => {
    if (pick === null) return;

    const assigned = await roles.assign({
      roleId: pick,
      /* 비워 두면 보내지 않는다 — 서버가 자기 오늘로 채운다 */
      roleBgngYmd: startDate || null,
      rprsRoleYn: representative,
    });

    /* 실패하면 시트를 닫지 않는다 — 사유가 방금 고른 값 옆에 남아 있어야 고칠 수 있다 */
    if (!assigned) return;
    onAssigned(assigned);
    close();
  };

  return (
    <Sheet
      open
      title="역할 부여"
      hint={`${memberName} 회원 #${memberId}에게 부여할 역할을 선택하세요`}
      onClose={close}
      onOk={submit}
      okLabel={roles.saving ? "부여 중…" : "부여"}
      okDisabled={roles.saving || blockedReason !== ""}
      okTitle={blockedReason || undefined}
    >
      <Field label="부여할 역할" required className="mb-4">
        {loading ? (
          /* 선택지가 아직 오지 않았다 — 목 역할로 임시로 그리면 서버에 없는 번호를 보내게 된다 */
          <div className="text-[14px] text-n500">역할 목록을 불러오는 중…</div>
        ) : optionsError ? (
          <div className="text-[14px] text-danger">{optionsError}</div>
        ) : options.length === 0 ? (
          <div className="text-[14px] text-n500">
            등록된 역할이 없습니다 — 역할 관리에서 먼저 만들어주세요
          </div>
        ) : (
          <div className="flex flex-wrap gap-[7px]">
            {options.map((role) => {
              const locked = isLocked(role.roleId);
              return (
                <Chip
                  key={role.roleId}
                  active={pick === role.roleId}
                  disabled={locked}
                  title={
                    locked
                      ? "이 기간에 이미 부여돼 있습니다 — 종료한 뒤이거나 겹치지 않는 시작일에만 다시 부여할 수 있습니다"
                      : role.roleClsfNm
                  }
                  onClick={() => {
                    setPick(role.roleId);
                    /* 값을 다시 고르면 서버가 준 낡은 거절 사유는 더 이상 맞지 않는다 */
                    roles.clearSaveError();
                  }}
                >
                  {role.roleNm}
                  {locked ? " (부여됨)" : ""}
                </Chip>
              );
            })}
          </div>
        )}
      </Field>

      <Field
        label="시작일"
        error={selectedLocked ? "이 시작일에는 이미 같은 역할이 부여돼 있습니다" : null}
        className="mb-4"
      >
        <TextField
          type="date"
          value={startDate}
          invalid={selectedLocked}
          onChange={(e) => {
            setStartDate(e.target.value);
            roles.clearSaveError();
          }}
        />
        <div className="mt-[5px] text-[12.5px] text-n500">
          {/*
            서버의 오늘이다 — 화면이 자기 시계로 채워 보내면 시간대가 다른 기기에서 하루
            어긋난 배정이 남는다. 과거 날짜는 막지 않는다(이미 맡고 있던 역할을 뒤늦게 반영).
          */}
          비워 두면 오늘부터 시작합니다 · 종료일은 나중에 &lsquo;종료&rsquo;로 채웁니다
        </div>
      </Field>

      <Field label="대표 역할로 지정">
        <div className="flex items-start gap-[10px]">
          <Toggle
            on={representative}
            onChange={(on) => {
              setRepresentative(on);
              roles.clearSaveError();
            }}
          />
          <div className="text-[12.5px] text-n500">{REPRESENTATIVE_NOTE}</div>
        </div>
      </Field>

      {/* 서버가 거절한 사유는 시트 안에 남긴다 — 토스트로 알리면 고른 값과 나란히 볼 수 없다 */}
      {roles.saveErrorMessage && (
        <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] text-danger">
          {roles.saveErrorMessage}
        </div>
      )}
    </Sheet>
  );
}
