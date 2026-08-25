"use client";

import {
  PROPOSAL_NOT_ACCEPTING_DESCRIPTION,
  PROPOSAL_NOT_ACCEPTING_TITLE,
  PROPOSAL_RESUBMIT_NOTE,
  useProposalForm,
} from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { ProposalFormNotice, ProposalNav } from "./proposal-form-notice";
import { PublicFormPage } from "./public-form-page";

/*
 * 기획안 작성·제출 (/proposals/new · ssccops-web #163).
 *
 * ── 이 화면은 폼 렌더러 한 겹 위다 ─────────────────────────────
 * 문항도 검증도 자동 저장도 제출도 **공개 폼 화면 그대로**다. 기획안 전용 입력 화면을 새로
 * 만들면 운영진이 문항을 하나 더하거나 문구를 고치는 순간 이 화면만 따라오지 못하는데, 그것은
 * 기획안을 별도 도메인이 아니라 폼으로 받기로 한 이유(ssccops#131)를 정면으로 깨뜨린다.
 * 여기서 하는 일은 셋뿐이다 — 폼을 찾고, 접수 불가 문구를 이 화면의 말로 바꾸고, 제출한 뒤
 * 제출 현황으로 보낸다.
 *
 * ── 커리큘럼 안내를 여기에 적지 않는다 ─────────────────────────
 * `1회차 | 주제 | 2026-03-05` 형식 안내는 서버 시드가 **문항 문구(qitemLblNm)에 직접** 넣어
 * 두었다(`ProposalFormSeed.CURRICULUM_LABEL`). 화면이 같은 말을 한 번 더 적으면 두 문장은
 * 반드시 갈리고, 갈린 순간 제출자는 화면 안내대로 적었는데 승인이 막힌다. 화면이 커리큘럼을
 * 파싱하지 않는 것도 같은 결정의 다른 면이다 — 구조화는 승인 시점에 서버가 한다.
 *
 * ── 이미 냈어도 화면이 닫히지 않는다 ───────────────────────────
 * 기획안 폼은 `mltplRspnsYn = true`라 한 사람이 여러 건을 낸다. 화면에 따로 분기를 두지 않는
 * 것은 서버가 `alreadySubmitted`를 "더 낼 수 없는가"로 판정해 내려주기 때문이다 — 웹이 같은
 * 판정을 다시 적으면 규칙이 두 벌이 된다(usePublicForm 주석).
 */
export function ProposalNewPage() {
  const proposal = useProposalForm();

  if (proposal.status !== "ready" || proposal.form === null) {
    return <ProposalFormNotice query={proposal} />;
  }

  return (
    <>
      <ProposalNav current="new" />
      <PublicFormPage
        formId={proposal.form.formId}
        /*
         * 접수 불가는 기획안에서 **정상 상태**다. 폼은 시드 직후 작성 중이고 접수 기간도 비어
         * 있어(서버 ProposalFormSeeder), 운영진이 열기 전까지 서버가 409로 끊는다.
         */
        notAccepting={{
          title: PROPOSAL_NOT_ACCEPTING_TITLE,
          description: PROPOSAL_NOT_ACCEPTING_DESCRIPTION,
        }}
        intro={
          <div className="rounded-[12px] border border-line bg-surface px-3 py-[10px] text-[13.5px] leading-[1.7] text-n400">
            {PROPOSAL_RESUBMIT_NOTE}
          </div>
        }
        /*
         * 제출 뒤에는 완료 화면이 아니라 제출 현황으로 간다. 기획안은 내고 끝나는 것이 아니라
         * 검토를 기다리는 일이라, 낸 직후에 봐야 할 것은 "접수됐습니다" 한 줄이 아니라 그 건이
         * 목록에서 검토 대기로 서 있는 모습이다.
         */
        doneHref={ROUTES.proposals}
      />
    </>
  );
}
