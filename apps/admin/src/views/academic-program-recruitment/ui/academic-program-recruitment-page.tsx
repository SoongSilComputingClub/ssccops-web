"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AcademicProgramSummary } from "@/entities/academic-program";
import {
  useAcademicProgramDetail,
  useAcademicProgramList,
  useRecruitmentSelect,
  useStartRecruitment,
} from "@/features/academic-program";
import { ROUTES } from "@/shared/config/routes";
import { PageBody, PageHeader, flash } from "@/shared/ui";
import { RecruitmentDetail } from "./recruitment-detail";
import { RecruitmentProgramList } from "./recruitment-program-list";

/*
 * 모집 관리 (#127 · ssccops-server #133·#138).
 *
 * 학술국장이 승인된 활동의 모집을 시작하고, 신청자(폼 응답)를 확인해 선발까지 확정하는
 * 화면이다. 모집 시작·선발 확정 모두 ACADEMIC_PROGRAM_MANAGE 단일 권한으로 판정한다
 * (2026-08-23 확정 — 최초 설계는 스터디장 선발이었으나 정정됐다).
 *
 * ── 좌우 2열 (#129 회차 승인 화면과 같은 레이아웃) ──────────────
 * 좌측은 관리 대상 활동 목록(APPROVED·ONGOING), 우측은 선택 활동의 모집 시작 카드 또는
 * 모집 공고 + 신청자 선발 표다. 활동 선택은 URL 쿼리(?programId=)로 유지한다 — 새로고침·
 * 뒤로가기로 선택이 풀리지 않고 링크로 넘길 수 있다.
 *
 * ── 모집 시작 뒤 활동 상세·신청자를 다시 조회한다 ────────────
 * START_RECRUITMENT 은 활동을 ONGOING 으로 바꾸고 신청서를 OPEN 시킨다 — 두 조회를 함께
 * 다시 불러야 우측이 모집 공고 + 신청자 표로 바뀐다(AGENTS.md "부분 갱신과 재조회를 가른다").
 */

const QUERY_PROGRAM = "programId";

export function AcademicProgramRecruitmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawProgramId = searchParams.get(QUERY_PROGRAM);
  const parsed = rawProgramId ? Number(rawProgramId) : NaN;
  const selectedProgramId =
    Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  const list = useAcademicProgramList({ sort: "-createdAt" });
  const detail = useAcademicProgramDetail(selectedProgramId ?? 0);
  const recruitment = useRecruitmentSelect(selectedProgramId);
  const start = useStartRecruitment(selectedProgramId ?? 0);

  const setSelected = (program: AcademicProgramSummary) => {
    const next = new URLSearchParams(searchParams);
    next.set(QUERY_PROGRAM, String(program.academicProgramId));
    router.replace(`${ROUTES.academicProgramRecruitment}?${next.toString()}`);
  };

  const onLoadMoreList = async () => {
    const message = await list.loadMore();
    if (message) flash(message);
  };

  const onStart = async (input: {
    recruitmentStartAt: string;
    recruitmentEndAt: string;
  }) => {
    const message = await start.run(input);
    if (message) {
      flash(message);
      return;
    }
    flash("모집을 시작했습니다.");
    // 활동이 ONGOING 으로 바뀌고 신청서가 열렸다 — 둘 다 다시 조회한다
    detail.reload();
    recruitment.reload();
    list.reload();
  };

  const onLoadMoreApplications = async () => {
    const message = await recruitment.loadMore();
    if (message) flash(message);
  };

  return (
    <>
      <PageHeader
        title="모집 관리"
        subtitle="승인된 활동의 모집을 시작하고 신청자를 선발합니다"
      />
      <PageBody maxWidth={1180}>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <RecruitmentProgramList
            programs={list.programs}
            status={list.status}
            errorMessage={list.errorMessage}
            hasNext={list.hasNext}
            loadingMore={list.loadingMore}
            selectedProgramId={selectedProgramId}
            onSelect={setSelected}
            onLoadMore={() => void onLoadMoreList()}
            onReload={list.reload}
          />
          <RecruitmentDetail
            program={selectedProgramId != null ? detail.program : null}
            detailStatus={selectedProgramId != null ? detail.status : "idle"}
            detailErrorMessage={detail.errorMessage}
            onDetailReload={detail.reload}
            applications={recruitment.applications}
            appStatus={recruitment.status}
            appErrorMessage={recruitment.errorMessage}
            appTotalCount={recruitment.totalCount}
            appHasNext={recruitment.hasNext}
            appLoadingMore={recruitment.loadingMore}
            onAppLoadMore={() => void onLoadMoreApplications()}
            onAppReload={recruitment.reload}
            start={start}
            onStart={(input) => void onStart(input)}
            select={recruitment.select}
            selecting={recruitment.selecting}
            teamMembers={recruitment.teamMembers}
          />
        </div>
      </PageBody>
    </>
  );
}
