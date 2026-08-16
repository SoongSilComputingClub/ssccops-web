"use client";

import { usePublicForm } from "@/features/form";
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
 * **'응답 다시 작성'·'관리자 화면으로' 버튼은 지웠다.** 한 회원은 한 폼에 1건이라 재제출은
 * 서버가 409로 막고(재제출 규칙은 이번 범위 밖이다), 응답자를 운영 화면으로 보낼 이유는 없다.
 */
export function PublicFormDonePage({ formId }: { formId: number }) {
  /*
   * 제출 여부·제목·제출 일시가 한 응답(GET .../public)에 함께 오므로 작성 화면과 같은 훅을
   * 쓴다. 제출을 마친 폼은 status가 already-submitted라 자동 저장 경로는 아예 돌지 않는다.
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
        </>
      }
    />
  );
}
