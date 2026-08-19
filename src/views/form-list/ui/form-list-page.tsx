"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FORM_RECEIPT_BADGE, type FormSummary } from "@/entities/form";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useDuplicateForm, useFormLabelOptions, useFormList } from "@/features/form";
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

/** 잠긴 버튼에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_WRITE = "폼을 만들거나 고칠 권한이 없습니다";

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
  duplicating,
  canWrite,
  onDuplicate,
}: {
  form: FormSummary;
  /** 이 카드의 복제가 진행 중인가 — 연타로 사본이 여러 장 생기는 것을 막는다 */
  duplicating: boolean;
  /** FORM_WRITE 보유 여부 — 복제·수정을 잠글지 정한다 */
  canWrite: boolean;
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
        {/* 권한이 없으면 감추지 않고 잠근다 — 사라지면 기능이 없어진 것인지 고장인지 알 수 없다 */}
        <button
          type="button"
          disabled={duplicating || !canWrite}
          title={canWrite ? undefined : NO_WRITE}
          onClick={onDuplicate}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {duplicating ? "복제하는 중…" : "복제"}
        </button>
        <button
          type="button"
          disabled={!canWrite}
          title={canWrite ? undefined : NO_WRITE}
          onClick={() => router.push(ROUTES.formEdit(form.formId))}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
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
  const duplication = useDuplicateForm();
  /* 새 폼·복제·수정은 모두 FORM_WRITE 한 가지다 — 서버 FormController의 @RequireAuthority와 같다 */
  const canWrite = useCan(CAPABILITY.FORM_WRITE);

  const formSttsCd = parseFormSttsCd(searchParams.get(QUERY_STATUS));
  const formLblId = parseFormLblId(searchParams.get(QUERY_LABEL));

  const { forms, status, errorMessage, reload } = useFormList({ formSttsCd, formLblId });
  const { labels } = useFormLabelOptions();

  /*
   * 복제 후에는 목록을 다시 부르지 않고 **사본의 편집 화면으로 이동**한다.
   *
   * 사본은 DRAFT이고 라벨도 접수 기간도 승계하지 않으므로(서버 #32) 복제 직후 손볼 것이 반드시
   * 남는다. 목록에 남아 사본을 눈으로 찾게 하는 것보다, 바로 고칠 수 있는 자리로 보내는 편이
   * 복제를 누른 의도에 가깝다. 편집 화면은 진입 시 상세를 다시 조회하므로 갱신도 함께 끝난다.
   */
  const runDuplicate = async (formId: number) => {
    const { formId: copyFormId, message } = await duplication.duplicate(formId);
    if (!message) return;

    flash(message);
    if (copyFormId) router.push(ROUTES.formEdit(copyFormId));
  };

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
        action={{
          label: "+ 새 폼",
          onClick: () => router.push(ROUTES.formNew),
          disabled: !canWrite,
          title: canWrite ? undefined : NO_WRITE,
        }}
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
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
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
              /*
               * 빈 화면의 유도 버튼만은 감춘다. 여기서는 잠긴 버튼이 "여기를 누르세요"라고
               * 권하면서 동시에 누르지 못하게 하는 모순이 되고, 사유는 이미 헤더의 잠긴
               * '+ 새 폼'이 툴팁으로 말해 준다 — 같은 화면에서 두 번 말할 필요가 없다.
               */
              action={
                canWrite
                  ? { label: "+ 새 폼", onClick: () => router.push(ROUTES.formNew) }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {forms.map((f) => (
                <FormCard
                  key={f.formId}
                  form={f}
                  duplicating={duplication.pendingFormId === f.formId}
                  canWrite={canWrite}
                  onDuplicate={() => void runDuplicate(f.formId)}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
