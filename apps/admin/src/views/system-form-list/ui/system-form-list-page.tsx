"use client";

import { useRouter } from "next/navigation";
import {
  FORM_RECEIPT_BADGE,
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_OPEN_PARTS,
  type FormSummary,
} from "@/entities/form";
import { useFormList } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Card, EmptyState, PageBody, PageHeader, Pill } from "@/shared/ui";

/*
 * 시스템 폼 (#553 · 상위 ssccops#415).
 *
 * ── 왜 이 화면이 있는가 ────────────────────────────────────────
 * 시스템 폼(`sysYn`)은 코드가 가리키는 폼이다 — 지금은 기획안(`PROPOSAL`) 하나이고 응답은 LMS의
 * 기획안 제출 화면에서 받는다. 폼 목록에 섞여 있으면 복제·삭제·공개 링크 같은 **일반 폼의 동작이
 * 그 위에 그대로 놓이고**, 실제로 운영진 한 명이 상세의 공개 링크로 www 공개 폼에서 기획안에
 * 응답했다(ssccops#415). 데이터는 같은 `form_id`에 쌓여 문제 없지만 진입점이 틀린 것이다.
 * 그래서 폼 목록은 시스템 폼을 빼고, 이 화면이 그것만 싼다.
 *
 * ── 왜 폼 목록의 칩이 아니라 별도 화면인가 ─────────────────────
 * 지운 폼과 같은 근거다(shared/config/routes.ts의 `formsDeleted` 주석) — 접수 상태·라벨은 같은
 * 무리를 좁히는 축이고 시스템 폼은 다른 모집단이며, 카드가 할 수 있는 일이 다르다. 여기 카드에는
 * **복제·삭제 버튼이 없다** — 삭제는 서버가 409로 거절하고(서버 #140), 복제는 «시스템 표시가
 * 따라가지 않는» 일반 폼 사본이라 이 화면에서 뜻이 없다. 수정·접수 상태 전이는 상세에서 한다.
 *
 * ── 왜 전량 목록을 화면에서 가르는가 ─────────────────────────
 * 서버 필터 파라미터를 더하지 않았다(ssccops#415 본문 — 시스템 폼이 한 자릿수라 필터가 줄 것이
 * 없고, 하위 호환 게이트에 새 파라미터를 얹을 이유가 없다). `GET /v1/forms`를 **필터 없이** 부른다
 * — 폼 목록이 «전체» 칩에서 하는 것과 같은 호출이고, 그래야 작성 중(DRAFT)인 시스템 폼도 보인다.
 * 서버가 준 것 중 `sysYn`만 남긴다.
 *
 * 필터도 URL 쿼리도 없다 — 좁힐 것이 없다. 그래서 `Suspense` 경계도 필요 없다(지운 폼과 같다).
 */

function SystemFormCard({ form }: Readonly<{ form: FormSummary }>) {
  const router = useRouter();
  /*
   * 배지는 formSttsCd가 아니라 서버 파생값(receiptStatus)으로 그린다 — 폼 목록과 같은 이유(#33).
   * 시스템 폼도 접수 상태는 운영진이 만지는 값이라 여기서도 보여야 한다.
   */
  const badge = FORM_RECEIPT_BADGE[form.receiptStatus];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {/* 이 화면의 카드는 전부 시스템 폼이지만 배지는 그대로 둔다 — 상세·폼 목록과 같은 표시라서다 */}
        <Badge tone={SYSTEM_FORM_BADGE.tone}>{SYSTEM_FORM_BADGE.label}</Badge>
        <div className="flex-1" />
        {/* 서버가 집계한 값 — 제출 이상만 세고 작성 중 응답은 빠진다 */}
        <div className="text-[13.5px] text-n500">응답 {form.responseCount}</div>
      </div>
      {/* 키보드 접근(#403) — 폼 목록 카드와 같은 모양 */}
      <button
        type="button"
        onClick={() => router.push(ROUTES.formDetail(form.formId))}
        className="mt-2 block w-full cursor-pointer text-left text-[18px] leading-[1.35] font-semibold hover:text-accent"
      >
        {form.formTtlNm}
      </button>
      <div className="mt-1 text-[13.5px] text-n500">
        {form.rcptBgngDt
          ? `${formatDt(form.rcptBgngDt)} ~ ${formatDt(form.rcptEndDt)}`
          : "접수 기간 미설정"}
      </div>
      {form.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-[6px]">
          {form.labels.map((l) => (
            <Pill key={l.formLblId} tone="blue">
              {l.lblNm}
            </Pill>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-hairline pt-3 text-[14px]">
        {/* 복제·삭제는 없다 — 근거는 이 파일의 머리말. 상세로 가는 길 하나만 둔다 */}
        <button
          type="button"
          onClick={() => router.push(ROUTES.formDetail(form.formId))}
          className="cursor-pointer text-accent"
        >
          상세
        </button>
        <div className="ml-auto text-[13px] text-n500">수정 {formatYmd(form.mdfcnDt)}</div>
      </div>
    </Card>
  );
}

export function SystemFormListPage() {
  const router = useRouter();
  // 필터 없음 = 전량(모든 접수 상태) — 파라미터를 비워 서버가 전체 경로로 간다(폼 목록의 «전체»와 같다)
  const { forms, status, errorMessage, reload } = useFormList();

  // 판정은 서버가 주는 `sysYn`이고 라벨·제목이 아니다(ssccops#415)
  const systemForms = forms.filter((f) => f.sysYn);

  return (
    <>
      <PageHeader
        title="시스템 폼"
        subtitle="응답을 LMS에서 받는 폼"
        action={{ label: "폼 목록", onClick: () => router.push(ROUTES.forms) }}
      />
      <PageBody>
        {/*
          이 화면에서 할 수 있는 일과 없는 일을 한 상자에 적는다 — 상세의 시스템 폼 안내와 같은
          문장(`SYSTEM_FORM_OPEN_PARTS`)이다. 공개 링크가 없다는 것도 여기서 먼저 말한다.
        */}
        <div className="mb-4 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          시스템 폼은 코드가 가리키는 폼이라 폼 목록에서 빠져 있고, 공개 링크가 없습니다. 응답은
          LMS에서 받습니다. {SYSTEM_FORM_OPEN_PARTS}.
        </div>

        {status === "loading" && <EmptyState message="불러오는 중…" />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "시스템 폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (systemForms.length === 0 ? (
            <EmptyState message="시스템 폼이 없습니다." />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {systemForms.map((f) => (
                <SystemFormCard key={f.formId} form={f} />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
