"use client";

import { useState } from "react";
import type { RecruitmentTeamMember } from "@/entities/academic-program";
import { PTCP_STTS_BADGE } from "@/entities/event";
import {
  useProgramMemberHistory,
  useProgramMembers,
} from "@/features/academic-program";
import {
  PTCP_CHG_PATH_SE_NM,
  PTCP_STTS_NM,
  ptcpChangeNm,
} from "@/shared/config/codes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GridTable,
  SectionLabel,
  type GridColumn,
} from "@/shared/ui";

/*
 * 프로그램 상세의 «팀원» 절 (#742 · ssccops#553 · server#612) — **조회만**.
 *
 * 그전까지 어드민에는 팀원 명단을 늘 보는 곳이 없었다 — 모집 관리의 «현재 팀원 명단»은 선발 저장
 * 응답으로만 찼다. 이제 스터디장이 LMS에서 팀원을 넣고 빼므로(학술국장 승인 없이 바로 반영),
 * 학술국장이 그 결과와 이력을 여기서 본다(ADR-0042 — 자유도를 열면 이력을 붙이고 보여 준다).
 *
 * - 명단은 확정·대기, 제외(취소)된 사람은 접힌 절로 따로 — 섞으면 «지금 팀원이 누구인가»가 흐려진다.
 * - 이력은 펼칠 때 부른다. 모집 선발 · 행사 참가자 · 팀원 관리 세 경로의 줄이 전부 오고, «무엇을»은
 *   `ptcpChangeNm`(`@ssccops/codes`)이 LMS와 같은 말로 옮긴다.
 *
 * 버튼이 없다 — 학술국장도 같은 API로 고칠 수 있지만 이 이슈는 조회까지다(후속에서 버튼만 더하면
 * 된다). 모집 관리 화면에 명단 조작을 더하지 않은 것은 그쪽이 신청서 기준 선발 화면이라서다.
 */

const columns: GridColumn<RecruitmentTeamMember>[] = [
  {
    key: "name",
    header: "이름",
    width: "1.6fr",
    mobilePrimary: true,
    render: (m) => (
      <span className="flex items-center gap-[6px]">
        <span className="font-semibold">{m.memberName || "-"}</span>
        {m.isLeader && <Badge tone="outline-accent">스터디장</Badge>}
      </span>
    ),
  },
  {
    key: "joinedAt",
    header: "합류일",
    width: "1fr",
    render: (m) => <span className="text-n400">{formatYmd(m.joinedAt) || "-"}</span>,
  },
  {
    key: "status",
    header: "상태",
    width: ".8fr",
    render: (m) => {
      const badge = PTCP_STTS_BADGE[m.ptcpSttsCd];
      return <Badge tone={badge.tone}>{badge.label}</Badge>;
    },
  },
];

function MemberHistory({ academicProgramId }: Readonly<{ academicProgramId: number }>) {
  const [open, setOpen] = useState(false);
  const { items, status, errorMessage, reload } = useProgramMemberHistory(
    academicProgramId,
    open,
  );

  return (
    <div className="mt-4 border-t border-hairline pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-semibold text-n300">명단 변경 이력</div>
        {/* 라벨에 대상을 싣는다 — «보기»만으로는 무엇을 여는지 들리지 않는다 (#692) */}
        <Button
          variant="ghost"
          aria-expanded={open}
          aria-label={open ? "명단 변경 이력 접기" : "명단 변경 이력 보기"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "접기" : "보기"}
        </Button>
      </div>
      {!open && (
        <div className="mt-1 text-[13.5px] text-n500">
          누가 언제 팀원을 넣고 뺐는지 남은 기록입니다.
        </div>
      )}
      {open && status === "loading" && (
        <div className="mt-3 h-[16px] w-2/5 animate-pulse rounded bg-fill" />
      )}
      {open && status === "error" && (
        <EmptyState message={errorMessage} action={{ label: "다시 시도", onClick: reload }} />
      )}
      {open && status === "ready" && items.length === 0 && (
        <div className="mt-2 text-[13.5px] text-n500">아직 남은 이력이 없습니다.</div>
      )}
      {open && status === "ready" && items.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-hairline">
          {items.map((h) => (
            <li key={h.historyId} className="py-[10px] text-[14px]">
              <div className="flex flex-wrap items-center gap-2">
                {/* 색은 바뀐 뒤 상태의 것이다 — 명단 배지와 같은 어휘(확정 파랑 · 대기 amber · 취소 무채) */}
                <Badge tone={PTCP_STTS_BADGE[h.afterSttsCd].tone}>
                  {ptcpChangeNm(h.beforeSttsCd, h.afterSttsCd)}
                </Badge>
                <span className="font-semibold">{h.memberName || "-"}</span>
                {h.beforeSttsCd === null && (
                  <span className="text-n500">{PTCP_STTS_NM[h.afterSttsCd]}</span>
                )}
              </div>
              <div className="mt-[4px] text-[13px] text-n500">
                {h.performerName || "-"} · {PTCP_CHG_PATH_SE_NM[h.changePath] ?? h.changePath} ·{" "}
                {formatDt(h.changedAt) || "-"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProgramMembersCard({ academicProgramId }: Readonly<{ academicProgramId: number }>) {
  const { members, status, errorMessage, reload } = useProgramMembers(academicProgramId);
  const [excludedOpen, setExcludedOpen] = useState(false);

  const active = members.filter((m) => m.ptcpSttsCd !== "CANCELLED");
  const excluded = members.filter((m) => m.ptcpSttsCd === "CANCELLED");

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <SectionLabel>팀원</SectionLabel>
        {status === "ready" && <span className="text-[13.5px] text-n500">{active.length}명</span>}
      </div>

      {status === "loading" && <EmptyState message="불러오는 중…" padding="sm" />}
      {status === "error" && (
        <EmptyState
          message={errorMessage || "팀원 명단을 불러오지 못했습니다."}
          action={{ label: "다시 시도", onClick: reload }}
          padding="sm"
        />
      )}
      {status === "ready" && (
        <>
          <GridTable
            columns={columns}
            rows={active}
            rowKey={(m) => String(m.eventParticipantId)}
            dense
            empty={<EmptyState message="아직 확정된 팀원이 없습니다." padding="sm" />}
          />
          <div className="mt-2 text-[13px] text-n500">
            팀원은 스터디장이 LMS 팀원 관리에서 넣고 뺍니다.
          </div>

          {excluded.length > 0 && (
            <div className="mt-4">
              <Button
                variant="link"
                aria-expanded={excludedOpen}
                onClick={() => setExcludedOpen((v) => !v)}
              >
                {excludedOpen ? "제외된 팀원 접기" : `제외된 팀원 ${excluded.length}명 보기`}
              </Button>
              {excludedOpen && (
                <div className="mt-2">
                  {/* 상태 열은 뺀다 — 전부 취소라 같은 배지가 줄마다 선다 */}
                  <GridTable
                    columns={columns.filter((c) => c.key !== "status")}
                    rows={excluded}
                    rowKey={(m) => String(m.eventParticipantId)}
                    dense
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      <MemberHistory academicProgramId={academicProgramId} />
    </Card>
  );
}
