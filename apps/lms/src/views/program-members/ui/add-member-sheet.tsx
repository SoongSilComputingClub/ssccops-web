"use client";

import { useState } from "react";
import { cn } from "@ssccops/ui";
import type { AcademicProgramMember } from "@/entities/academic-program";
import { assignableMemberMeta } from "@/entities/member";
import { useAddCandidates } from "@/features/academic-program/model/use-add-candidates";
import { Sheet, TextField } from "@/shared/ui";

/*
 * 팀원 추가 — 회원 고르기 시트 (#742 · GET /v1/members/assignable → POST .../members).
 *
 * **이름을 쳐서 넣지 않고 목록에서 고른다** — 동명이인·오타(#742 「택하지 않은 길」). 검색칸은
 * 목록을 좁힐 뿐이고, 서버로 가는 값은 고른 회원의 번호다. 동명이인은 기수·대표 역할로 가른다
 * (서버가 연락처·학번을 내리지 않는 목록이다).
 *
 * 이미 확정·대기인 사람은 목록에서 뺀다(서버도 409). **제외된 사람은 남긴다** — 추가하면 같은 행이
 * 되살아나는 재합류다(지난 출석이 이어진다). 탈퇴·제명 회원은 서버가 애초에 목록에 싣지 않는다.
 *
 * 어드민 담당자 셀렉트(`AssignableMemberSelect`)를 옮겨 오지 않은 것은 그쪽이 검색 없는
 * `<select>`이고 이쪽은 좁혀 고르는 목록이라서다 — 같은 목록 API를 쓰되 모양이 다르다. 판정(누가
 * 후보인가)은 서버 한 곳이라 두 벌이 되지 않는다.
 */

export function AddMemberSheet({
  openKey,
  members,
  busy,
  onClose,
  onAdd,
}: Readonly<{
  /** 열릴 때마다 새 값 — 닫혀 있으면 null */
  openKey: number | null;
  /** 지금 명단(확정·대기·제외) — 확정·대기인 사람을 후보에서 뺀다 */
  members: AcademicProgramMember[];
  busy: boolean;
  onClose: () => void;
  onAdd: (memberId: number, name: string) => Promise<void>;
}>) {
  const candidates = useAddCandidates(openKey);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  /*
   * 시트를 다시 열면 검색어·고른 사람을 비운다 — 렌더 중 조정(React «prop이 바뀌면 상태를
   * 맞춘다»)으로 한다. effect로 비우면 한 프레임 옛 값이 보인다.
   */
  const [seenKey, setSeenKey] = useState(openKey);
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    setQuery("");
    setPicked(null);
  }

  const onRoster = new Set(
    members.filter((m) => m.ptcpSttsCd !== "CANCELLED").map((m) => m.memberId),
  );
  const excludedIds = new Set(
    members.filter((m) => m.ptcpSttsCd === "CANCELLED").map((m) => m.memberId),
  );
  const needle = query.trim();
  const shown = candidates.members.filter(
    (m) => !onRoster.has(m.memberId) && (!needle || m.name.includes(needle)),
  );
  const pickedMember = candidates.members.find((m) => m.memberId === picked) ?? null;

  return (
    <Sheet
      open={openKey !== null}
      title="팀원 추가"
      hint="넣으면 바로 확정 팀원이 되고 이력에 남습니다."
      okLabel={busy ? "넣는 중…" : "넣기"}
      okDisabled={!pickedMember || busy}
      okTitle={!pickedMember ? "넣을 회원을 골라주세요" : undefined}
      onClose={onClose}
      onOk={() => {
        if (pickedMember) void onAdd(pickedMember.memberId, pickedMember.name);
      }}
    >
      <TextField
        aria-label="이름으로 찾기"
        placeholder="이름으로 찾기"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="text-[16px]"
      />

      <div className="mt-[10px] flex max-h-[320px] min-h-[120px] flex-col overflow-y-auto rounded-[12px] shadow-[0_0_0_1px_var(--color-line)]">
        {candidates.status === "loading" && (
          <p className="px-[14px] py-[16px] text-[14px] text-n500">회원 목록을 불러오는 중…</p>
        )}
        {candidates.status === "error" && (
          <div className="flex flex-col items-start gap-[6px] px-[14px] py-[16px]">
            <p className="text-[14px] text-danger">{candidates.errorMessage}</p>
            <button
              type="button"
              onClick={candidates.reload}
              className="text-[13px] text-n400 underline hover:text-ink"
            >
              새로고침
            </button>
          </div>
        )}
        {candidates.status === "ready" && shown.length === 0 && (
          <p className="px-[14px] py-[16px] text-[14px] text-n500">
            {needle ? "이름이 맞는 회원이 없습니다." : "넣을 수 있는 회원이 없습니다."}
          </p>
        )}
        {candidates.status === "ready" &&
          shown.map((m) => {
            const active = picked === m.memberId;
            return (
              <button
                key={m.memberId}
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(active ? null : m.memberId)}
                className={cn(
                  "flex items-center gap-[10px] border-t border-line px-[14px] py-[10px] text-left first:border-t-0 transition-colors",
                  active ? "bg-accent-soft" : "hover:bg-bg",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[15px]", active ? "text-accent" : "text-ink")}>
                    {m.name || "-"}
                  </span>
                  <span className="block text-[12.5px] text-n500">
                    {assignableMemberMeta(m)}
                    {excludedIds.has(m.memberId) && " · 제외된 팀원(넣으면 다시 합류)"}
                  </span>
                </span>
                {active && (
                  <span aria-hidden className="text-[14px] text-accent">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </Sheet>
  );
}
