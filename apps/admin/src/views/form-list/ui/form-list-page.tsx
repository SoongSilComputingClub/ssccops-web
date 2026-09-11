"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FORM_RECEIPT_BADGE,
  FORM_RECEIPT_STATUSES,
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_DELETE_LOCKED,
  SYSTEM_FORM_DUPLICATE_NOTE,
  type FormReceiptStatus,
  type FormSummary,
} from "@/entities/form";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  FORM_DELETE_CAPABILITY,
  FormDeleteSheet,
  NO_FORM_DELETE,
  useDuplicateForm,
  useFormDelete,
  useFormLabelOptions,
  useFormList,
} from "@/features/form";
import { TemplateStartSheet, useFormFromTemplate } from "@/features/form-template";
import { ROUTES } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
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
const QUERY_RECEIPT_STATUS = "receiptStatus";
const QUERY_LABEL = "labelId";

/*
 * 상태 축의 파라미터 이름이 `statusCode`에서 `receiptStatus`로 바뀌었다 (ADR-0019).
 * 서버 조회 파라미터와 같은 이름이며, 그 이름은 entities/form/api/forms.ts가 함께 쥔다.
 *
 * ── 옛 링크(`?statusCode=OPEN`)는 번역하지 않고 무시한다 ─────────────────────
 *
 * 옮긴 축에는 `OPEN`에 해당하는 칩이 없다. `OPEN`은 접수 예정·접수 중·기간 종료 셋으로
 * 갈라지므로 1:1로 옮길 값이 없고, 셋 중 하나를 골라 주면 **사용자가 보내지 않은 조건을
 * 지어내는 것**이 된다. 전체로 떨어뜨리면 사용자는 칩을 눌러 좁힐 수 있지만, 잘못 좁힌
 * 목록은 있는 폼을 없다고 말하고 사용자는 그것이 필터 때문인지 알 수 없다.
 *
 * `DRAFT`·`CLOSED`만 1:1이라 그 둘만 옮기는 것도 생각할 수 있지만, 같은 파라미터가 어떤
 * 값에는 듣고 어떤 값에는 조용히 안 듣는 쪽이 전부 안 듣는 것보다 나쁘다.
 */
const QUERY_RECEIPT_STATUS_ALL = "ALL";

/**
 * 파라미터가 없을 때의 기본 필터 (#266).
 *
 * 운영자가 목록에 들어와 찾는 것은 대개 지금 응답을 받고 있는 폼이고, 초안·마감이 섞인 전체
 * 목록에서 그것을 눈으로 골라내야 했다. 그래서 **화면이 접수 중에서 시작한다.**
 *
 * 위 주석이 "잘못 좁힌 목록은 있는 폼을 없다고 말한다"고 적어 둔 것은 **옛 링크를 번역할 때의
 * 판단**이다 — 사용자가 보낸 조건을 시스템이 지어내지 않는다는 뜻이었다. 화면의 기본값은
 * 사용자가 보낸 조건이 아니라 시작점이고, 칩이 눌린 채로 보이므로 좁혀졌다는 사실이 드러난다.
 * 그 둘은 다른 자리다.
 */
const DEFAULT_RECEIPT_STATUS: FormReceiptStatus = "ACCEPTING";

/**
 * URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다.
 *
 * 파라미터가 **없는 것**과 **전체**가 이제 다른 뜻이다. 없으면 기본값(접수 중)이고, 전체는
 * `ALL`이라는 값으로 적는다 — 기본값이 좁힌 목록이라 파라미터를 지우는 것으로는 넓힐 수 없다.
 */
function parseFormReceiptStatus(value: string | null): FormReceiptStatus | null {
  if (value === null) return DEFAULT_RECEIPT_STATUS;
  if (value === QUERY_RECEIPT_STATUS_ALL) return null;
  return FORM_RECEIPT_STATUSES.includes(value as FormReceiptStatus)
    ? (value as FormReceiptStatus)
    : null;
}

function parseFormLblId(value: string | null): number | null {
  const formLblId = Number(value);
  return Number.isInteger(formLblId) && formLblId > 0 ? formLblId : null;
}

function FormCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[64px] rounded-full bg-fill" />
      <div className="mt-3 h-[22px] w-4/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-3/5 rounded bg-fill" />
      <div className="mt-4 h-[16px] w-2/5 rounded bg-fill" />
    </Card>
  );
}

function FormCard({
  form,
  duplicating,
  deleting,
  canWrite,
  canDelete,
  onDuplicate,
  onDelete,
}: {
  form: FormSummary;
  /** 이 카드의 복제가 진행 중인가 — 연타로 사본이 여러 장 생기는 것을 막는다 */
  duplicating: boolean;
  /** 이 카드의 삭제가 진행 중인가 */
  deleting: boolean;
  /** FORM_WRITE 보유 여부 — 복제·수정을 잠글지 정한다 */
  canWrite: boolean;
  /** 삭제 요구 권한 보유 여부 — 지금은 FORM_WRITE와 같은 값이지만 판단의 출처가 다르다 */
  canDelete: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  /*
   * 배지는 formSttsCd가 아니라 서버 파생값(receiptStatus)으로 그린다 — 접수 기간이 끝나도
   * 상태 코드는 OPEN으로 남기 때문에(#33) 그대로 그리면 응답을 받지 않는 폼이 '접수중'이 된다.
   */
  const badge = FORM_RECEIPT_BADGE[form.receiptStatus];

  return (
    <Card>
      {/*
        375px에서 배지 둘과 응답 수가 한 줄에 다 들어가지 않는다 — flex-wrap으로 접히게 두고
        응답 수는 min-w-0 없이 오른쪽에 붙인다(숫자라 줄바꿈될 일이 없다).
      */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {/* 라벨(둥근 Pill)과 달리 각진 배지다 — 운영 데이터가 아니라 코드가 가리키는 폼이라는 표시 */}
        {form.sysYn && (
          <Badge tone={SYSTEM_FORM_BADGE.tone} title={SYSTEM_FORM_DELETE_LOCKED}>
            {SYSTEM_FORM_BADGE.label}
          </Badge>
        )}
        <div className="flex-1" />
        {/* 서버가 집계한 값 — 제출 이상만 세고 작성 중 응답은 빠진다 */}
        <div className="text-[13.5px] text-n500">응답 {form.responseCount}</div>
      </div>
      {/* 키보드 접근(#403) */}
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
      <div className="mt-3 flex items-center gap-3 border-t border-hairline pt-3 text-[14px]">
        {/* 권한이 없으면 감추지 않고 잠근다 — 사라지면 기능이 없어진 것인지 고장인지 알 수 없다 */}
        <button
          type="button"
          disabled={duplicating || !canWrite}
          /*
           * 시스템 폼의 복제는 막지 않는다 — 사본은 코드가 가리키지 않는 일반 폼이라 잠글
           * 이유가 없다. 다만 시스템 표시가 따라가지 않는다는 것은 누르기 전에 알려 준다.
           */
          title={
            !canWrite ? NO_WRITE : form.sysYn ? SYSTEM_FORM_DUPLICATE_NOTE : undefined
          }
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
        {/*
          삭제만 danger 색이다 — 복제·수정과 같은 accent로 두면 좁은 화면에서 세 글자가 나란히
          서서 잘못 누르기 쉽다. **시스템 폼에서는 잠근다**: 서버가 409로 거절하므로(서버 #140)
          누르게 두면 확인 시트를 지나 거절만 받는다. 사유 문구는 서버 거절과 같은 문장이다.
        */}
        <button
          type="button"
          disabled={deleting || !canDelete || form.sysYn}
          title={
            !canDelete
              ? NO_FORM_DELETE
              : form.sysYn
                ? SYSTEM_FORM_DELETE_LOCKED
                : undefined
          }
          onClick={onDelete}
          className="cursor-pointer text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "지우는 중…" : "삭제"}
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
  const templateStart = useFormFromTemplate();
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  /*
   * 새 폼·복제·수정은 모두 FORM_WRITE 한 가지다 — 서버 FormController의 @RequireAuthority와 같다.
   * '템플릿에서 시작'도 같은 권한이다(서버 FormTemplateController가 클래스 레벨로 건다).
   */
  const canWrite = useCan(CAPABILITY.FORM_WRITE);
  /*
   * 삭제·복구 권한은 편집과 **따로 묻는다** (features/form/model/form-delete-copy.ts).
   * 지금은 같은 코드를 보지만 서버 계약이 확정되면 갈릴 수 있고(회의 삭제에는 MEETING_DELETE가
   * 따로 있다), 그때 고칠 자리가 화면이 아니라 그 한 파일이어야 한다.
   */
  const canDelete = useCan(FORM_DELETE_CAPABILITY);
  const deletion = useFormDelete();
  /*
   * 삭제 확인 시트가 보고 있는 폼. 열림 여부를 따로 두지 않고 **대상 자체**를 상태로 쥔다 —
   * boolean과 대상을 나눠 두면 닫는 순간 대상만 남아, 다음에 열릴 때 이전 폼의 제목·응답 수가
   * 한 프레임 그려진다(확인 시트에서 그것은 잘못된 폼을 지우게 하는 종류의 어긋남이다).
   */
  const [deleteTarget, setDeleteTarget] = useState<FormSummary | null>(null);

  const receiptStatus = parseFormReceiptStatus(searchParams.get(QUERY_RECEIPT_STATUS));
  const formLblId = parseFormLblId(searchParams.get(QUERY_LABEL));

  const { forms, status, errorMessage, reload } = useFormList({ receiptStatus, formLblId });
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

  /*
   * '템플릿에서 시작' — 복제와 다른 조작이라 버튼도 따로 둔다 (#134).
   *
   * 복제는 "이 폼과 똑같은 것 하나 더"라 원본이 있어야 하고, 템플릿은 지난 회차 폼을 지운
   * 뒤에도 남는 출발점이다. 만들어진 폼은 작성 중이고 접수 기간·라벨이 비어 있어 손볼 것이
   * 반드시 남으므로 곧장 편집 화면으로 보낸다 — 복제와 같은 이동이다.
   */
  const startFromTemplate = async (formTmplId: number, formTtlNm: string) => {
    const { formId, message } = await templateStart.create(formTmplId, formTtlNm);
    if (!message) return;

    flash(message);
    if (formId) {
      setStartSheetOpen(false);
      router.push(ROUTES.formEdit(formId));
    }
  };

  /*
   * 삭제 후에는 목록을 다시 부른다 — 지운 폼은 이 목록에서 빠져야 한다.
   *
   * **stale(이미 지워졌다·사라졌다)도 성공과 똑같이 다시 부른다.** 그 오류의 뜻이 "다른 탭에서
   * 이미 지웠다"이므로 사용자가 원한 상태와 서버의 상태는 이미 같고, 여기서 할 일은 사과가
   * 아니라 최신 목록을 보여주는 것이다(접수 상태 전이가 같은 판단을 한다).
   */
  const runDelete = async (formId: number) => {
    const { outcome, message } = await deletion.remove(formId);
    if (outcome === "busy") return;

    // 요청이 끝난 뒤에 닫는다 — 먼저 닫으면 실패했을 때 무엇을 하다 실패했는지가 사라진다
    setDeleteTarget(null);
    flash(message);
    if (outcome === "done" || outcome === "stale") reload();
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
        {/*
          '+ 새 폼'과 나란히 두지 않고 본문 첫 줄에 두는 것은 헤더 액션이 한 자리뿐이기도 하지만,
          이 조작이 폼을 곧바로 만들어 버리는 것이 아니라 **어느 템플릿에서 시작할지 먼저
          고르는** 단계이기 때문이다.
        */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            disabled={!canWrite}
            title={canWrite ? undefined : NO_WRITE}
            onClick={() => setStartSheetOpen(true)}
          >
            템플릿에서 시작
          </Button>
          <div className="text-[13px] text-n500">
            템플릿의 문항 구성을 복사해 작성 중 폼을 만듭니다
          </div>
          <div className="flex-1" />
          {/*
            **목차(사이드바)에도 있는 자리를 여기 한 번 더 둔다.** 지운 직후의 토스트가 '지운
            폼'을 가리키는데, 그 토스트가 사라진 뒤 되돌리려는 사람이 서 있는 곳이 이 화면이다 —
            목차를 훑어 찾게 하는 것과 바로 옆에서 누르게 하는 것은 되살릴 수 있다는 사실의
            무게가 다르다. 권한으로 감추지 않는 것은 조회가 목록과 같은 FORM_READ라서다.
          */}
          <Button variant="ghost" onClick={() => router.push(ROUTES.formsDeleted)}>
            지운 폼
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          {/* 전체는 파라미터를 지우는 것이 아니라 값을 넣는다 — 지우면 기본값(접수 중)이다 */}
          <Chip
            active={receiptStatus === null}
            onClick={() => applyFilter(QUERY_RECEIPT_STATUS, QUERY_RECEIPT_STATUS_ALL)}
          >
            {ALL}
          </Chip>
          {/*
            **필터와 배지가 같은 축을 본다** (ADR-0019). 예전에는 필터만 폼 상태 코드
            (form_stts_cd)를 골라서, 기간이 끝난 폼이 '기간 종료' 배지를 달고도 상태는
            아직 OPEN이라 '접수 중' 탭에 남았다.

            문구도 배지에서 그대로 꺼내 쓴다 — 배지가 '기간 종료'인데 칩이 '종료됨'이면
            사용자는 그 둘을 같은 것으로 읽지 못한다. 여기서 새 문구를 짓지 않는다.
          */}
          {FORM_RECEIPT_STATUSES.map((rs) => (
            <Chip
              key={rs}
              active={receiptStatus === rs}
              onClick={() => applyFilter(QUERY_RECEIPT_STATUS, rs)}
            >
              {FORM_RECEIPT_BADGE[rs].label}
            </Chip>
          ))}
          {/*
            상태 축과 라벨 축을 가르는 칸막이. 좁은 화면에서는 칩이 여러 줄로 접히는데,
            세로 1px 막대는 접힌 줄 어딘가에 끼어 두 축의 경계로 읽히지 않는다 —
            w-full로 한 줄을 통째로 차지하게 해 가로선으로 만들면 그 아래부터 라벨
            필터라는 것이 드러난다(flex-wrap에서 100% 항목은 반드시 혼자 한 줄을 쓴다).
          */}
          <div className="mx-0 h-px w-full bg-line lg:mx-2 lg:h-5 lg:w-px" />
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
                receiptStatus || formLblId
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
                  deleting={deletion.pendingFormId === f.formId}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  onDuplicate={() => void runDuplicate(f.formId)}
                  onDelete={() => setDeleteTarget(f)}
                />
              ))}
            </div>
          ))}
      </PageBody>

      {/*
        확인 시트는 대상이 있을 때만 마운트한다 — `open` prop만 끄면 닫힌 시트가 이전 폼의
        제목과 응답 수를 계속 들고 있게 되고, 그 값이 다음 삭제에서 한 프레임 새어 나온다.
      */}
      {deleteTarget && (
        <FormDeleteSheet
          open
          formTtlNm={deleteTarget.formTtlNm}
          responseCount={deleteTarget.responseCount}
          rcptEndDt={deleteTarget.rcptEndDt}
          pending={deletion.pending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void runDelete(deleteTarget.formId)}
        />
      )}

      {/* 선택지에는 켜진 템플릿만 실린다 — 거르는 것은 서버다 (features/form-template) */}
      <TemplateStartSheet
        open={startSheetOpen}
        pending={templateStart.pending}
        onClose={() => setStartSheetOpen(false)}
        onStart={(formTmplId, formTtlNm) =>
          void startFromTemplate(formTmplId, formTtlNm)
        }
      />
    </>
  );
}
