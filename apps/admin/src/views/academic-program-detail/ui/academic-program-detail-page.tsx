"use client";

import { useRouter } from "next/navigation";
import {
  acdmActvSttsTone,
  sesnSttsTone,
} from "@/entities/academic-program";
import type { CurriculumItemWithSession } from "@/entities/curriculum-item";
import { useAcademicProgramDetail } from "@/features/academic-program";
import { useCurriculumItems } from "@/features/curriculum-item";
import { ACDM_ACTV_STTS_NM, SESN_STTS_NM } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Card,
  EmptyState,
  GridTable,
  KeyValueGrid,
  PageBody,
  PageHeader,
  ProgressBar,
  SectionLabel,
  StatBox,
  type GridColumn,
} from "@/shared/ui";

/*
 * 스터디·프로젝트 상세 (#125 · ssccops-server #131 상세 · #134 커리큘럼).
 *
 * 학술국장이 개별 활동의 진행률·커리큘럼 대비 진행을 확인하는 화면이다. 두 번의 조회를
 * 쓴다 — GET /v1/academic-programs/{id}(요약 카드)와 .../curriculum-items(진행 표).
 * 커리큘럼 조회가 실패해도 상세 카드는 이미 그려져 있으므로 표만 오류 블록으로 바꾸고
 * 화면 전체를 오류로 덮지 않는다.
 *
 * ── 진행률은 서버 값을 그대로 쓴다 ───────────────────────────
 * progress { totalSessionCount, approvedSessionCount, ratio }를 화면에서 다시 세지
 * 않는다(#125). 커리큘럼 표의 행 수와 승인 회차 수가 이 요약과 어긋날 수 있는데(서버가
 * 다른 집계를 쓰는 경우), 그때 정본은 요약이다.
 *
 * ── '활동 등록'도 상태 전이도 이 화면에 없다 ─────────────────
 * 전이(모집 시작·종료 승인)는 활동 횡단 운영 화면(모집 감독)의 동작이라 이 이슈 범위
 * 밖이다(#125). 이 화면은 읽기 전용이다.
 */

/** 회차 실적 상태 배지 — NOT_SUBMITTED는 "회차 행이 아직 없다"는 뜻이다(#122) */
function sessionBadge(item: CurriculumItemWithSession) {
  return (
    <Badge tone={sesnSttsTone(item.sesnSttsCd)}>
      {SESN_STTS_NM[item.sesnSttsCd]}
    </Badge>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="animate-pulse">
        <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
        <div className="mt-3 h-[28px] w-3/5 rounded bg-black/5" />
        <div className="mt-4 h-[8px] w-full rounded bg-black/5" />
        <div className="mt-6 h-[140px] w-full rounded bg-black/5" />
      </Card>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[120px] rounded bg-black/5" />
        <div className="mt-4 h-[200px] w-full rounded bg-black/5" />
      </Card>
    </div>
  );
}

export function AcademicProgramDetailPage({
  academicProgramId,
}: {
  academicProgramId: number;
}) {
  const router = useRouter();
  const { program, status, errorMessage, reload } =
    useAcademicProgramDetail(academicProgramId);
  const curriculum = useCurriculumItems(academicProgramId);

  if (status !== "ready" || !program) {
    return (
      <>
        <PageHeader title="활동 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="활동을 찾을 수 없습니다 — 주소가 잘못됐거나 아직 이관되지 않은 활동일 수 있습니다."
              action={{
                label: "활동 목록",
                onClick: () => router.replace(ROUTES.academicPrograms),
              }}
            />
          )}
          {status === "error" && (
            <EmptyState
              message={errorMessage || "활동을 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const ratio = Math.round(program.progress.ratio);
  const capacity =
    program.participantMinCount != null || program.participantMaxCount != null
      ? `${program.participantMinCount ?? "-"} ~ ${program.participantMaxCount ?? "-"}명`
      : "-";

  const columns: GridColumn<CurriculumItemWithSession>[] = [
    {
      key: "seqno",
      header: "회차",
      width: "56px",
      mobileHide: true,
      render: (item) => (
        <span className="text-n400">{item.seqno ?? "-"}</span>
      ),
    },
    {
      key: "title",
      header: "제목",
      width: "1.8fr",
      mobilePrimary: true,
      render: (item) => <span className="font-semibold">{item.title || "-"}</span>,
    },
    {
      key: "planYmd",
      header: "계획일",
      width: "1fr",
      render: (item) => (
        <span className="text-n400">{formatYmd(item.planYmd) || "-"}</span>
      ),
    },
    {
      key: "actualYmd",
      header: "진행일",
      width: "1fr",
      render: (item) => (
        <span className="text-n400">{formatYmd(item.actualYmd) || "-"}</span>
      ),
    },
    {
      key: "sesnSttsCd",
      header: "기록 상태",
      width: ".9fr",
      render: (item) => sessionBadge(item),
    },
  ];

  return (
    <>
      <PageHeader
        title="활동 상세"
        subtitle={program.typeName || program.typeCd}
        showBack
      />
      <PageBody>
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={acdmActvSttsTone(program.sttsCd)}>
                {ACDM_ACTV_STTS_NM[program.sttsCd]}
              </Badge>
              <div className="text-[14px] text-n400">
                {program.typeName || program.typeCd}
              </div>
              {program.isLeader && (
                <span title="내가 스터디장/팀장인 활동입니다">
                  <Badge tone="outline-accent">내 활동</Badge>
                </span>
              )}
            </div>
            <div className="mt-2 text-[23px] font-medium">
              {program.title || "-"}
            </div>
            <div className="mt-3 flex items-center gap-[10px]">
              <ProgressBar value={ratio} height={6} />
              <div className="text-[14px] text-accent">{ratio}%</div>
            </div>

            {/* 진행률 요약 — 서버 progress를 그대로 옮긴다(재계산 금지 · #125) */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatBox
                label="커리큘럼 항목"
                value={`${program.curriculumItemCount}개`}
              />
              <StatBox
                label="승인 회차"
                value={`${program.progress.approvedSessionCount} / ${program.progress.totalSessionCount}`}
              />
              <StatBox label="진행률" value={`${ratio}%`} tone="accent" />
            </div>

            <SectionLabel className="mt-5">활동 정보</SectionLabel>
            <KeyValueGrid
              className="mt-[10px]"
              labelWidth={92}
              items={[
                {
                  k: "기간",
                  v: `${formatYmd(program.eventBeginAt) || "-"} ~ ${formatYmd(program.eventEndAt) || "-"}`,
                },
                { k: "장소", v: program.placeName || "-" },
                { k: "모집 정원", v: capacity },
                { k: "스터디장", v: program.leaderMemberName || "-" },
                { k: "기획안 제출자", v: program.proposerMemberName || "-" },
                { k: "목표", v: program.goalContent || "-" },
                { k: "준비물", v: program.prepContent || "-" },
                { k: "일정", v: program.scheduleText || "-" },
              ]}
            />
          </Card>

          <Card>
            <SectionLabel className="mb-3">커리큘럼 대비 진행</SectionLabel>

            {curriculum.status === "loading" && (
              <EmptyState message="불러오는 중…" padding="sm" />
            )}
            {curriculum.status === "error" && (
              <EmptyState
                message={
                  curriculum.errorMessage ||
                  "커리큘럼을 불러오지 못했습니다."
                }
                action={{ label: "다시 시도", onClick: curriculum.reload }}
                padding="sm"
              />
            )}
            {curriculum.status === "ready" && (
              <GridTable
                columns={columns}
                rows={curriculum.items}
                rowKey={(item) => String(item.curriculumItemId)}
                dense
                empty={
                  <EmptyState
                    message="등록된 커리큘럼 항목이 없습니다."
                    padding="sm"
                  />
                }
              />
            )}
          </Card>
        </div>
      </PageBody>
    </>
  );
}
