"use client";

import { useRouter } from "next/navigation";
import {
  FORM_RECEIPT_BADGE,
  RECRUIT_NOT_DESIGNATED,
  RECRUIT_SYS_FORM_CD,
  SYSTEM_FORM_OPEN_PARTS,
  SYSTEM_FORM_SLOTS,
  systemFormBadge,
  type FormSummary,
} from "@/entities/form";
import { useFormList } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Card, EmptyState, PageBody, PageHeader, Pill, SectionLabel } from "@/shared/ui";

/*
 * 시스템 폼 (#553 · 상위 ssccops#415 → #588 · ssccops#436 · ADR-0044).
 *
 * ── 왜 이 화면이 있는가 ────────────────────────────────────────
 * 시스템 폼(`sysYn`)은 코드가 **가리키는** 폼이다 — 기획안(`PROPOSAL`)과 신입회원 모집(`RECRUIT`)
 * 둘. 폼 목록에 섞여 있으면 복제·삭제·공개 링크 같은 **일반 폼의 동작이 그 위에 그대로 놓이고**,
 * 실제로 운영진 한 명이 상세의 공개 링크로 www 공개 폼에서 기획안에 응답했다(ssccops#415). 그래서
 * 폼 목록은 시스템 폼을 빼고, 이 화면이 그것만 싼다.
 *
 * ── 왜 «고정 두 줄»인가 (#588) ──────────────────────────────────
 * #553에서는 `sysYn`인 것을 그냥 나열했다. 모집 폼이 «지정»이 되면서 **없는 상태**가 생겼다 —
 * 학기 초에 운영진이 지정을 잊으면 홍보 사이트 모집 페이지에 «지원하기»가 없는데, 나열 방식으로는
 * 그 줄이 그냥 비어 아무도 모른다(ADR-0044 «나쁜 것»: 이 화면이 그 사실을 보여야 한다). 그래서
 * 코드마다 자리를 먼저 세우고(`SYSTEM_FORM_SLOTS`) 그 자리에 폼이 있으면 카드, 없으면 다음 행동
 * («폼 상세에서 지정»)을 적는다. 표에 없는 코드가 서버에서 오면 «그 밖» 절에 남긴다 — 숨기면
 * 코드가 가리키는 폼이 화면 어디에도 없게 된다.
 *
 * ── 왜 폼 목록의 칩이 아니라 별도 화면인가 ─────────────────────
 * 지운 폼과 같은 근거다(shared/config/routes.ts의 `formsDeleted` 주석) — 접수 상태·라벨은 같은
 * 무리를 좁히는 축이고 시스템 폼은 다른 모집단이며, 카드가 할 수 있는 일이 다르다. 여기 카드에는
 * **복제·삭제 버튼이 없다** — 삭제는 서버가 409로 거절하고(서버 #140), 복제는 «시스템 표시가
 * 따라가지 않는» 일반 폼 사본이라 이 화면에서 뜻이 없다. 수정·접수 상태 전이·지정은 상세에서 한다.
 *
 * ── 왜 전량 목록을 화면에서 가르는가 ─────────────────────────
 * 서버 필터 파라미터를 더하지 않았다(ssccops#415 본문 — 시스템 폼이 한 자릿수라 필터가 줄 것이
 * 없고, 하위 호환 게이트에 새 파라미터를 얹을 이유가 없다). `GET /v1/forms`를 **필터 없이** 부른다
 * — 그래야 작성 중(DRAFT)인 시스템 폼도 보인다. 서버가 준 것 중 `sysYn`만 남긴다.
 */

function SystemFormCard({ form }: Readonly<{ form: FormSummary }>) {
  const router = useRouter();
  /*
   * 배지는 formSttsCd가 아니라 서버 파생값(receiptStatus)으로 그린다 — 폼 목록과 같은 이유(#33).
   * 시스템 폼도 접수 상태는 운영진이 만지는 값이라 여기서도 보여야 한다.
   */
  const badge = FORM_RECEIPT_BADGE[form.receiptStatus];
  const sysBadge = systemFormBadge(form.sysFormCd);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {/* 줄 제목이 이미 코드를 말하지만 배지는 그대로 둔다 — 상세·폼 목록과 같은 표시라서다 */}
        <Badge tone={sysBadge.tone}>{sysBadge.label}</Badge>
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

/**
 * 자리가 비었을 때의 한 줄.
 *
 * 모집은 운영진이 채우는 자리라 다음 행동을 적고, 기획안은 시드가 세우는 것이라 운영진이 할 일이
 * 없다 — «없습니다»만 말한다(배포 문제라 화면이 고치라고 할 상대가 없다).
 */
function emptySlotMessage(sysFormCd: string): string {
  return sysFormCd === RECRUIT_SYS_FORM_CD ? RECRUIT_NOT_DESIGNATED : "기획안 폼이 없습니다.";
}

export function SystemFormListPage() {
  const router = useRouter();
  // 필터 없음 = 전량(모든 접수 상태) — 파라미터를 비워 서버가 전체 경로로 간다(폼 목록의 «전체»와 같다)
  const { forms, status, errorMessage, reload } = useFormList();

  // 판정은 서버가 주는 `sysYn`이고 라벨·제목이 아니다(ssccops#415)
  const systemForms = forms.filter((f) => f.sysYn);
  const knownCodes = new Set(SYSTEM_FORM_SLOTS.map((slot) => slot.sysFormCd));
  // 한 코드가 가리키는 폼은 환경당 하나다(서버 UNIQUE) — 여러 건을 가정한 규칙을 웹에 두지 않는다
  const formOf = (sysFormCd: string) => systemForms.find((f) => f.sysFormCd === sysFormCd) ?? null;
  const others = systemForms.filter((f) => f.sysFormCd === null || !knownCodes.has(f.sysFormCd));

  return (
    <>
      <PageHeader
        title="시스템 폼"
        subtitle="코드가 가리키는 폼 — 기획안과 신입회원 모집"
        action={{ label: "폼 목록", onClick: () => router.push(ROUTES.forms) }}
      />
      <PageBody>
        {/*
          두 폼이 어떻게 다른지 한 상자에 적는다 — 하나는 코드가 답을 읽어 문항이 잠기고(LMS), 하나는
          가리키기만 해 문항이 자유롭다(홍보 사이트). 열린 것은 상세와 같은 문장(`SYSTEM_FORM_OPEN_PARTS`).
        */}
        <div className="mb-4 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          시스템 폼은 코드가 가리키는 폼이라 폼 목록에서 빠져 있습니다. 기획안은 답을 코드가 읽어
          문항이 잠기고 응답은 LMS에서 받습니다. 신입회원 모집 폼은 학기마다 폼 상세에서 지정하며
          문항은 자유롭고 응답은 홍보 사이트 모집 페이지에서 받습니다. {SYSTEM_FORM_OPEN_PARTS}.
        </div>

        {status === "loading" && <EmptyState message="불러오는 중…" />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "시스템 폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <div className="flex flex-col gap-6">
            {SYSTEM_FORM_SLOTS.map((slot) => {
              const form = formOf(slot.sysFormCd);
              return (
                <section key={slot.sysFormCd}>
                  <SectionLabel>{slot.label}</SectionLabel>
                  <div className="mt-1 mb-3 text-[13px] leading-[1.6] text-n500">{slot.description}</div>
                  {form ? (
                    <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                      <SystemFormCard form={form} />
                    </div>
                  ) : (
                    <EmptyState message={emptySlotMessage(slot.sysFormCd)} />
                  )}
                </section>
              );
            })}

            {/* 표에 없는 코드 — 숨기지 않는다(코드가 가리키는 폼이 화면 어디에도 없게 된다) */}
            {others.length > 0 && (
              <section>
                <SectionLabel className="mb-3">그 밖의 시스템 폼</SectionLabel>
                <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                  {others.map((f) => (
                    <SystemFormCard key={f.formId} form={f} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
