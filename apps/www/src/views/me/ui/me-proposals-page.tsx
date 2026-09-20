import { RESPONSE_STATUS_BADGE, type MyFormResponseOverview } from "@/entities/form";
import { fetchMyResponsesAcrossForms } from "@/entities/form/api/my-responses-across-forms";
import { fetchAuthSession } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { resolveGate } from "../model/gate";
import { lookupProposalForm, type ProposalFormLookup } from "../model/proposal-form";
import {
  filterByStatus,
  needsActionFirst,
  presentStatuses,
  splitProposals,
} from "../model/responses";
import { loadReviewOpinions } from "../model/review-opinions";
import { AccountLine, GateNotice } from "./gate-notices";
import { MeFrame } from "./me-frame";
import { ProposalCard } from "./proposal-card";
import { StatusFilter } from "./status-filter";

/*
 * 낸 기획안 (SSR · #574 · ssccops#428) — 허브 `/me`의 ③을 한 장으로.
 *
 * ── 목록은 여기, 한 건은 lms ──────────────────────────────────
 * 기획안은 `GET /v1/forms/responses/mine` 중 기획안 폼(`PROPOSAL` · `lookupProposalForm`)의
 * 응답이다. **lms가 주인이다** — 재제출·수정 요청 대응·검토 이력이 lms `/my/applications/{id}`에
 * 있으므로 카드(`ProposalCard`)는 그쪽으로 가고, www의 응답 상세로는 보내지 않는다. 이 앱은
 * «내가 낸 기획안이 무엇이고 어느 상태인가»까지만 그린다(ssccops#386 «학술은 lms, 요약은 www»).
 *
 * ── 기획안 폼을 모를 때 ────────────────────────────────────
 * 404(아직 시드되지 않음)면 기획안 폼이 없는 환경이라 낸 기획안도 없다 — 빈 목록이 맞다. 그 밖의
 * 실패는 응답을 가를 수 없어 이 페이지가 안내로 서고, 그 사이 기획안은 «낸 폼»에 남는다.
 */
const STATUS_ORDER = Object.keys(RESPONSE_STATUS_BADGE);

export async function MeProposalsPage({ status }: Readonly<{ status: string | null }>) {
  return (
    <MeFrame
      pathname={ROUTES.meProposals}
      description="낸 기획안과 검토 상태를 확인할 수 있습니다. 상세와 재제출은 LMS에서 합니다."
    >
      <Body status={status} />
    </MeFrame>
  );
}

async function Body({ status }: Readonly<{ status: string | null }>) {
  const [sessionResult, responsesResult, proposalForm] = await Promise.allSettled([
    fetchAuthSession(),
    fetchMyResponsesAcrossForms(),
    lookupProposalForm(),
  ]);

  const gate = resolveGate(sessionResult, responsesResult);
  if (gate.kind !== "ready") return <GateNotice gate={gate} next={ROUTES.meProposals} />;

  return (
    <div className="flex flex-col gap-[12px]">
      <AccountLine session={gate.session} />
      {responsesResult.status === "rejected" ? (
        <EmptyState title="기획안을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      ) : (
        <ProposalList
          responses={responsesResult.value}
          lookup={proposalForm.status === "fulfilled" ? proposalForm.value : { outcome: "error" }}
          status={status}
        />
      )}
    </div>
  );
}

async function ProposalList({
  responses,
  lookup,
  status,
}: Readonly<{
  responses: MyFormResponseOverview[];
  lookup: ProposalFormLookup;
  status: string | null;
}>) {
  if (lookup.outcome === "error") {
    return <EmptyState title="기획안을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />;
  }

  const { proposals } =
    lookup.outcome === "found"
      ? splitProposals(responses, lookup.formId)
      : { proposals: [] as MyFormResponseOverview[] };

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="아직 낸 기획안이 없습니다"
        description="LMS에서 기획안을 내면 여기에서 검토 상태를 확인할 수 있습니다"
      />
    );
  }

  const statusOf = (response: MyFormResponseOverview) => response.rspnsSttsCd;
  const options = presentStatuses(proposals, statusOf, STATUS_ORDER).map((code) => ({
    code,
    label: RESPONSE_STATUS_BADGE[code as MyFormResponseOverview["rspnsSttsCd"]].label,
  }));
  const selected = status !== null && STATUS_ORDER.includes(status) ? status : null;
  const visible = needsActionFirst(filterByStatus(proposals, selected, statusOf, STATUS_ORDER));
  const reviewOpinions = await loadReviewOpinions(visible);

  return (
    <div className="flex flex-col gap-[12px]">
      <StatusFilter basePath={ROUTES.meProposals} options={options} selected={selected} />
      {visible.length === 0 ? (
        <EmptyState title="해당 상태의 기획안이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {visible.map((response) => (
            <ProposalCard
              key={response.formRspnsId}
              response={response}
              reviewOpinion={reviewOpinions[response.formRspnsId] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
