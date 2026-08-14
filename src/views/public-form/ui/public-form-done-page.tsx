"use client";

import { useRouter } from "next/navigation";
import { useFormStore } from "@/entities/form";
import { ROUTES } from "@/shared/config/routes";

export function PublicFormDonePage({ formId }: { formId: number }) {
  const router = useRouter();
  const form = useFormStore((s) => s.forms.find((f) => f.formId === formId));

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-[520px] rounded-2xl bg-surface p-8 text-center shadow-[0_0_0_1px_#e5e8eb]">
        <div className="mx-auto flex size-[52px] items-center justify-center rounded-full bg-success text-[24px] text-white">
          ✓
        </div>
        <div className="mt-4 text-[22px] font-bold">제출이 완료됐어요</div>
        <div className="mt-2 text-[14.5px] leading-[1.6] text-n400">
          {form ? `${form.formTtlNm} 응답이 접수됐어요. ` : ""}결과는 등록한 연락처로
          안내드려요.
        </div>
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(ROUTES.publicForm(formId))}
            className="flex-1 cursor-pointer rounded-[14px] border border-line-strong py-3 text-[15px] text-n300 hover:border-accent hover:text-accent"
          >
            응답 다시 작성
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(form ? ROUTES.formDetail(form.formId) : ROUTES.dashboard)
            }
            className="flex-1 cursor-pointer rounded-[14px] border border-accent bg-accent py-3 text-[15px] font-semibold text-white hover:bg-accent-strong"
          >
            관리자 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}
