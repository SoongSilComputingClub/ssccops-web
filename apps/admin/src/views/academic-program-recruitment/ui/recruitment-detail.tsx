"use client";

import { useMemo, useState } from "react";
import {
  acdmActvSttsTone,
  type AcademicProgramDetail,
  type RecruitmentApplication,
  type RecruitmentSelection,
} from "@/entities/academic-program";
import { FORM_RECEIPT_BADGE, type FormReceiptStatus } from "@/entities/form";
import {
  RSPNS_STTS_BADGE,
} from "@/entities/response";
import type {
  AcademicProgramDetailStatus,
  RecruitmentApplicationsStatus,
  RecruitmentSelectState,
  StartRecruitment,
} from "@/features/academic-program";
import { useCan } from "@/features/auth";
import { CAPABILITY } from "@/entities/session";
import {
  ACDM_ACTV_STTS_NM,
  PTCP_STTS_NM,
  type PtcpSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatInstant, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  SectionLabel,
  StatBox,
  flash,
} from "@/shared/ui";

/*
 * 우측 상세 — 모집 시작 · 모집 공고 · 신청자 선발 (#127).
 *
 * ── 세 국면이 있다 ──────────────────────────────────────────
 *  1. APPROVED (모집 시작 전)     → 모집 기간을 정해 모집을 시작한다.
 *  2. ONGOING · 신청자 조회 409   → 방어적. 1과 같은 카드를 그린다(경합 상황).
 *  3. ONGOING · 신청자 조회 정상  → 모집 공고 카드 + 신청자 표. 신청자별로 확정/대기/보류를
 *     고르고 '선발 확정'을 한 번 누른다.
 *
 * `RECRUITING` 상태는 없다 — 모집 여부는 연결된 폼의 접수 상태(formReceiptStatus)로 읽는다.
 *
 * ── 선발 버튼은 감추지 않고 잠근다 ────────────────────────────
 * `useCan(ACADEMIC_PROGRAM_MANAGE)` 로 잠그고 이유를 title 로 붙인다("이동은 감추고, 동작은
 * 잠근다"). 이미 이 화면을 보고 있는 사람에게서 버튼만 사라지면 기능이 없어진 것인지 권한
 * 문제인지 알 수 없다.
 *
 * ── 정원 초과는 막지 않고 표시만 한다 ───────────────────────
 * 서버가 정원 초과를 차단하지 않는다(참고치 원칙 · 서버 #138 결정 2). 화면은 확정 인원이
 * 정원 상한을 넘으면 경고 문구를 띄우되 '선발 확정'을 잠그지 않는다.
 */

/**
 * 연결된 신청서(폼) 편집으로 가는 링크 (#193).
 *
 * 지원자에게서 응답을 받을 문항은 이 폼에 담긴다 — 기획안 승인 이관이 붙여 주는 폼은
 * 껍데기라 문항이 0개이고, 그대로 모집을 열면 서버가 `FORM_HAS_NO_QUESTION`(400)으로 막는다.
 * 편집기는 새로 만들지 않고 `/forms/{formId}/edit`(views/form-edit)를 그대로 재사용한다.
 *
 * 새 탭으로 연다 — 문항을 손보는 동안 모집 관리 화면을 잃지 않게 한다. 권한(FORM_WRITE)
 * 판정은 편집 화면의 몫이라 여기서 링크를 감추지 않는다(편집 화면이 목적지이므로 "이동은
 * 감춘다"의 예외 — 권한이 없으면 그 화면이 안내한다).
 *
 * `formId` 가 없으면(승인 전 활동이거나 서버 옛 배포) 링크 대신 안내 문구 — 없는 값을
 * 지어내지 않는다(AGENTS.md).
 */
function FormEditLink({
  formId,
  label,
}: {
  formId: number | null;
  label: string;
}) {
  if (formId == null) {
    return (
      <div className="text-[13px] text-n500">
        이 활동에 연결된 신청서가 없습니다 — 학술 담당자에게 문의해주세요
      </div>
    );
  }
  return (
    <a
      href={ROUTES.formEdit(formId)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center text-[14px] font-medium text-accent"
    >
      {label} ↗
    </a>
  );
}

/** 신청자 한 명에게 지금 매길 선발 값 — 미선택은 "none" */
type SelectionChoice = PtcpSttsCd | "none";

const CHOICE_OPTIONS: { value: SelectionChoice; label: string }[] = [
  { value: "none", label: "미선택" },
  { value: "CONFIRMED", label: PTCP_STTS_NM.CONFIRMED },
  { value: "WAITLISTED", label: PTCP_STTS_NM.WAITLISTED },
];

interface RecruitmentDetailProps {
  /** 좌측에서 고른 활동. 없으면 안내만 */
  program: AcademicProgramDetail | null;
  /** 활동 미선택은 "idle" — useAcademicProgramDetail 의 상태에 부모가 더한다 */
  detailStatus: AcademicProgramDetailStatus | "idle";
  detailErrorMessage: string;
  onDetailReload: () => void;

  applications: RecruitmentApplication[];
  appStatus: RecruitmentApplicationsStatus;
  appErrorMessage: string;
  appTotalCount: number;
  appHasNext: boolean;
  appLoadingMore: boolean;
  onAppLoadMore: () => void;
  onAppReload: () => void;

  start: StartRecruitment;
  onStart: (input: { recruitmentStartAt: string; recruitmentEndAt: string }) => void;

  select: RecruitmentSelectState["select"];
  selecting: boolean;
  teamMembers: RecruitmentSelectState["teamMembers"];
}

function DetailSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[96px] rounded-full bg-black/5" />
      <div className="mt-3 h-[26px] w-3/5 rounded bg-black/5" />
      <div className="mt-4 h-[120px] w-full rounded bg-black/5" />
    </Card>
  );
}

/** 모집 시작 카드 — APPROVED 활동에서 모집 기간을 정한다 */
function StartRecruitmentCard({
  formId,
  starting,
  onStart,
}: {
  formId: number | null;
  starting: boolean;
  onStart: (input: { recruitmentStartAt: string; recruitmentEndAt: string }) => void;
}) {
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // 기간을 둘 다 비워 시작할 수도 있으나(서버가 허용), 종료만 시작보다 빠르면 폼 도메인이 400
  const periodInvalid =
    Boolean(startAt) && Boolean(endAt) && endAt < startAt;

  return (
    <Card>
      <SectionLabel className="mb-2">모집 시작</SectionLabel>
      <div className="text-[13.5px] text-n500">
        모집을 시작하면 이 활동이 진행 중으로 바뀌고 연결된 신청서가 접수를
        시작합니다. 모집 기간은 비워 두면 즉시 시작해 수동으로 마감할 때까지
        열립니다.
      </div>

      {/*
       * 문항이 없는 신청서로는 모집을 시작할 수 없다(서버 FORM_HAS_NO_QUESTION). 이 화면은
       * 문항 수를 미리 알 수 없으므로 버튼을 잠그지는 않고, 먼저 신청서를 손보도록 링크를
       * 눈에 띄게 둔다.
       */}
      <div className="mt-3 rounded-[12px] bg-bg px-[12px] py-[10px]">
        <div className="text-[13px] font-semibold text-n300">
          지원자에게서 받을 응답
        </div>
        <div className="mt-1 text-[13px] text-n500">
          모집을 시작하기 전에 신청서에 물어볼 문항을 등록해주세요. 문항이
          없으면 모집을 시작할 수 없습니다.
        </div>
        <div className="mt-2">
          <FormEditLink formId={formId} label="신청서 문항 편집" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] text-n500">
          모집 시작 일시
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="rounded-[10px] border border-line px-[10px] py-[8px] text-[16px] text-n200 lg:text-[14px]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-n500">
          모집 종료 일시
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="rounded-[10px] border border-line px-[10px] py-[8px] text-[16px] text-n200 lg:text-[14px]"
          />
        </label>
      </div>

      {periodInvalid && (
        <div className="mt-2 text-[13px] text-danger">
          모집 종료 일시가 시작 일시보다 빠릅니다.
        </div>
      )}

      <div className="mt-4">
        <Button
          disabled={starting || periodInvalid}
          onClick={() =>
            onStart({ recruitmentStartAt: startAt, recruitmentEndAt: endAt })
          }
        >
          {starting ? "시작하는 중…" : "모집 시작"}
        </Button>
      </div>
    </Card>
  );
}

/** 모집 공고 카드 — ONGOING 활동의 접수 상태·정원·기간 */
function RecruitmentNoticeCard({
  program,
  confirmedCount,
}: {
  program: AcademicProgramDetail;
  confirmedCount: number;
}) {
  const receipt = program.formReceiptStatus as FormReceiptStatus | null;
  const receiptBadge = receipt ? FORM_RECEIPT_BADGE[receipt] : null;

  const capacity =
    program.participantMinCount != null || program.participantMaxCount != null
      ? `${program.participantMinCount ?? "-"} ~ ${program.participantMaxCount ?? "-"}명`
      : "-";

  const overCapacity =
    program.participantMaxCount != null &&
    confirmedCount > program.participantMaxCount;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={acdmActvSttsTone(program.sttsCd)}>
          {ACDM_ACTV_STTS_NM[program.sttsCd]}
        </Badge>
        {receiptBadge ? (
          <Badge tone={receiptBadge.tone}>{receiptBadge.label}</Badge>
        ) : (
          <Badge tone="outline">신청서 상태 미상</Badge>
        )}
      </div>
      <div className="mt-2 text-[20px] font-medium">{program.title || "-"}</div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatBox label="모집 정원" value={capacity} />
        <StatBox
          label="확정 인원"
          value={`${confirmedCount}명`}
          tone={overCapacity ? "accent" : "default"}
        />
        <StatBox
          label="신청서"
          value={program.formId != null ? `#${program.formId}` : "-"}
        />
      </div>

      {/*
       * 접수 중에도 문항을 고칠 수 있다(서버가 허용 — 삭제·변경만 QUESTION_ITEM_IN_USE 로 막는다).
       * 모집을 열고 나서 빠뜨린 문항을 발견하는 경우가 있어 여기에도 편집 링크를 둔다.
       */}
      <div className="mt-3">
        <FormEditLink formId={program.formId} label="신청서 문항 편집" />
      </div>

      {overCapacity && (
        <div className="mt-3 rounded-[12px] bg-amber-soft px-[12px] py-[10px] text-[13.5px] text-amber">
          확정 인원이 모집 정원 상한을 넘었습니다 — 선발은 그대로 확정되지만
          정원을 다시 확인해주세요.
        </div>
      )}

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
          { k: "스터디장", v: program.leaderMemberName || "-" },
        ]}
      />
    </Card>
  );
}

/** 신청자 표 + 선발 확정 */
function ApplicantsCard({
  applications,
  totalCount,
  hasNext,
  loadingMore,
  onLoadMore,
  onReload,
  status,
  errorMessage,
  select,
  selecting,
  teamMembers,
}: {
  applications: RecruitmentApplication[];
  totalCount: number;
  hasNext: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onReload: () => void;
  status: RecruitmentApplicationsStatus;
  errorMessage: string;
  select: RecruitmentSelectState["select"];
  selecting: boolean;
  teamMembers: RecruitmentSelectState["teamMembers"];
}) {
  const canManage = useCan(CAPABILITY.ACADEMIC_PROGRAM_MANAGE);

  /** formRspnsId → 지금 매긴 선발 값 */
  const [choices, setChoices] = useState<Record<number, SelectionChoice>>({});

  const setChoice = (formRspnsId: number, value: SelectionChoice) => {
    setChoices((prev) => ({ ...prev, [formRspnsId]: value }));
  };

  const selections: RecruitmentSelection[] = useMemo(
    () =>
      Object.entries(choices)
        .filter(([, v]) => v !== "none")
        .map(([id, v]) => ({
          formRspnsId: Number(id),
          ptcpSttsCd: v as PtcpSttsCd,
        })),
    [choices],
  );

  const runSelect = async () => {
    const message = await select(selections);
    if (message) {
      flash(message);
      return;
    }
    // 재조회로 목록이 새로 오면 선택은 초기화한다 — 서버가 ACCEPTED 로 굳힌 값을 다시 고르지 않게
    setChoices({});
    flash("선발을 확정했습니다.");
  };

  if (status === "error") {
    return (
      <Card>
        <SectionLabel className="mb-3">신청자</SectionLabel>
        <EmptyState
          message={errorMessage || "신청자를 불러오지 못했습니다."}
          action={{ label: "다시 시도", onClick: onReload }}
          padding="sm"
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>신청자 {totalCount > 0 ? `(${totalCount})` : ""}</SectionLabel>
        {selections.length > 0 && (
          <span className="text-[13px] text-n500">{selections.length}명 선택됨</span>
        )}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          message="아직 들어온 신청이 없습니다."
          padding="sm"
        />
      ) : (
        <div className="flex flex-col divide-y divide-black/6">
          {applications.map((app) => {
            const decided = app.rspnsSttsCd === "ACCEPTED";
            const choice = choices[app.formRspnsId] ?? "none";
            const badge = RSPNS_STTS_BADGE[app.rspnsSttsCd];
            return (
              <div
                key={app.formRspnsId}
                className="flex flex-col gap-2 py-[12px] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <span className="text-[15px] font-semibold">
                      {app.memberName || "-"}
                    </span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    {app.rspnsSeq != null && (
                      <span className="text-[12px] text-n500">
                        {app.rspnsSeq}번째 응답
                      </span>
                    )}
                  </div>
                  <div className="mt-[2px] text-[13px] text-n500">
                    {[app.subjectName, app.studentNo].filter(Boolean).join(" · ") ||
                      "-"}
                    {app.sbmsnDt && ` · ${formatInstant(app.sbmsnDt)} 제출`}
                  </div>
                </div>

                <div className="flex flex-none flex-wrap gap-[6px]">
                  {decided ? (
                    <Badge tone="blue">선발 완료</Badge>
                  ) : (
                    CHOICE_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.value}
                        active={choice === opt.value}
                        onClick={() => setChoice(app.formRspnsId, opt.value)}
                      >
                        {opt.label}
                      </Chip>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasNext && (
        <Button
          variant="ghost"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-3"
        >
          {loadingMore ? "불러오는 중…" : "더 보기"}
        </Button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/6 pt-4">
        <Button
          disabled={!canManage || selecting || selections.length === 0}
          title={
            !canManage
              ? "선발을 확정할 권한이 없습니다 — 스터디·프로젝트 관리(ACADEMIC_PROGRAM_MANAGE) 권한이 필요합니다"
              : selections.length === 0
                ? "확정 또는 대기로 표시할 신청자를 먼저 선택해주세요"
                : undefined
          }
          onClick={() => void runSelect()}
        >
          {selecting ? "확정하는 중…" : "선발 확정"}
        </Button>
        <span className="text-[13px] text-n500">
          확정·대기로 표시한 신청자가 팀원 명단에 등록되고 신청서가 승인됩니다.
        </span>
      </div>

      {teamMembers.length > 0 && (
        <div className="mt-4 rounded-[12px] bg-bg px-[12px] py-[10px]">
          <div className="text-[13px] font-semibold text-n300">
            현재 팀원 명단 ({teamMembers.length})
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {teamMembers.map((m) => (
              <div
                key={m.eventParticipantId}
                className="flex items-center justify-between text-[13.5px]"
              >
                <span>
                  {m.memberName || "-"}
                  {m.isLeader && (
                    <span className="ml-[6px] text-[12px] text-accent">
                      스터디장
                    </span>
                  )}
                </span>
                <span className="text-n500">{PTCP_STTS_NM[m.ptcpSttsCd]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function RecruitmentDetail({
  program,
  detailStatus,
  detailErrorMessage,
  onDetailReload,
  applications,
  appStatus,
  appErrorMessage,
  appTotalCount,
  appHasNext,
  appLoadingMore,
  onAppLoadMore,
  onAppReload,
  start,
  onStart,
  select,
  selecting,
  teamMembers,
}: RecruitmentDetailProps) {
  if (detailStatus === "idle" || !program) {
    return (
      <EmptyState message="왼쪽 목록에서 활동을 선택하면 모집 현황이 표시됩니다." />
    );
  }

  if (detailStatus === "loading") return <DetailSkeleton />;

  if (detailStatus === "not-found") {
    return (
      <EmptyState message="활동을 찾을 수 없습니다 — 주소가 잘못됐거나 아직 이관되지 않은 활동일 수 있습니다." />
    );
  }

  if (detailStatus === "error") {
    return (
      <EmptyState
        message={detailErrorMessage || "활동을 불러오지 못했습니다."}
        action={{ label: "다시 시도", onClick: onDetailReload }}
      />
    );
  }

  const confirmedFromServer = teamMembers.filter(
    (m) => m.ptcpSttsCd === "CONFIRMED",
  ).length;

  // 모집 시작 전(APPROVED)이거나, 진행 중인데 서버가 아직 모집 시작 안 됨으로 답하면(경합)
  // 모집 시작 카드를 그린다.
  const needsStart =
    program.sttsCd === "APPROVED" || appStatus === "not-started";

  return (
    <div className="flex flex-col gap-4">
      {needsStart ? (
        <StartRecruitmentCard
          formId={program.formId}
          starting={start.starting}
          onStart={onStart}
        />
      ) : (
        <>
          <RecruitmentNoticeCard
            program={program}
            confirmedCount={confirmedFromServer}
          />
          {appStatus === "loading" ? (
            <Card className="animate-pulse">
              <div className="h-[18px] w-[100px] rounded bg-black/5" />
              <div className="mt-4 h-[160px] w-full rounded bg-black/5" />
            </Card>
          ) : (
            <ApplicantsCard
              applications={applications}
              totalCount={appTotalCount}
              hasNext={appHasNext}
              loadingMore={appLoadingMore}
              onLoadMore={onAppLoadMore}
              onReload={onAppReload}
              status={appStatus}
              errorMessage={appErrorMessage}
              select={select}
              selecting={selecting}
              teamMembers={teamMembers}
            />
          )}
        </>
      )}
    </div>
  );
}
