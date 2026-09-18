import Link from "next/link";
import { formatDt } from "@ssccops/date";
import { fetchOpenForms, type PublicOpenForm } from "@/entities/content";
import { ROUTES } from "@/shared/config/routes";

/**
 * 접수 중인 폼 목록 — 지원 안내(`/join`) 본문 아래 (#520 · ssccops#382).
 *
 * `GET /public/v1/forms/open`은 제목·마감·폼 키만 준다(ADR-0038 — 응답·문항은 없다). 카드는
 * 공개 폼 화면(`/f/{formKey}`)으로 가고, 답을 내는 것은 그쪽에서 로그인 뒤 한다.
 *
 * 조회에 실패하거나 접수 중인 폼이 없으면 **블록을 통째로 비운다** — 지원 안내 본문이 이
 * 화면의 본체이고, 폼 목록이 없다는 것을 안내 문단으로 만들 이유가 없다(모집 기간이 아니면
 * 없는 것이 정상이다).
 */
export async function OpenForms() {
  let forms: PublicOpenForm[];
  try {
    forms = await fetchOpenForms();
  } catch {
    return null;
  }
  if (forms.length === 0) return null;

  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[17px] font-semibold">접수 중</h2>
      <div className="grid grid-cols-1 gap-[10px] lg:grid-cols-2">
        {forms.map((form) => {
          const end = formatDt(form.rcptEndDt);
          return (
            <Link
              key={form.formKey}
              href={ROUTES.publicForm(form.formKey)}
              className="flex flex-col gap-[4px] rounded-2xl bg-surface p-[16px] shadow-[0_0_0_1px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--color-accent-strong)]"
            >
              <div className="text-[16px] font-semibold leading-[1.35]">{form.formTtlNm}</div>
              {end && <div className="text-[13.5px] text-n500">{end}까지</div>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
