"use client";

import { useMemo } from "react";
import {
  acdmActvSttsTone,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import type { AcademicProgramListStatus } from "@/features/academic-program";
import { ACDM_ACTV_STTS_NM } from "@/shared/config/codes";
import { Badge, Button, Card, EmptyState } from "@/shared/ui";

/*
 * 좌측 활동 목록 (#127).
 *
 * 모집 관리 대상은 승인(APPROVED — 아직 모집 전)과 진행 중(ONGOING — 모집 중이거나 선발
 * 진행 중)인 활동이다. 수료(COMPLETED)는 모집이 끝난 활동이라 목록에서 뺀다 — 회차 승인
 * 화면이 SUBMITTED 만 그리는 것과 같은 판단(이 화면에서 할 일이 있는 활동만).
 *
 * 활동 선택은 부모가 URL 쿼리(?programId=)로 유지한다 — 새로고침·뒤로가기로 선택이 풀리지
 * 않고 링크로 넘길 수 있다.
 */

interface RecruitmentProgramListProps {
  programs: AcademicProgramSummary[];
  status: AcademicProgramListStatus;
  errorMessage: string;
  hasNext: boolean;
  loadingMore: boolean;
  selectedProgramId: number | null;
  onSelect: (program: AcademicProgramSummary) => void;
  onLoadMore: () => void;
  onReload: () => void;
}

/** 모집 관리에서 다룰 상태 — 수료는 제외 */
const MANAGEABLE = new Set(["APPROVED", "ONGOING"]);

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-[20px] w-[72px] rounded-full bg-black/5" />
          <div className="mt-2 h-[20px] w-3/5 rounded bg-black/5" />
        </Card>
      ))}
    </div>
  );
}

export function RecruitmentProgramList({
  programs,
  status,
  errorMessage,
  hasNext,
  loadingMore,
  selectedProgramId,
  onSelect,
  onLoadMore,
  onReload,
}: RecruitmentProgramListProps) {
  const rows = useMemo(
    () => programs.filter((p) => MANAGEABLE.has(p.sttsCd)),
    [programs],
  );

  if (status === "loading") return <ListSkeleton />;

  if (status === "error") {
    return (
      <EmptyState
        message={errorMessage || "활동 목록을 불러오지 못했습니다."}
        action={{ label: "다시 시도", onClick: onReload }}
        padding="sm"
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        message="모집을 관리할 활동이 없습니다 — 승인·진행 중인 활동이 여기 표시됩니다."
        padding="sm"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((program) => {
        const selected = program.academicProgramId === selectedProgramId;
        return (
          <button
            key={program.academicProgramId}
            type="button"
            onClick={() => onSelect(program)}
            className={[
              "w-full rounded-[14px] border px-[14px] py-[12px] text-left transition-colors",
              selected
                ? "border-accent-strong bg-accent-soft"
                : "border-line bg-surface hover:border-accent",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center gap-[6px]">
              <Badge tone={acdmActvSttsTone(program.sttsCd)}>
                {ACDM_ACTV_STTS_NM[program.sttsCd]}
              </Badge>
              <Badge tone="grey">{program.typeCd}</Badge>
            </div>
            <div className="mt-[6px] text-[15px] font-semibold">
              {program.title || "-"}
            </div>
            <div className="mt-[2px] text-[13px] text-n500">
              스터디장 {program.leaderName || "-"}
            </div>
          </button>
        );
      })}

      {hasNext && (
        <Button
          variant="ghost"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-1"
        >
          {loadingMore ? "불러오는 중…" : "더 보기"}
        </Button>
      )}
    </div>
  );
}
