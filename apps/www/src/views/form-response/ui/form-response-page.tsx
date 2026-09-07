import type { ReactNode } from "react";
import Link from "next/link";
import { RESPONSE_STATUS_BADGE, type MyFormResponseDetail } from "@/entities/form";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더를 재export 하면 클라 번들이 오염된다(entities/form/index.ts)
import { fetchMyResponseDetail } from "@/entities/form/api/my-response-detail";
import { SignInButton } from "@/features/auth";
import { currentAccessToken, isUnauthenticated } from "@/shared/api/authed-client";
import { ROUTES } from "@/shared/config/routes";
import { Badge, EmptyState, Notice } from "@/shared/ui";
import { ResubmitForm } from "./resubmit-form";
import { ReviewTimeline } from "./review-timeline";

/*
 * 내 응답 상세 — 사유를 읽고 그 자리에서 다시 낸다 (ssccops#221 · `/f/{formId}/responses/{id}`).
 *
 * ── 왜 별도 화면인가 ─────────────────────────────────────────
 * `/f/{formId}`는 **"새로 내는" 화면**이고 여기는 **"다시 내는" 화면**이다. 한 화면에 두 뜻을
 * 담으면 `alreadySubmitted`(새 응답을 막는 상태 — 수정 요청도 포함된다)가 작성 폼을 닫는 것과
 * 재제출이 열려야 하는 것이 같은 자리에서 부딪힌다. 그래서 재제출은 **이 경로로만** 들어온다.
 *
 * ── 한 번의 조회로 다 받는다 ────────────────────────────────
 * 서버 `#274`가 이 응답에 문항 구성을 실었다. 사유·지난 답·문항이 한 응답에 있으므로 화면이
 * 둘을 따로 부르지 않는다 — 나누면 두 응답 사이에 폼이 편집됐을 때 답과 문항이 서로 다른 시점을
 * 가리킨다. 문항을 `/{formId}/public`에서 받을 수도 없다(마감된 폼을 409로 끊는데 재제출의 실제
 * 쓰임이 마감 뒤에 있다).
 *
 * ── 본인 것이 아니면 없는 것과 같다 ─────────────────────────
 * 서버가 남의 응답과 없는 응답을 **같은 404**로 준다(그 번호의 응답이 존재하는지가 새어 나가지
 * 않게). 화면도 둘을 구분하지 않는다.
 */
export async function FormResponsePage({
  formId,
  formRspnsId,
}: {
  formId: number;
  formRspnsId: number;
}) {
  if (
    !Number.isInteger(formId) ||
    formId <= 0 ||
    !Number.isInteger(formRspnsId) ||
    formRspnsId <= 0
  ) {
    return (
      <FormResponseShell>
        <EmptyState title="잘못된 주소입니다 — 링크를 다시 확인해 주세요" />
      </FormResponseShell>
    );
  }

  const token = await currentAccessToken();
  if (!token) {
    return (
      <FormResponseShell>
        <Notice
          title="로그인이 필요합니다"
          description="자기가 낸 응답은 본인만 볼 수 있습니다."
        >
          <SignInButton next={ROUTES.myFormResponse(formId, formRspnsId)} />
        </Notice>
      </FormResponseShell>
    );
  }

  let detail: MyFormResponseDetail;
  try {
    detail = await fetchMyResponseDetail(formId, formRspnsId);
  } catch (error) {
    if (isUnauthenticated(error)) {
      return (
        <FormResponseShell>
          <Notice
            title="로그인이 만료되었습니다"
            description="다시 로그인하면 이어서 볼 수 있습니다."
          >
            <SignInButton
              next={ROUTES.myFormResponse(formId, formRspnsId)}
              label="다시 로그인"
            />
          </Notice>
        </FormResponseShell>
      );
    }
    return (
      <FormResponseShell>
        <EmptyState
          title="응답을 찾을 수 없습니다"
          description="주소가 잘못되었거나 본인이 낸 응답이 아닙니다"
        />
      </FormResponseShell>
    );
  }

  const status = RESPONSE_STATUS_BADGE[detail.rspnsSttsCd];
  const canResubmit = detail.rspnsSttsCd === "CHANGES_REQUESTED";

  return (
    <FormResponseShell>
      <header className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[6px]">
          <Badge tone={status.tone}>{status.label}</Badge>
          {detail.sbmsnSeq !== null && detail.sbmsnSeq > 1 && (
            <span className="text-[13px] text-n500">{detail.sbmsnSeq}회차 제출</span>
          )}
        </div>
        <h1 className="text-[20px] font-medium tracking-[-.3px] lg:text-[22px]">
          {canResubmit ? "수정 요청을 받은 응답입니다" : "내가 낸 응답"}
        </h1>
        {canResubmit && (
          <p className="text-[13.5px] leading-[1.7] text-n500">
            아래 사유를 확인하고 답을 고쳐 다시 제출해 주세요. 이전에 낸 답이 그대로 채워져
            있습니다.
          </p>
        )}
      </header>

      <ReviewTimeline histories={detail.reviewHistories} />

      {/*
       * 재제출은 수정 요청을 받은 응답에서만 연다. 승인·반려는 종결이고(서버 전이표), 제출 뒤
       * 검토를 기다리는 중이면 고칠 것이 아니라 기다리는 것이 맞다 — 폼을 그려 두고 제출에서
       * 409로 막으면 사용자는 무엇을 고쳐야 하는지 알 수 없다.
       */}
      {canResubmit ? (
        <ResubmitForm
          formId={formId}
          composition={detail.qitemCpstCn}
          initialAnswers={detail.rspnsCn}
        />
      ) : (
        <Notice
          title="지금은 다시 낼 수 없습니다"
          description="수정 요청을 받은 응답만 다시 낼 수 있습니다."
        >
          <Link
            href={ROUTES.myApplications}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            내 신청으로
          </Link>
        </Notice>
      )}
    </FormResponseShell>
  );
}

/** 공개 폼 계열과 같은 폭을 쓴다 — 근거는 `public-form-page`의 주석에 있다 */
function FormResponseShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-[860px] flex-col gap-[14px]">{children}</div>;
}
