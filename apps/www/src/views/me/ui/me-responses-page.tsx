import { RESPONSE_STATUS_BADGE, type MyFormResponseOverview } from "@/entities/form";
import { fetchMyResponsesAcrossForms } from "@/entities/form/api/my-responses-across-forms";
import { fetchAuthSession } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { resolveGate } from "../model/gate";
import { lookupProposalForm, proposalFormIdOf } from "../model/proposal-form";
import { filterByStatus, presentStatuses, splitProposals } from "../model/responses";
import { loadReviewOpinions } from "../model/review-opinions";
import { FormResponsesSection } from "./form-responses-section";
import { AccountLine, GateNotice } from "./gate-notices";
import { MeFrame } from "./me-frame";
import { StatusFilter } from "./status-filter";

/*
 * 낸 폼 전량 — 기획안 제외 (SSR · #574 · ssccops#428 · ssccops#221) — 허브 `/me`의 ②를 한 장으로.
 *
 * `GET /v1/forms/responses/mine`에서 기획안 폼 응답을 뺀 나머지다(`splitProposals`). 기획안은
 * `/me/proposals`가 lms로 보낸다 — 첫 판(#518)처럼 칩 하나로 섞어 두면 카드가 가리키는 www
 * 응답 상세가 기획안에는 반쪽이었다. 기획안 폼을 모르면(조회 실패) 가를 수 없어 전부 여기 남는다.
 *
 * 상태 필터(`?status=`)는 주소의 일이라 서버 컴포넌트가 거른 뒤 넘기고, 라벨 칩은 종전대로
 * 클라이언트 구역(`FormResponsesSection`)이 거른다 — 두 축이 겹쳐도 목록은 하나다.
 */
const STATUS_ORDER = Object.keys(RESPONSE_STATUS_BADGE);

export async function MeResponsesPage({ status }: Readonly<{ status: string | null }>) {
  return (
    <MeFrame
      pathname={ROUTES.meResponses}
      description="낸 폼 응답과 검토 상태를 확인할 수 있습니다"
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
  if (gate.kind !== "ready") return <GateNotice gate={gate} next={ROUTES.meResponses} />;

  if (responsesResult.status === "rejected") {
    return (
      <div className="flex flex-col gap-[12px]">
        <AccountLine session={gate.session} />
        <EmptyState title="폼 응답을 불러오지 못했습니다 — 잠시 후 다시 시도해주세요" />
      </div>
    );
  }

  const proposalFormId =
    proposalForm.status === "fulfilled" ? proposalFormIdOf(proposalForm.value) : null;
  const { forms } = splitProposals(responsesResult.value, proposalFormId);

  return (
    <div className="flex flex-col gap-[12px]">
      <AccountLine session={gate.session} />
      <ResponseList forms={forms} status={status} />
    </div>
  );
}

async function ResponseList({
  forms,
  status,
}: Readonly<{
  forms: MyFormResponseOverview[];
  status: string | null;
}>) {
  if (forms.length === 0) {
    return (
      <EmptyState
        title="아직 낸 응답이 없습니다"
        description="받은 폼 링크를 열면 이 화면에서 진행 상황을 확인할 수 있습니다"
      />
    );
  }

  const statusOf = (response: MyFormResponseOverview) => response.rspnsSttsCd;
  const options = presentStatuses(forms, statusOf, STATUS_ORDER).map((code) => ({
    code,
    label: RESPONSE_STATUS_BADGE[code as MyFormResponseOverview["rspnsSttsCd"]].label,
  }));
  const selected = status !== null && STATUS_ORDER.includes(status) ? status : null;
  const visible = filterByStatus(forms, selected, statusOf, STATUS_ORDER);
  const reviewOpinions = await loadReviewOpinions(visible);

  return (
    <div className="flex flex-col gap-[12px]">
      <StatusFilter basePath={ROUTES.meResponses} options={options} selected={selected} />
      {visible.length === 0 ? (
        <EmptyState title="해당 상태의 응답이 없습니다" />
      ) : (
        <FormResponsesSection responses={visible} reviewOpinions={reviewOpinions} />
      )}
    </div>
  );
}
