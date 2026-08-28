import Link from "next/link";
import {
  RSPNS_STTS_BADGE,
  rspnsValueText,
  type MyFormResponseDetail,
  type QitemCpstCn,
} from "@/entities/response";
import { loadProposalDetail, PROPOSAL_REJECTED_LOCKED } from "@/features/proposal";
import { LoginGate } from "@/features/auth";
import { ROUTES, signupUrl } from "@/shared/config/routes";
import { Badge, Card, EmptyState, Notice } from "@/shared/ui";
import { formatDt } from "@/shared/lib/date";
import { ReviewTimeline } from "./review-timeline";
import { ResubmitForm } from "./resubmit-form";

/*
 * 기획안 한 건의 상세 (#171 · SSR 셸 + (수정요청 건이면) 클라이언트 재제출 폼).
 *
 * ── 무엇을 보여주는가 ──────────────────────────────────────
 * - 낸 내용 — 폼의 문항 라벨과 맞춰 그린다(라벨을 화면에 적어 두면 운영진이 문구를 고칠 때
 *   갈린다 · #156).
 * - 검토 이력 타임라인 — 처리 구분·처리자·일시·사유. 반려·수정요청 사유는 서버 문구 그대로.
 * - 현재 상태에 따른 처리 영역:
 *   · `CHANGES_REQUESTED` → 재제출 폼(이전 답 프리필). 서버가 재제출을 이 상태에서만 받는다.
 *   · `REJECTED` → 잠금 안내(반려는 되돌릴 수 없다).
 *   · 그 밖(`SUBMITTED`·`ACCEPTED`·`DRAFT`) → 상태 안내만.
 *
 * ── 왜 상태로 폼 노출을 가르는가 ──────────────────────────
 * 서버 `findContinuableResponse`가 재제출을 `CHANGES_REQUESTED`(또는 DRAFT)에서만 이어
 * 받는다. `SUBMITTED` 건에 폼을 열어 두면 사용자가 다 고쳐 쓴 뒤 제출이 새 기획안으로
 * 들어가거나(다중 응답 폼) 409로 끊긴다 — 지금 할 수 있는 일 하나만 그린다(AGENTS.md).
 */

export async function ProposalDetailPage({
  formRspnsId,
}: {
  formRspnsId: number | null;
}) {
  if (formRspnsId === null) {
    return (
      <div className="flex flex-col gap-[16px]">
        <BackLink />
        <EmptyState
          title="기획안을 찾을 수 없습니다"
          description="제출 현황에서 기획안을 골라 들어와주세요."
        />
      </div>
    );
  }

  const result = await loadProposalDetail(formRspnsId);

  return (
    <div className="flex flex-col gap-[16px]">
      <BackLink />
      <Body result={result} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={ROUTES.myApplications}
      className="text-[13.5px] text-n300 hover:text-accent"
    >
      ← 기획안 제출 현황
    </Link>
  );
}

function Body({
  result,
}: {
  result: Awaited<ReturnType<typeof loadProposalDetail>>;
}) {
  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="기획안 상세는 낸 본인만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 기획안을 볼 수 있습니다"
        description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
      >
        {signup && (
          <a
            href={signup}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            회원 가입하기
          </a>
        )}
      </Notice>
    );
  }

  if (result.outcome === "not-seeded") {
    return (
      <EmptyState
        title="기획안 폼이 아직 준비되지 않았습니다"
        description="운영진이 기획안 접수를 시작하면 이 화면을 열 수 있습니다."
      />
    );
  }

  if (result.outcome === "not-found") {
    return (
      <EmptyState
        title="기획안을 찾을 수 없습니다"
        description="이미 지워졌거나 다른 사람이 낸 기획안일 수 있습니다 — 제출 현황을 다시 확인해주세요."
      />
    );
  }

  if (result.outcome === "error") {
    return (
      <EmptyState title="기획안을 불러오지 못했습니다" description={result.message} />
    );
  }

  const { formId, detail, qitemCpstCn } = result;
  const badge = RSPNS_STTS_BADGE[detail.rspnsSttsCd];

  return (
    <div className="flex flex-col gap-[16px]">
      <Card className="flex flex-col gap-[8px]">
        <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <span className="text-[17px] font-semibold">
            {detail.rspnsSeq === null
              ? "기획안"
              : `${detail.rspnsSeq}번째 기획안`}
          </span>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          {detail.sbmsnSeq !== null && detail.sbmsnSeq >= 2 && (
            <span className="text-[13px] text-n500">
              {detail.sbmsnSeq}회차 제출
            </span>
          )}
        </div>
        <div className="text-[13px] text-n500">
          {detail.sbmsnDt
            ? `최근 제출 ${formatDt(detail.sbmsnDt)}`
            : detail.mdfcnDt
              ? `최근 저장 ${formatDt(detail.mdfcnDt)}`
              : "아직 제출하지 않았습니다"}
        </div>
      </Card>

      <SubmittedContent detail={detail} qitemCpstCn={qitemCpstCn} />

      <ReviewTimeline histories={detail.reviewHistories} />

      <ProcessArea
        status={detail.rspnsSttsCd}
        formId={formId}
        qitemCpstCn={qitemCpstCn}
        rspnsCn={detail.rspnsCn}
      />
    </div>
  );
}

/*
 * 낸 내용 — 폼의 문항 순서대로, 답이 있는 문항만 그린다. 답이 없는 선택 문항은 줄을 만들지
 * 않는다("값이 없다"와 "값이 있는 척"은 다르다).
 */
function SubmittedContent({
  detail,
  qitemCpstCn,
}: {
  detail: MyFormResponseDetail;
  qitemCpstCn: QitemCpstCn;
}) {
  const answered = qitemCpstCn.qitems
    .map((q) => ({
      qitemId: q.qitemId,
      label: q.qitemLblNm,
      value: rspnsValueText(detail.rspnsCn, q.qitemId),
    }))
    .filter((row) => row.value !== "");

  if (answered.length === 0) {
    return (
      <Card>
        <div className="text-[13px] tracking-[.3px] text-n400">낸 내용</div>
        <p className="mt-2 text-[13.5px] text-n500">
          아직 작성된 답이 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-[13px] tracking-[.3px] text-n400">낸 내용</div>
      <dl className="mt-3 flex flex-col gap-[12px]">
        {answered.map((row) => (
          <div key={row.qitemId}>
            <dt className="text-[13px] text-n500">{row.label}</dt>
            <dd className="mt-[3px] text-[15px] leading-[1.7] whitespace-pre-wrap break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ProcessArea({
  status,
  formId,
  qitemCpstCn,
  rspnsCn,
}: {
  status: MyFormResponseDetail["rspnsSttsCd"];
  formId: number;
  qitemCpstCn: QitemCpstCn;
  rspnsCn: MyFormResponseDetail["rspnsCn"];
}) {
  if (status === "CHANGES_REQUESTED") {
    return (
      <section className="flex flex-col gap-[10px]">
        <h2 className="text-[16px] font-semibold">다시 제출하기</h2>
        <p className="text-[13.5px] leading-[1.7] text-n500">
          위 처리 이력의 수정요청 사유를 반영해 아래에서 답을 고친 뒤 다시 제출하세요. 이전에
          낸 내용이 미리 채워져 있습니다.
        </p>
        <ResubmitForm
          formId={formId}
          composition={qitemCpstCn}
          initialAnswers={rspnsCn}
        />
      </section>
    );
  }

  if (status === "REJECTED") {
    return (
      <Card>
        <div className="text-[13px] tracking-[.3px] text-n400">처리 결과</div>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-n300">
          {PROPOSAL_REJECTED_LOCKED}
        </p>
      </Card>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <Card>
        <div className="text-[13px] tracking-[.3px] text-n400">처리 결과</div>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-n300">
          승인된 기획안입니다 — 학술 활동으로 이관되면 활동 화면에서 이어집니다.
        </p>
      </Card>
    );
  }

  if (status === "DRAFT") {
    return (
      <Card>
        <div className="text-[13px] tracking-[.3px] text-n400">상태</div>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-n300">
          아직 제출하지 않은 기획안입니다 — 기획안 작성 화면에서 이어서 작성해 제출할 수
          있습니다.
        </p>
      </Card>
    );
  }

  // SUBMITTED
  return (
    <Card>
      <div className="text-[13px] tracking-[.3px] text-n400">상태</div>
      <p className="mt-2 text-[13.5px] leading-[1.7] text-n300">
        학술국장 검토를 기다리는 중입니다 — 결과는 이 화면에서 확인할 수 있습니다.
      </p>
    </Card>
  );
}
