import type { ReactNode } from "react";
import Link from "next/link";
import { RESPONSE_STATUS_BADGE, type MyFormResponseDetail } from "@/entities/form";
// 배럴을 거치지 않는다 — 배럴이 SSR 로더를 재export 하면 클라 번들이 오염된다(entities/form/index.ts)
import { fetchMyResponseDetail } from "@/entities/form/api/my-response-detail";
import { SignInButton } from "@/features/auth";
import { currentAccessToken, isUnauthenticated } from "@/shared/api/authed-client";
import { ROUTES } from "@/shared/config/routes";
import { Badge, EmptyState, Notice } from "@/shared/ui";
import { ResponseAnswers } from "./response-answers";
import { ResubmitForm } from "./resubmit-form";
import { ReviewTimeline } from "./review-timeline";

/*
 * 내 응답 상세 — 낸 것을 읽고, 수정 요청을 받았으면 그 자리에서 다시 낸다
 * (ssccops#221 · #263 · `/f/{formId}/responses/{id}`).
 *
 * ── 조회는 열고 수정은 닫는다 (ssccops-web#358) ──────────────
 * 이 화면은 **자기가 낸 응답을 보는 자리**이고, 재제출은 그 위에 조건부로 얹힌다. 처음에는
 * 반대였다 — 재제출 화면이라 여겨 수정 요청을 받지 않은 응답은 카드에서 여기로 오지도
 * 못했고, 그래서 운영진이 본 증상이 "수정 요청을 보내야 응답이 보인다"였다. 서버는 처음부터
 * 상태와 무관하게 내용을 내주고 있었으므로(서버 #326) 막던 것은 화면이었고, 그것을 걷었다.
 *
 * **승인·반려로 종결된 응답도 열린다.** 종결은 수정을 막는 것이지 조회를 막는 것이 아니고,
 * **반려 사유는 처리 이력에만 있어** 여기를 닫으면 반려된 사람이 사유를 읽을 길이 없다.
 *
 * ── 다시 낼 수 있는가는 서버가 답한다 ────────────────────────
 * `detail.canResubmit`이다. 화면이 `rspnsSttsCd`로 되짚지 않는다 — 판정이 두 벌이면 상태
 * 어휘가 늘 때 서버만 고쳐지고 화면은 옛 규칙으로 남는다. **재제출 규칙 자체는 그대로다**
 * (수정 요청을 받은 응답만 · 응답 수정 기능은 운영진이 기각했다).
 *
 * ── 왜 별도 화면인가 ─────────────────────────────────────────
 * `/f/{formId}`는 **"새로 내는" 화면**이고 여기는 **"이미 낸 것"의 화면**이다. 한 화면에 두 뜻을
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
  // 서버가 준 값 그대로다 — 상태 코드로 다시 계산하지 않는다(머리말 참고)
  const canResubmit = detail.canResubmit;
  const isDraft = detail.rspnsSttsCd === "DRAFT";

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
       * 재제출은 수정 요청을 받은 응답에서만 연다(서버가 `canResubmit`으로 말한다). 승인·반려는
       * 종결이고(서버 전이표), 제출 뒤 검토를 기다리는 중이면 고칠 것이 아니라 기다리는 것이
       * 맞다 — 폼을 그려 두고 제출에서 409로 막으면 사용자는 무엇을 고쳐야 하는지 알 수 없다.
       *
       * 폼이 닫힌 자리에는 **낸 답을 읽기 전용으로** 그린다. 재제출이 열린 쪽은 같은 답이
       * 프리필로 이미 폼 안에 있으므로 두 번 그리지 않는다.
       */}
      {canResubmit ? (
        <ResubmitForm
          formId={formId}
          composition={detail.qitemCpstCn}
          initialAnswers={detail.rspnsCn}
        />
      ) : (
        <>
          <ResponseAnswers composition={detail.qitemCpstCn} answers={detail.rspnsCn} />

          {/*
           * 작성 중인 응답은 갈 곳이 다르다 — 여기서는 이어 쓸 수 없고 폼이 그 자리다.
           * 카드가 이제 전부 이 화면으로 오므로(#358) 그 길을 여기서 되돌려 준다.
           */}
          <Notice
            title={isDraft ? "아직 제출하지 않은 응답입니다" : "이 응답은 지금 고칠 수 없습니다"}
            description={
              isDraft
                ? "폼에서 이어서 작성한 뒤 제출해주세요."
                : "다시 낼 수 있는 것은 운영진이 수정을 요청한 응답뿐입니다."
            }
          >
            <Link
              href={isDraft ? ROUTES.publicForm(formId) : ROUTES.myApplications}
              className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
            >
              {isDraft ? "이어서 작성하기" : "내 신청으로"}
            </Link>
          </Notice>
        </>
      )}
    </FormResponseShell>
  );
}

/** 공개 폼 계열과 같은 폭을 쓴다 — 근거는 `public-form-page`의 주석에 있다 */
function FormResponseShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-[860px] flex-col gap-[14px]">{children}</div>;
}
