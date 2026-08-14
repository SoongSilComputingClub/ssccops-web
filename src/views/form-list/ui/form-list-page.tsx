"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FORM_RECEIPT_BADGE, useFormStore, type FormSummary } from "@/entities/form";
import { useFormLabelOptions, useFormList } from "@/features/form";
import { FORM_STTS_CDS, FORM_STTS_NM, type FormSttsCd } from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  flash,
} from "@/shared/ui";

const ALL = "전체";

/*
 * 필터 상태를 컴포넌트 state가 아니라 URL 쿼리스트링에 둔다.
 *
 * 새로고침·뒤로가기로 필터가 풀리지 않고, 링크를 그대로 공유할 수 있다("접수 중인 신규모집
 * 폼 좀 봐줘"). state로 들고 있으면 목록에서 상세로 들어갔다 돌아올 때마다 전체로 리셋된다.
 * 값의 이름을 서버 쿼리 파라미터와 똑같이 맞춘 것도 의도한 것이다 — URL과 요청이 1:1이면
 * 어떤 조회가 나갔는지 주소창만 보고 알 수 있다.
 */
const QUERY_STATUS = "statusCode";
const QUERY_LABEL = "labelId";

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseFormSttsCd(value: string | null): FormSttsCd | null {
  return value && FORM_STTS_CDS.includes(value as FormSttsCd)
    ? (value as FormSttsCd)
    : null;
}

function parseFormLblId(value: string | null): number | null {
  const formLblId = Number(value);
  return Number.isInteger(formLblId) && formLblId > 0 ? formLblId : null;
}

function FormCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[64px] rounded-full bg-black/5" />
      <div className="mt-3 h-[22px] w-4/5 rounded bg-black/5" />
      <div className="mt-2 h-[16px] w-3/5 rounded bg-black/5" />
      <div className="mt-4 h-[16px] w-2/5 rounded bg-black/5" />
    </Card>
  );
}

function FormCard({
  form,
  onDuplicate,
}: {
  form: FormSummary;
  onDuplicate: () => void;
}) {
  const router = useRouter();
  /*
   * 배지는 formSttsCd가 아니라 서버 파생값(receiptStatus)으로 그린다 — 접수 기간이 끝나도
   * 상태 코드는 OPEN으로 남기 때문에(#33) 그대로 그리면 응답을 받지 않는 폼이 '접수중'이 된다.
   */
  const badge = FORM_RECEIPT_BADGE[form.receiptStatus];

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <div className="flex-1" />
        {/* 서버가 집계한 값 — 제출 이상만 세고 작성 중 응답은 빠진다 */}
        <div className="text-[13.5px] text-n500">응답 {form.responseCount}</div>
      </div>
      <div
        onClick={() => router.push(ROUTES.formDetail(form.formId))}
        className="mt-2 cursor-pointer text-[18px] leading-[1.35] font-semibold hover:text-accent"
      >
        {form.formTtlNm}
      </div>
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
      <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-3 text-[14px]">
        <button type="button" onClick={onDuplicate} className="cursor-pointer text-accent">
          복제
        </button>
        <button
          type="button"
          onClick={() => router.push(ROUTES.formEdit(form.formId))}
          className="cursor-pointer text-accent"
        >
          수정
        </button>
        <div className="flex-1" />
        <div className="text-[13px] text-n500">수정 {formatYmd(form.mdfcnDt)}</div>
      </div>
    </Card>
  );
}

export function FormListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /*
   * 복제는 아직 목 스토어다 — 서버 복제 API 연동은 #9의 몫이라 여기서 건드리지 않는다.
   * (목록은 서버에서 오므로 복제한 사본이 즉시 보이지는 않는다.)
   */
  const duplicateForm = useFormStore((s) => s.duplicateForm);

  const formSttsCd = parseFormSttsCd(searchParams.get(QUERY_STATUS));
  const formLblId = parseFormLblId(searchParams.get(QUERY_LABEL));

  const { forms, status, errorMessage, reload } = useFormList({ formSttsCd, formLblId });
  const { labels } = useFormLabelOptions();

  /** 누른 축만 바꾸고 나머지 필터는 URL에 남겨 둔다 (상태·라벨은 AND로 함께 걸린다) */
  const applyFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);

    const qs = params.toString();
    // push라서 뒤로가기로 직전 필터가 되살아난다. scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게
    router.push(qs ? `${ROUTES.forms}?${qs}` : ROUTES.forms, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="폼 관리"
        subtitle="라벨 중심 분류"
        action={{ label: "+ 새 폼", onClick: () => router.push(ROUTES.formNew) }}
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          <Chip
            active={formSttsCd === null}
            onClick={() => applyFilter(QUERY_STATUS, null)}
          >
            {ALL}
          </Chip>
          {/*
            필터는 배지와 달리 **폼 상태 코드 자체**를 고르는 자리다 — 서버 쿼리(statusCode)가
            form_stts_cd로 거르므로 파생값(receiptStatus)이 아니라 기준 코드명을 그대로 쓴다.
          */}
          {FORM_STTS_CDS.map((cd) => (
            <Chip
              key={cd}
              active={formSttsCd === cd}
              onClick={() => applyFilter(QUERY_STATUS, cd)}
            >
              {FORM_STTS_NM[cd]}
            </Chip>
          ))}
          <div className="mx-2 h-5 w-px bg-line" />
          <Chip
            active={formLblId === null}
            onClick={() => applyFilter(QUERY_LABEL, null)}
          >
            {ALL}
          </Chip>
          {/* 후보는 활성 라벨만 — 비활성 라벨은 새로 거를 수 없다 (서버가 useYn=true로 걸러 준다) */}
          {labels.map((l) => (
            <Chip
              key={l.formLblId}
              active={formLblId === l.formLblId}
              onClick={() => applyFilter(QUERY_LABEL, String(l.formLblId))}
            >
              {l.lblNm}
            </Chip>
          ))}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-2 gap-[14px]">
            {[0, 1, 2, 3].map((i) => (
              <FormCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "폼 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (forms.length === 0 ? (
            <EmptyState
              message={
                formSttsCd || formLblId
                  ? "조건에 맞는 폼이 없습니다."
                  : "등록된 폼이 없습니다."
              }
              action={{ label: "+ 새 폼", onClick: () => router.push(ROUTES.formNew) }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-[14px]">
              {forms.map((f) => (
                <FormCard
                  key={f.formId}
                  form={f}
                  onDuplicate={() => {
                    duplicateForm(f.formId);
                    flash("DRAFT 폼으로 복제했습니다");
                  }}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
