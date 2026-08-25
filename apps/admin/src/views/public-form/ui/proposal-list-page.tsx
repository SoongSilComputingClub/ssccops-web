"use client";

import { useState } from "react";
import Link from "next/link";
import type { QitemCpstCn } from "@ssccops/form-renderer";
import {
  continuableResponse,
  PROPOSAL_REJECTED_LOCKED,
  useFormDetail,
  useMyResponses,
  useProposalForm,
} from "@/features/form";
import { RSPNS_STTS_BADGE, type MyFormResponse } from "@/entities/response";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { Badge, EmptyState } from "@/shared/ui";
import { ProposalFormNotice, ProposalNav } from "./proposal-form-notice";
import { ProposalSubmissionDetail } from "./proposal-submission-detail";

/*
 * 기획안 제출 현황 (/proposals · ssccops-web #163).
 *
 * 지금까지 무엇이 접수됐고 왜 안 됐는지는 카카오톡·구두에만 남아 아무도 되짚을 수 없었다.
 * 이 화면이 그 자리를 대신한다 — 낸 건마다 상태와 처리 이력이 붙는다.
 *
 * ── 목록은 내 응답 조회 하나로 그린다 ──────────────────────────
 * `GET .../responses/mine`(서버 #143)이 건수·상태·회차·일시를 준다. 운영자용 응답 목록을 쓰지
 * 않는 것은 그쪽이 남의 응답까지 싣는 심사용 경로이고 권한도 다르기 때문이다.
 *
 * 낸 내용과 처리 사유는 여기 없다 — 펼친 건에서만 따로 부른다(proposal-submission-detail).
 */
export function ProposalListPage() {
  const proposal = useProposalForm();

  if (proposal.status !== "ready" || proposal.form === null) {
    return <ProposalFormNotice query={proposal} />;
  }

  return (
    <>
      <ProposalNav current="status" />
      <ProposalListContent formId={proposal.form.formId} />
    </>
  );
}

/*
 * 폼을 찾은 뒤에야 마운트된다 — 그래야 아래 훅들이 `formId`를 언제나 갖는다(상세 화면들이
 * `ready`가 되기 전에 폼을 마운트하지 않는 것과 같은 규칙, AGENTS.md).
 */
function ProposalListContent({ formId }: { formId: number }) {
  const mine = useMyResponses(formId);
  /*
   * 문항 라벨을 얻으려고 폼 상세를 함께 부른다. 응답자용 조회(GET .../public)를 쓰지 않는 것은
   * 접수 중이 아닌 폼에서 409로 끊기기 때문이다 — 기획안 폼은 접수를 닫아 둔 채 지난 제출을
   * 들여다보는 시간이 오히려 길다. 진입 조회가 이미 폼 조회 권한을 쓰고 있어 새로 요구하는
   * 권한도 없다.
   */
  const formQuery = useFormDetail(formId);

  const [openId, setOpenId] = useState<number | null>(null);

  const continuing = continuableResponse(mine.responses);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 px-4 pt-3 pb-10 lg:px-6">
      <div className="rounded-2xl bg-surface px-[18px] py-[22px] shadow-[0_0_0_1px_#e5e8eb] lg:px-6">
        <div className="text-[24px] leading-[1.3] font-bold">기획안 제출 현황</div>
        <div className="mt-1 text-[13.5px] leading-[1.7] text-n500">
          낸 기획안과 검토 상태를 보여줍니다. 기획안은 여러 건을 낼 수 있습니다.
        </div>
        <Link
          href={ROUTES.proposalNew}
          className="mt-4 block cursor-pointer rounded-[14px] border border-accent bg-accent py-[13px] text-center text-[15.5px] font-bold text-white hover:bg-accent-strong"
        >
          기획안 작성하기
        </Link>
      </div>

      {mine.status === "loading" && (
        <EmptyState message="제출 현황을 불러오는 중입니다…" />
      )}

      {mine.status === "error" && (
        <EmptyState
          message={mine.errorMessage}
          action={{ label: "다시 시도", onClick: mine.reload }}
        />
      )}

      {mine.status === "ready" && mine.responses.length === 0 && (
        <EmptyState message="아직 낸 기획안이 없습니다." />
      )}

      {mine.status === "ready" &&
        mine.responses.map((response) => (
          <ProposalSubmissionCard
            key={response.formRspnsId}
            formId={formId}
            response={response}
            /*
             * 다음 제출이 이어 쓸 건. 서버가 고르는 규칙을 화면이 짚어 줄 뿐이며(#163의
             * continuableResponse 주석), 판정을 대신하지는 않는다.
             */
            continuing={continuing?.formRspnsId === response.formRspnsId}
            qitemCpstCn={formQuery.form?.qitemCpstCn ?? null}
            open={openId === response.formRspnsId}
            onToggle={() =>
              setOpenId((current) =>
                current === response.formRspnsId ? null : response.formRspnsId,
              )
            }
          />
        ))}
    </div>
  );
}

/*
 * 기획안 한 건.
 *
 * ── 순번과 회차를 한 자리에 섞지 않는다 ────────────────────────
 * 순번(rspnsSeq)은 몇 번째로 낸 건인가이고 회차(sbmsnSeq)는 그 한 건을 몇 번 냈는가다. 섞으면
 * "2회차"가 두 번째 기획안인지 첫 기획안의 재제출인지 갈린다. 회차는 재제출한 건에만 적는다 —
 * 1회차는 모든 응답이 지나온 자리라 적을 것이 없다.
 *
 * ── 반려에서 재제출을 잠근다 ──────────────────────────────────
 * 서버는 반려된 응답의 재제출을 409 RESPONSE_ALREADY_REJECTED로 끊는다(#141). 화면이 그것을
 * 미리 말하지 않으면 제출자는 다 고쳐 쓴 뒤에야 거절을 받는다. 잠금 문구와 서버 거절 문구는
 * 같은 상수다 — 다르게 말하면 두 가지 일이 일어난 것으로 읽힌다.
 */
function ProposalSubmissionCard({
  formId,
  response,
  continuing,
  qitemCpstCn,
  open,
  onToggle,
}: {
  formId: number;
  response: MyFormResponse;
  continuing: boolean;
  qitemCpstCn: QitemCpstCn | null;
  open: boolean;
  onToggle: () => void;
}) {
  const badge = RSPNS_STTS_BADGE[response.rspnsSttsCd];
  const isDraft = response.rspnsSttsCd === "DRAFT";
  const isRejected = response.rspnsSttsCd === "REJECTED";

  return (
    <div className="rounded-2xl bg-surface px-[18px] py-4 shadow-[0_0_0_1px_#e5e8eb] lg:px-6">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[15px] font-semibold">
          {response.rspnsSeq === null ? "기획안" : `${response.rspnsSeq}번째 기획안`}
        </span>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {response.sbmsnSeq !== null && response.sbmsnSeq >= 2 && (
          <span className="text-[13px] text-n500">{response.sbmsnSeq}회차 제출</span>
        )}
        <div className="flex-1" />
        {/* 아직 내지 않은 건은 제출 일시가 없다 — 대신 마지막 저장 시각을 말한다 */}
        <span className="text-[13px] text-n500">
          {response.sbmsnDt
            ? formatDt(response.sbmsnDt)
            : response.mdfcnDt
              ? `${formatDt(response.mdfcnDt)} 저장`
              : "제출 전"}
        </span>
      </div>

      {isRejected && (
        <div className="mt-2 rounded-[12px] border border-danger/35 bg-danger/10 px-3 py-[10px] text-[13.5px] leading-[1.7] text-danger">
          {PROPOSAL_REJECTED_LOCKED}
        </div>
      )}

      {continuing && !isRejected && (
        <div className="mt-2 rounded-[12px] border border-accent/30 bg-accent/8 px-3 py-[10px] text-[13.5px] leading-[1.7] text-accent">
          {isDraft
            ? "작성 중인 기획안입니다 — 이어서 쓰고 제출하면 이 건이 접수됩니다."
            : "다음에 제출하는 내용이 이 기획안의 다음 회차로 들어갑니다 — 제출하면 검토 대기로 돌아갑니다."}
          <Link href={ROUTES.proposalNew} className="ml-[6px] underline">
            {isDraft ? "이어서 작성" : "고쳐서 다시 제출"}
          </Link>
        </div>
      )}

      {/*
        작성 중인 건에는 처리 이력이 없다 — 낸 적이 없으므로 남을 줄도 없다. 펼치는 자리를
        만들어 두면 언제나 빈 상자만 열린다.
      */}
      {!isDraft && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 cursor-pointer text-[13.5px] text-accent underline"
        >
          {open ? "검토 내용 접기" : "낸 내용과 검토 내용 보기"}
        </button>
      )}

      {open && !isDraft && (
        <ProposalSubmissionDetail
          formId={formId}
          formRspnsId={response.formRspnsId}
          qitemCpstCn={qitemCpstCn}
        />
      )}
    </div>
  );
}
