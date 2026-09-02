"use client";

import { useRouter } from "next/navigation";
import { usePublicForm } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import { PublicFormNotice } from "./public-form-notice";

/*
 * 제출 완료 화면 (/f/{formId}/done).
 *
 * 폼 제목·제출 일시는 **서버가 준 값**으로 그린다. 예전에는 운영자용 목 스토어에서 폼을 찾아
 * 제목을 붙였는데, 응답자는 그 목록에 접근할 수 없어 실제로는 언제나 빈 문구였다.
 *
 * 조회에 실패하거나 접수가 이미 끝나(409) 폼을 못 받아도 화면은 그대로 뜬다 — 제출은 이미
 * 끝난 사실이고, 제목 한 줄을 못 붙였다고 "제출됐다"는 말까지 못 하게 되면 안 된다.
 *
 * **'관리자 화면으로' 버튼은 두지 않는다.** 응답자를 운영 화면으로 보낼 이유가 없다.
 *
 * '하나 더 작성'은 **다중 응답 폼에서만** 선다 (ssccops-server #143). 1건 폼에서는 재제출을
 * 서버가 409로 막으므로 누를 수 있는 버튼을 두면 거절만 받게 되지만, 여러 건을 받는 폼에서는
 * 또 내는 것이 정상이라 제출 직후가 다음 건을 시작하기 가장 자연스러운 자리다.
 */
export function PublicFormDonePage({ formId }: { formId: number }) {
  const router = useRouter();
  /*
   * 제출 여부·제목·제출 일시가 한 응답(GET .../public)에 함께 오므로 작성 화면과 같은 훅을
   * 쓴다. 1건 폼은 제출을 마치면 status가 already-submitted라 자동 저장 경로가 아예 돌지 않고,
   * 다중 응답 폼은 ready로 오지만 이 화면에는 답이 하나도 없어 보낼 것이 없다(불러온 그대로와
   * 같은 본문이라 dirty가 서지 않는다) — 어느 쪽도 완료 화면에서 PUT이 나가지 않는다.
   */
  const { status, form } = usePublicForm(formId);

  if (status === "loading") {
    return <PublicFormNotice icon="✓" tone="success" title="제출이 완료됐어요" />;
  }

  return (
    <PublicFormNotice
      icon="✓"
      tone="success"
      title="제출이 완료됐어요"
      description={
        <>
          {form?.formTtlNm ? `${form.formTtlNm} 응답이 접수됐어요. ` : ""}
          {form?.submittedAt ? `제출 일시 ${formatDt(form.submittedAt)}. ` : ""}
          결과는 등록한 연락처로 안내드려요.
          {form?.mltplRspnsYn && (
            <> 이 폼은 여러 건을 받으므로 필요하면 하나 더 낼 수 있습니다.</>
          )}
        </>
      }
      action={
        form?.mltplRspnsYn
          ? {
              label: "응답 하나 더 작성",
              onClick: () => router.push(ROUTES.publicForm(formId)),
            }
          : undefined
      }
    />
  );
}
