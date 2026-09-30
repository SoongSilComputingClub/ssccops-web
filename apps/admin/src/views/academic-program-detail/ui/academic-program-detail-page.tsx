"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acdmActvSttsTone,
  sesnSttsTone,
} from "@/entities/academic-program";
import type { CurriculumItemWithSession } from "@/entities/curriculum-item";
import { CAPABILITY } from "@/entities/session";
import {
  useAcademicProgramDetail,
  useProgramTransition,
  type ProgramTransition,
} from "@/features/academic-program";
import { useCan } from "@/features/auth";
import { useCurriculumItems } from "@/features/curriculum-item";
import {
  ACDM_ACTV_STTS_NM,
  SESN_STTS_NM,
  type AcdmActvSttsCd,
  type SesnSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GridTable,
  KeyValueGrid,
  PageBody,
  PageHeader,
  ProgressBar,
  SectionLabel,
  Sheet,
  StatBox,
  TextArea,
  flash,
  type GridColumn,
} from "@/shared/ui";
import { ProgramMembersCard } from "./program-members-card";

/*
 * 학술 프로그램 상세 (#125 · ssccops-server #131 상세 · #134 커리큘럼).
 *
 * 학술국장이 개별 활동의 진행률·커리큘럼 대비 진행·팀원을 확인하는 화면이다. 세 번의 조회를
 * 쓴다 — GET /v1/academic-programs/{id}(요약 카드), .../members(팀원 절 · #742), .../curriculum-items
 * (진행 표). 팀원·커리큘럼 조회가 실패해도 상세 카드는 이미 그려져 있으므로 그 절만 오류 블록으로
 * 바꾸고 화면 전체를 오류로 덮지 않는다. 팀원 명단 변경 이력은 펼칠 때 네 번째로 부른다.
 *
 * ── 진행률은 서버 값을 그대로 쓴다 ───────────────────────────
 * progress { totalSessionCount, approvedSessionCount, ratio }를 화면에서 다시 세지
 * 않는다(#125). 커리큘럼 표의 행 수와 승인 회차 수가 이 요약과 어긋날 수 있는데(서버가
 * 다른 집계를 쓰는 경우), 그때 정본은 요약이다.
 *
 * ── 종료 승인·재시작은 이 화면에 있다 (#715 · ADR-0057) ──────
 * 모집 관리(#127)는 모집할 프로그램을 고르는 곳이라 목록이 승인됨·진행 중뿐이고, 종료된
 * 프로그램이 거기서 사라져 재시작을 둘 수 없다. 그래서 두 전이는 프로그램 하나를 여는 이 화면에
 * 둔다. 버튼은 «지금 할 수 있는 전이만»(`apps/admin/AGENTS.md`) — 진행 중이면 «종료 승인»,
 * 종료면 «재시작», 승인됨에는 둘 다 없다(모집 시작은 모집 관리의 동작이다).
 *
 * 권한이 없으면 버튼을 남긴 채 잠그고 사유를 `title`로 붙인다(«이동은 감추고, 동작은 잠근다»).
 * **진행률이나 남은 회차로 종료를 잠그지 않는다** — 서버 #133 설계 결정 4 «학술국장 재량»이고,
 * 재시작이 있어 막을 이유가 없다. 대신 종료 시트가 승인 대기·수정요청 회차 수를 보여 준다. 그 수는
 * 이미 받은 커리큘럼 항목의 `sesnSttsCd`로 센다 — 새 조회를 더하지 않는다.
 *
 * ── 폐지·복원도 이 화면에 있다 (#741 · ADR-0058 · 서버 #611) ───
 * 최소 인원 미달 등으로 운영이 멈춘 프로그램은 «폐지»다 — 끝까지 한 종료(수료)와 가른다. 승인됨·
 * 진행 중이면 «폐지», 폐지면 «복원»이 선다. 그래서 진행 중에는 버튼이 둘(종료 승인 · 폐지)이다 —
 * 둘 다 지금 할 수 있는 전이이고 한 번에 두 단계를 건너뛰는 것이 아니다. 폐지 시트는 **사유를
 * 받아야 확인이 켜지고**(서버도 400 `DISCONTINUATION_REASON_REQUIRED`) 무엇이 멈추는지(쓰기 ·
 * 모집 폼 마감 · 홈페이지 목록) 무엇이 남는지(팀원 명단)를 적는다. 복원은 폐지 전 상태로 돌아가지만
 * 모집 폼은 다시 열리지 않는다 — 그것을 시트가 말한다. 대시보드 카드에 버튼을 두지 않는 것은 종료와
 * 같은 이유다(사유를 받고 결과를 알리는 시트가 필요하다).
 *
 * 전이 뒤에는 상세를 통째로 다시 부른다. 전이 응답에는 상태만 있는데 화면은 배지·진행률·버튼을
 * 함께 그린다(«부분 갱신과 재조회를 가른다»). 커리큘럼은 전이로 바뀌지 않아 다시 부르지 않는다.
 *
 * '활동 등록'은 없다 — 프로그램은 기획안 승인 이관으로만 생긴다(#122).
 */

const MANAGE_REQUIRED = "학술 프로그램 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다";

/** 폐지·복원 사유 입력 상한 — 회차 수정요청 사유와 같은 값(같은 승인 이력 칸에 남는다) */
const REASON_MAX_LENGTH = 500;

/**
 * 상태별로 지금 할 수 있는 전이 — 모집 시작은 모집 관리의 동작이라 여기 없다. switch로 상태를
 * 전부 적는다 — 상태가 늘면 타입이 이 자리를 다시 묻는다
 */
function transitionsOf(sttsCd: AcdmActvSttsCd): ProgramTransition[] {
  switch (sttsCd) {
    case "APPROVED":
      return ["DISCONTINUE"];
    case "ONGOING":
      return ["APPROVE_COMPLETION", "DISCONTINUE"];
    case "COMPLETED":
      return ["REOPEN"];
    case "DISCONTINUED":
      return ["REINSTATE"];
  }
}

/** 버튼 줄 옆의 한 문장 — 누르면 무엇이 달라지나 */
function transitionHintOf(sttsCd: AcdmActvSttsCd): string {
  switch (sttsCd) {
    case "APPROVED":
      return "폐지하면 모집을 시작할 수 없습니다.";
    case "ONGOING":
      return "종료·폐지하면 회차 기록·승인과 모집 선발을 할 수 없습니다.";
    case "COMPLETED":
      return "재시작하면 회차 기록·승인과 모집 선발을 다시 할 수 있습니다.";
    case "DISCONTINUED":
      return "복원하면 폐지 전 상태로 돌아갑니다.";
  }
}

/** 전이별 버튼 모양 — 폐지는 되돌릴 수 있어 늘 붉은 `danger`가 아니라 hover에서만 붉은 쪽이다 */
const TRANSITION_UI: Record<
  ProgramTransition,
  { label: string; verb: string; variant: "primary" | "ghost" | "ghost-danger"; done: string }
> = {
  APPROVE_COMPLETION: {
    label: "종료 승인",
    verb: "종료",
    variant: "primary",
    done: "프로그램을 종료했습니다.",
  },
  REOPEN: { label: "재시작", verb: "재시작", variant: "ghost", done: "프로그램을 재시작했습니다." },
  DISCONTINUE: {
    label: "폐지",
    verb: "폐지",
    variant: "ghost-danger",
    done: "프로그램을 폐지했습니다.",
  },
  REINSTATE: { label: "복원", verb: "복원", variant: "ghost", done: "프로그램을 복원했습니다." },
};

/** 커리큘럼 항목 중 그 회차 상태인 것의 수 — 커리큘럼을 아직 못 받았으면 null */
function countSessions(
  items: CurriculumItemWithSession[] | null,
  sesnSttsCd: SesnSttsCd,
): number | null {
  if (!items) return null;
  return items.filter((item) => item.sesnSttsCd === sesnSttsCd).length;
}

function countLabel(count: number | null): string {
  return count == null ? "-" : `${count}건`;
}

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
        <div className="h-[22px] w-[96px] rounded-full bg-fill" />
        <div className="mt-3 h-[28px] w-3/5 rounded bg-fill" />
        <div className="mt-4 h-[8px] w-full rounded bg-fill" />
        <div className="mt-6 h-[140px] w-full rounded bg-fill" />
      </Card>
      <Card className="animate-pulse">
        <div className="h-[18px] w-[120px] rounded bg-fill" />
        <div className="mt-4 h-[200px] w-full rounded bg-fill" />
      </Card>
    </div>
  );
}

export function AcademicProgramDetailPage({
  academicProgramId,
}: Readonly<{
  academicProgramId: number;
}>) {
  const router = useRouter();
  const { program, status, errorMessage, reload } =
    useAcademicProgramDetail(academicProgramId);
  const curriculum = useCurriculumItems(academicProgramId);
  const canManage = useCan(CAPABILITY.ACADEMIC_PROGRAM_MANAGE);
  const programTransition = useProgramTransition(academicProgramId);

  /** 열려 있는 확인 시트 — 누른 버튼의 전이. 닫혀 있으면 null */
  const [confirming, setConfirming] = useState<ProgramTransition | null>(null);
  /** 폐지·복원 시트의 사유 — 시트를 열 때마다 비운다 */
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  const openSheet = (transition: ProgramTransition) => {
    setReason("");
    setConfirming(transition);
  };

  const confirmTransition = async () => {
    if (!confirming) return;
    const transition = confirming;
    // 버튼이 이미 잠겨 있지만, 사유 없는 폐지는 보내지 않는다(서버도 400)
    if (transition === "DISCONTINUE" && !trimmedReason) return;
    const message = await programTransition.run(transition, trimmedReason || undefined);
    setConfirming(null);
    if (message) {
      flash(message);
      return;
    }
    flash(TRANSITION_UI[transition].done);
    reload();
  };

  if (status !== "ready" || !program) {
    return (
      <>
        <PageHeader title="프로그램 상세" showBack />
        <PageBody>
          {status === "loading" && <DetailSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="없는 프로그램입니다. 목록으로 돌아가주세요."
              action={{
                label: "프로그램 목록",
                onClick: () => router.replace(ROUTES.academicPrograms),
              }}
            />
          )}
          {status === "error" && (
            <EmptyState
              message={errorMessage || "프로그램을 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const ratio = Math.round(program.progress.ratio);
  const transitions = transitionsOf(program.sttsCd);
  const curriculumItems = curriculum.status === "ready" ? curriculum.items : null;
  const submittedCount = countSessions(curriculumItems, "SUBMITTED");
  const revisionCount = countSessions(curriculumItems, "REVISION_REQUESTED");
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
        title="프로그램 상세"
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
                <span title="내가 스터디장/팀장인 프로그램입니다">
                  <Badge tone="outline-accent">내 프로그램</Badge>
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

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
              {transitions.map((transition) => (
                <Button
                  key={transition}
                  variant={TRANSITION_UI[transition].variant}
                  disabled={!canManage || programTransition.running}
                  title={
                    canManage
                      ? undefined
                      : `프로그램을 ${TRANSITION_UI[transition].verb}할 권한이 없습니다 — ${MANAGE_REQUIRED}`
                  }
                  onClick={() => openSheet(transition)}
                >
                  {TRANSITION_UI[transition].label}
                </Button>
              ))}
              <span className="text-[13px] text-n500">{transitionHintOf(program.sttsCd)}</span>
            </div>

            <SectionLabel className="mt-5">프로그램 정보</SectionLabel>
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

          {/* 팀원 명단·이력 — 조회만(넣고 빼는 것은 스터디장이 LMS에서 한다 · #742) */}
          <ProgramMembersCard academicProgramId={academicProgramId} />

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

        <Sheet
          open={confirming === "APPROVE_COMPLETION"}
          title="프로그램 종료"
          hint="재시작하면 되돌릴 수 있습니다."
          okLabel={programTransition.running ? "종료하는 중…" : "종료 승인"}
          okDisabled={programTransition.running}
          onClose={() => setConfirming(null)}
          onOk={() => void confirmTransition()}
        >
          {/* 승인 회차는 서버 progress 그대로, 남은 회차 수는 이미 받은 커리큘럼으로 센다 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatBox
              label="승인 회차"
              value={`${program.progress.approvedSessionCount} / ${program.progress.totalSessionCount}`}
            />
            <StatBox label="승인 대기" value={countLabel(submittedCount)} />
            <StatBox label="수정요청" value={countLabel(revisionCount)} />
          </div>
          <div className="mt-3 text-[13.5px] text-n500">
            종료하면 이 프로그램의 회차 기록·승인과 모집 선발을 할 수 없습니다.
            승인 대기·수정요청 회차는 처리되지 않은 채 남습니다. 접수 중인 모집
            폼은 마감됩니다.
          </div>
        </Sheet>

        <Sheet
          open={confirming === "REOPEN"}
          title="프로그램 재시작"
          okLabel={programTransition.running ? "재시작하는 중…" : "재시작"}
          okDisabled={programTransition.running}
          onClose={() => setConfirming(null)}
          onOk={() => void confirmTransition()}
        >
          <div className="text-[13.5px] text-n500">
            진행 중으로 돌아가 회차 기록·승인과 모집 선발을 다시 할 수 있습니다.
            마감된 모집 폼은 다시 열리지 않습니다.
          </div>
        </Sheet>

        <Sheet
          open={confirming === "DISCONTINUE"}
          title="프로그램 폐지"
          hint="복원하면 되돌릴 수 있습니다."
          okLabel={programTransition.running ? "폐지하는 중…" : "폐지"}
          okDisabled={!trimmedReason || programTransition.running}
          okTitle={!trimmedReason ? "폐지 사유를 입력해주세요" : undefined}
          onClose={() => setConfirming(null)}
          onOk={() => void confirmTransition()}
        >
          {/* 시트의 `hint`는 `<label>`이 아니라 이름이 되지 못한다 — 이름은 aria-label로 붙인다 (#486) */}
          <TextArea
            aria-label="폐지 사유"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            placeholder="폐지 사유(필수)"
          />
          <div className="mt-1 text-right text-[12px] text-n500">
            {reason.length} / {REASON_MAX_LENGTH}
          </div>
          <div className="mt-3 text-[13.5px] text-n500">
            폐지하면 이 프로그램의 회차 기록·승인과 모집 선발을 할 수 없습니다.
            접수 중인 모집 폼은 마감되고 홈페이지 목록에서 빠집니다. 팀원 명단은
            그대로 남습니다.
          </div>
        </Sheet>

        <Sheet
          open={confirming === "REINSTATE"}
          title="프로그램 복원"
          okLabel={programTransition.running ? "복원하는 중…" : "복원"}
          okDisabled={programTransition.running}
          onClose={() => setConfirming(null)}
          onOk={() => void confirmTransition()}
        >
          <div className="text-[13.5px] text-n500">
            폐지 전 상태(승인 또는 진행 중)로 돌아가 회차 기록·승인과 모집 선발을 다시
            할 수 있습니다. 모집 폼은 다시 열리지 않습니다. 홈페이지에 보이려면 모집을
            다시 열어야 합니다.
          </div>
          <TextArea
            aria-label="복원 사유"
            className="mt-3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            placeholder="복원 사유(선택)"
          />
        </Sheet>
      </PageBody>
    </>
  );
}
