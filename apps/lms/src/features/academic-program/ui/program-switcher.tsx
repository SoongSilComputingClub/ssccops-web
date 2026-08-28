"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AcademicProgramSummary } from "@/entities/academic-program";

/*
 * 활동 선택 드롭다운 (#192).
 *
 * 학술 화면(내 활동·회차 기록·출석부·팀원 관리) 상단에 선다. 고르면 현재 경로에
 * `?programId=N`을 갈아 끼우고(`router.push`) 서버 컴포넌트를 다시 그린다 — 하단 정보가 그
 * 활동으로 바뀐다. URL에 남으므로 새로고침·뒤로가기가 그대로 동작하고, 링크를 공유하면 같은
 * 활동이 열린다.
 *
 * ── 왜 클라이언트인가 ──────────────────────────────────────
 * `<select>`의 onChange로 라우팅한다 — 서버 컴포넌트만으로는 값 변경에 반응할 수 없다.
 * 목록·선택값은 SSR 셸(`selectProgram`)이 넘겨 주므로 이 컴포넌트는 조회하지 않는다.
 *
 * ── 활동이 하나뿐이면 ─────────────────────────────────────
 * 고를 것이 없으므로 드롭다운 대신 이름만 보여 준다.
 *
 * ── iOS 확대 방지 (#105) ──────────────────────────────────
 * `<select>` 글자를 좁은 화면에서 16px 아래로 내리지 않는다 — iOS Safari가 포커스에서 화면을
 * 자동 확대하고 스스로 돌아오지 않는다.
 */
export function ProgramSwitcher({
  programs,
  selectedId,
  basePath,
}: {
  programs: AcademicProgramSummary[];
  selectedId: number;
  /** `?programId=`를 붙일 경로 — 예: `/studio/roster` */
  basePath: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const selected = programs.find((p) => p.academicProgramId === selectedId);

  if (programs.length <= 1) {
    return (
      <div className="rounded-2xl bg-surface px-[16px] py-[12px] shadow-[0_0_0_1px_#e5e8eb]">
        <div className="text-[12px] text-n500">활동</div>
        <div className="mt-[2px] text-[15px] font-medium">
          {selected?.title || "-"}
        </div>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-[6px] rounded-2xl bg-surface px-[16px] py-[12px] shadow-[0_0_0_1px_#e5e8eb]">
      <span className="text-[12px] text-n500">활동 선택</span>
      <select
        value={selectedId}
        disabled={pending}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isInteger(next) || next === selectedId) return;
          setPending(true);
          router.push(`${basePath}?programId=${next}`);
          router.refresh();
        }}
        className="w-full rounded-[10px] border border-line bg-surface px-[10px] py-[9px] text-[16px] text-ink outline-none focus:border-accent disabled:opacity-50 lg:text-[15px]"
      >
        {programs.map((program) => (
          <option key={program.academicProgramId} value={program.academicProgramId}>
            {(program.title || "-") + " · " + program.typeCd}
          </option>
        ))}
      </select>
    </label>
  );
}
