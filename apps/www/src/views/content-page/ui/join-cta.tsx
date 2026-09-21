import Link from "next/link";
import { fetchRecruitFormMeta } from "@/entities/form";
import { ROUTES } from "@/shared/config/routes";
import { formatMonthDay } from "@/shared/lib/date";
import { Card } from "@/shared/ui";

/**
 * 모집 페이지(`/join`) 아래 «지원하기» (#588 · ssccops#436 · ADR-0044 · 서버 #520).
 *
 * 어드민에서 «신입회원 모집 폼으로 지정»한 폼의 익명 메타(`/public/v1/forms/system/RECRUIT/meta`)로
 * 그린다 — 접수 중이면 «지원하기» 버튼(→ `/f/{formKey}` · 지원자는 지금처럼 구글 로그인 → 가입 →
 * 지원서), 접수 예정이면 «n월 n일부터 접수합니다» 한 줄. 그 밖(마감·기간 종료)이거나 지정된 폼이
 * 없으면(404) 블록 자체가 없다 — 본문(홍보국이 쓰는 페이지 `join`)만 남는다.
 *
 * ── #529와의 관계 ──────────────────────────────────────────────
 * 그때 뺀 `OpenForms`는 `/public/v1/forms/open`이 신입 모집 폼과 QA·행사 폼을 구별하지 못해 접수
 * 중인 폼이 전부 떴다. 이 블록은 «모집 페이지가 가리키는 폼 하나»만 답하는 경로라 그 문제가 없고,
 * 홈(`/`)에는 여전히 폼을 세우지 않는다(#530 · www AGENTS «홈은 세션을 보지 않는다» — 모집 안내는
 * 배너의 자리).
 *
 * ── 서버 컴포넌트 ──────────────────────────────────────────────
 * 세션을 보지 않고 익명 조회 하나뿐이라 `/join`의 5분 `Cache-Control`(next.config.ts) 안에 그대로
 * 들어간다. 접수 중 판정은 서버 파생값(`receiptStatus`)이고 웹이 기간으로 다시 계산하지 않는다 —
 * 캐시 5분 사이에 마감이 지나면 그동안 «지원하기»가 남는데, `/f/{formKey}`가 접수 종료를 다시
 * 판정해 막으므로(서버 409 `FORM_NOT_ACCEPTING`) 죽은 링크는 아니다.
 */
export async function JoinCta() {
  const meta = await fetchRecruitFormMeta();
  if (!meta) return null;

  if (meta.receiptStatus === "ACCEPTING") {
    // 마감일이 없는 폼(기한 없음)은 «까지»를 말하지 않는다 — 없는 값을 지어내지 않는다
    const until = formatMonthDay(meta.rcptEndDt);
    return (
      <Card className="flex flex-col gap-[12px] px-[18px] py-[18px] lg:px-[26px] lg:py-[22px]">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-.2px]">지원하기</h2>
          <p className="mt-[4px] text-[14.5px] text-n400">
            {meta.formTtlNm ? `${meta.formTtlNm} 접수 중입니다.` : "지금 접수 중입니다."}{" "}
            구글 계정으로 로그인한 뒤 지원서를 씁니다.{until ? ` ${until}까지 받습니다.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[8px]">
          <Link
            href={ROUTES.publicForm(meta.formKey)}
            className="rounded-xl bg-accent px-[18px] py-[11px] text-[15px] font-semibold text-on-solid transition-colors hover:bg-accent-strong"
          >
            지원하기
          </Link>
        </div>
      </Card>
    );
  }

  if (meta.receiptStatus === "SCHEDULED") {
    const from = formatMonthDay(meta.rcptBgngDt);
    // 시작일이 없는 접수 예정은 서버 파생 규칙상 없지만, 값이 비면 반쪽 문장 대신 아무것도 그리지 않는다
    if (!from) return null;
    return (
      <Card className="px-[18px] py-[18px] lg:px-[26px] lg:py-[22px]">
        <h2 className="text-[19px] font-semibold tracking-[-.2px]">지원하기</h2>
        <p className="mt-[4px] text-[14.5px] text-n400">{from}부터 접수합니다.</p>
      </Card>
    );
  }

  // 마감(CLOSED)·기간 종료(EXPIRED)·작성 중(DRAFT — 서버가 404라 여기 오지 않는다)은 블록이 없다
  return null;
}
