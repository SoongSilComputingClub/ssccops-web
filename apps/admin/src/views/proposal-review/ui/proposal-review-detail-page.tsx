"use client";

import { useRouter } from "next/navigation";
import type { FormDetail } from "@/entities/form";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  rspnsValueText,
  type FormResponseDetail,
} from "@/entities/response";
import { useFormDetail, useProposalForm } from "@/features/form";
import {
  ResponseReviewPanel,
  ResponseReviewTimeline,
  useResponseDetail,
} from "@/features/response";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
} from "@/shared/ui";
import { ProposalCurriculumCard } from "./proposal-curriculum-card";
import { ProposalFormGate } from "./proposal-form-gate";

const TITLE = "기획안 검토";

/**
 * 승인이 그 자리에서 무엇을 일으키는가 (서버 #150 · #133).
 *
 * **화면이 약속하지 않는 것은 적지 않는다.** 승인이 실제로 만드는 것은 학술 활동 한 벌과 리더
 * 역할 부여, 그리고 **비어 있는** 모집 폼 셋이다 — 모집이 시작되는 것도, 공고가 게시되는 것도
 * 아니다. 리더 역할을 '스터디장'으로 못 박지 않는 것은 서버가 유형에 따라 스터디장·프로젝트장을
 * 가려 부여하기 때문이다. 화면에 그 매핑을 한 벌 더 두면 유형이 늘어난 날 화면만 틀린 말을 한다.
 */
const ACCEPT_NOTICE =
  "승인하면 이 기획안이 학술 활동으로 만들어지고, 제출자에게 유형에 맞는 리더 역할(스터디장 · 프로젝트장)이 부여되며, 비어 있는 모집 폼이 함께 생깁니다.";

/** 미리보기가 승인이 성립하지 않는다고 말할 때 승인 버튼에 붙는 사유 (#164 · 서버 #150) */
function acceptBlockReasonOf(response: FormResponseDetail): string | undefined {
  const preview = response.academicProgramPreview;
  if (preview === null || preview.migratable) return undefined;
  /*
   * 서버가 준 사유를 그대로 앞에 둔다 — 이 문장이 승인을 눌렀을 때 돌아올 400의 문장과 같고,
   * 검토자가 수정요청에 옮겨 적을 유일한 단서다. 뒤에 붙이는 것은 다음 행동뿐이다.
   */
  const reason =
    preview.failureReason || "이 기획안은 지금 학술 활동으로 옮길 수 없습니다";
  return `${reason} — 지금 승인하면 같은 사유로 거절됩니다. 승인 대신 수정요청으로 돌려주세요`;
}

/**
 * 기획안 한 건을 검토한다 (#164).
 *
 * ── 두 번 부르는 이유 ─────────────────────────────────────────
 * 응답 API는 `rspnsCn`(문항 ID → 답변)만 준다. 문항 라벨은 폼 소유이고 운영진이 회차마다 고칠
 * 수 있으므로 응답에 복사해 두지 않는다 — 라벨은 폼 상세의 `qitemCpstCn`에서 온다.
 *
 * ── 개별 문항을 이름으로 지목하지 않는다 ──────────────────────
 * 유형·활동명·기간을 `qitemId`로 집어 따로 배치하는 쪽이 더 예쁠 수는 있다. 그렇게 하지 않는
 * 것은 **폼이 코드보다 자주 바뀌기 때문이다** — 운영진이 문항을 더하면 화면이 모르는 문항이
 * 되어 답이 통째로 사라지고(검토자는 제출자가 안 썼다고 읽는다), 계약 문항을 코드가 역산하는
 * 일도 되살아난다(#156이 지운 방식이다). 그래서 **폼의 문항 순서 그대로** 그린다 — 그 순서가
 * 곧 제출자가 읽으며 채운 순서이고, 시드가 활동 소개·기간·정기 일정·정원·장소를 그 차례로
 * 세워 두었다.
 *
 * ── 커리큘럼만 두 번 보인다 ───────────────────────────────────
 * 아래 기획안 내용에는 제출자가 적은 **원문 그대로**, 커리큘럼 카드에는 서버가 파싱한 **회차
 * 표**가 선다. 둘을 나란히 두는 것이 이 화면의 요점이다 — 파싱이 어긋난 기획안일수록 검토자가
 * 원문을 읽어야 하는데, 표만 그리면 화면이 제출자가 쓴 것을 조용히 삼킨다.
 */
function ProposalReviewDetail({
  formId,
  form,
  response,
  reload,
}: {
  formId: number;
  form: FormDetail;
  response: FormResponseDetail;
  reload: () => void;
}) {
  const router = useRouter();

  const { member } = response;
  const badge = RSPNS_STTS_BADGE[response.rspnsSttsCd];

  /*
   * 재제출 표시 (서버 #141 · #143). 기준은 **제출 회차**다 — 수정요청을 받아 같은 기획안을
   * 다시 낸 것이 재제출이고, 응답 순번은 그 사이에도 움직이지 않는다. 순번으로 판정하면
   * "두 번째로 낸 다른 기획안"이 재제출로 보인다.
   */
  const resubmitted = response.sbmsnSeq !== null && response.sbmsnSeq >= 2;

  /*
   * 이전·다음은 서버가 준 인접 ID로만 움직인다 — 상세 화면은 목록을 들고 있지 않다(URL로
   * 바로 들어올 수도 있다). replace를 쓰는 것은 기획안 수십 건을 훑고 나서 뒤로가기 한 번이면
   * 목록으로 돌아와야지, 훑은 만큼 히스토리를 되짚게 하면 안 되기 때문이다.
   */
  const go = (targetFormRspnsId: number | null) => {
    if (targetFormRspnsId === null) return;
    router.replace(ROUTES.proposalReviewDetail(targetFormRspnsId));
  };

  return (
    <>
      <PageHeader
        title={TITLE}
        subtitle={`기획안 #${response.formRspnsId}`}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <div className="flex items-center gap-2">
              <div className="text-[23px] font-medium">{member.mbrNm || "-"}</div>
              <div className="flex-1" />
              {resubmitted && <Badge tone="outline">재제출</Badge>}
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <div className="mt-1 text-[13px] text-n500">
              {resubmitted
                ? "수정요청을 받아 다시 낸 기획안입니다. 처리 이력에서 앞선 회차의 의견을 확인해주세요."
                : "제출자 정보는 회원 명부에서 조회합니다."}
            </div>
            <KeyValueGrid
              className="mt-4"
              items={[
                { k: FIELD_LABEL.studentNumber, v: member.stdntNo || "-" },
                {
                  k: FIELD_LABEL.generationNumber,
                  v: member.genNo ? `${member.genNo}기` : "-",
                },
                { k: FIELD_LABEL.departmentName, v: member.scsbjtNm || "-" },
                {
                  k: FIELD_LABEL.academicYear,
                  v: member.scyrNo ? `${member.scyrNo}학년` : "-",
                },
                { k: FIELD_LABEL.membershipGrade, v: mbrGrdNm(member.mbrGrdCd) },
                { k: FIELD_LABEL.membershipStatus, v: mbrSttsNm(member.mbrSttsCd) },
                { k: FIELD_LABEL.submittedAt, v: formatDt(response.sbmsnDt) || "-" },
                /*
                 * 응답 순번과 제출 회차는 **다른 값이라 칸도 따로 둔다**(서버 #143). 앞은 이
                 * 제출자가 낸 여러 기획안 중 몇 번째인가이고, 뒤는 그 한 건을 몇 번 냈는가다.
                 * 한 칸에 합치면 "2회차"가 두 번째 기획안인지 첫 기획안의 재제출인지 갈린다.
                 */
                {
                  k: "응답 순번",
                  v: response.rspnsSeq === null ? "-" : `${response.rspnsSeq}번째 기획안`,
                },
                {
                  k: "제출 회차",
                  v: response.sbmsnSeq === null ? "-" : `${response.sbmsnSeq}회차 제출`,
                },
              ]}
            />
            <button
              type="button"
              onClick={() => router.push(ROUTES.memberDetail(member.mbrId))}
              className="mt-4 cursor-pointer text-[14px] text-accent"
            >
              회원 상세로 이동 ›
            </button>
          </Card>

          <Card>
            <SectionLabel className="mb-3">기획안 내용</SectionLabel>
            <div className="flex flex-col gap-3">
              {/* 폼의 문항 순서가 기준이다 — 답이 없는 문항도 자리를 남긴다(필수 항목이 빈 것이 보여야 한다) */}
              {form.qitemCpstCn.qitems.map((q) => {
                const v = rspnsValueText(response.rspnsCn, q.qitemId);
                return (
                  <div key={q.qitemId}>
                    <div className="text-[13.5px] text-n500">{q.qitemLblNm}</div>
                    {/*
                      제출자가 적은 그대로 그린다. 줄바꿈을 살리는 것이 특히 중요한 자리다 —
                      커리큘럼은 한 줄에 한 회차씩 여러 줄로 적는 답이라, 줄바꿈을 접으면
                      파싱이 어긋났을 때 검토자가 무엇이 잘못됐는지 볼 수 없다.
                    */}
                    <div className="mt-[2px] text-[16px] leading-[1.7] break-words whitespace-pre-wrap">
                      {v || <span className="text-n500">(응답 없음)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 원문 바로 아래에 파싱 결과가 오게 둔다 — 두 개를 견주는 것이 이 화면의 일이다 */}
        <div className="mt-4">
          <ProposalCurriculumCard preview={response.academicProgramPreview} />
        </div>

        {/*
          검토 처리와 처리 이력은 나란히 둔다 — 무엇을 적을지는 앞선 처리를 보고 정하는 일이고
          (수정요청을 이미 한 번 보냈는지, 무엇을 고치라고 했는지), 둘을 위아래로 멀리 떨어뜨리면
          의견을 쓰는 동안 지난 이력이 화면에서 사라진다. 375px에서는 한 줄씩 쌓인다.
        */}
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
          {/*
            검토 패널은 응답 심사 화면과 **같은 컴포넌트**다(features/response · #133). 기획안이라고
            규칙이 달라지지 않는다 — 의견 필수 여부도, 승인·반려가 되돌릴 수 없다는 것도 같다.
            갈리는 것은 승인이 무엇을 일으키는가와 지금 승인이 성립하는가 둘뿐이라 그것만 넘긴다.
          */}
          <ResponseReviewPanel
            formId={formId}
            formRspnsId={response.formRspnsId}
            current={response.rspnsSttsCd}
            acceptBlockReason={acceptBlockReasonOf(response)}
            acceptNotice={ACCEPT_NOTICE}
            /* 처리 후에는 상세를 **통째로** 다시 부른다 — 부분 갱신하면 이전 사유가 남는다 */
            onReviewed={reload}
          />
          <ResponseReviewTimeline histories={response.reviewHistories} />
        </div>

        {/* Button은 whitespace-nowrap이라 좁은 화면에서는 조각 단위로 접히게 둔다 */}
        <div className="mt-4 flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <Button
            variant="ghost"
            disabled={response.prevFormRspnsId === null}
            onClick={() => go(response.prevFormRspnsId)}
          >
            이전
          </Button>
          <Button
            variant="ghost"
            disabled={response.nextFormRspnsId === null}
            onClick={() => go(response.nextFormRspnsId)}
          >
            다음
          </Button>
        </div>
      </PageBody>
    </>
  );
}

/** 폼 상세와 응답 상세를 함께 받아 그린다 — 둘 중 하나라도 없으면 그릴 수 없다 */
function ProposalReviewDetailContent({
  formId,
  formRspnsId,
}: {
  formId: number;
  formRspnsId: number;
}) {
  const rspns = useResponseDetail(formId, formRspnsId);
  const formQuery = useFormDetail(formId);

  const reloadAll = () => {
    rspns.reload();
    formQuery.reload();
  };

  if (rspns.status === "ready" && rspns.response && formQuery.form) {
    return (
      <ProposalReviewDetail
        formId={formId}
        form={formQuery.form}
        response={rspns.response}
        reload={reloadAll}
      />
    );
  }

  /*
   * **다른 폼의 응답 번호로 들어오면 서버가 404를 준다** — 경로의 formId 범위를 서버가 검사하므로
   * (#37), 모집 신청서 응답 번호를 이 주소에 넣어도 기획안 검토 화면에 남의 응답이 뜨지 않는다.
   * 웹은 그 404를 없는 기획안과 똑같이 처리하면 된다.
   */
  const notFound = rspns.status === "not-found" || formQuery.status === "not-found";
  const failed = rspns.status === "error" || formQuery.status === "error";
  const errorMessage = rspns.errorMessage || formQuery.errorMessage;

  return (
    <>
      <PageHeader title={TITLE} showBack />
      <PageBody>
        {notFound ? (
          <EmptyState message="기획안을 찾을 수 없습니다." />
        ) : failed ? (
          <EmptyState
            message={errorMessage || "기획안을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reloadAll }}
          />
        ) : (
          <EmptyState message="불러오는 중…" />
        )}
      </PageBody>
    </>
  );
}

export function ProposalReviewDetailPage({ formRspnsId }: { formRspnsId: number }) {
  const proposalForm = useProposalForm();

  /*
   * 주소에 폼 번호가 없으므로 여기서도 코드로 폼을 먼저 찾는다. 번호를 받기 전에는 상세 훅을
   * 마운트하지 않는다 — 0번 폼으로 조회가 나가거나 "찾을 수 없습니다"가 스쳐 지나가는 것을 막는다.
   */
  if (proposalForm.status === "ready" && proposalForm.form) {
    return (
      <ProposalReviewDetailContent
        formId={proposalForm.form.formId}
        formRspnsId={formRspnsId}
      />
    );
  }
  return <ProposalFormGate title={TITLE} showBack query={proposalForm} />;
}
