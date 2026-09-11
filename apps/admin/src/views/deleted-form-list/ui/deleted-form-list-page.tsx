"use client";

import { useRouter } from "next/navigation";
import {
  DELETED_FORM_BADGE,
  FORM_RESTORE_NOTE,
  type FormSummary,
} from "@/entities/form";
import { useCan } from "@/features/auth";
import {
  FORM_DELETE_CAPABILITY,
  NO_FORM_DELETE,
  useFormDelete,
  useFormList,
} from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Pill,
  flash,
} from "@/shared/ui";

/*
 * 지운 폼 (ssccops-web#359 · 상위 ssccops#261).
 *
 * ── 왜 이 화면이 있는가 ────────────────────────────────────────
 * "응답이 들어온 폼도 지운다"는 결정(ssccops#261 결정 코멘트)의 대가는 **신청자의 '내 신청'
 * 에서도 그 항목이 사라진다**는 것이다. 그 대가를 감당 가능하게 만드는 유일한 조건이 되돌릴
 * 수 있다는 것이고, 되돌리는 자리가 없으면 하드 삭제와 다를 것이 없다 — 그때는 신청자의
 * 기록이 영영 닫힌다. **이 화면은 부속물이 아니라 그 결정의 전제다.**
 *
 * ── 왜 폼 목록의 칩이 아니라 별도 화면인가 ─────────────────────
 * 근거는 shared/config/routes.ts의 `formsDeleted` 주석에 적었다. 요약하면 접수 상태·라벨은
 * 같은 무리를 좁히는 축이고 삭제는 다른 모집단이며, 지워진 폼의 카드는 할 수 있는 일이
 * 복구뿐이라 카드 구성 자체가 다르다.
 *
 * ── 왜 복구에는 확인을 받지 않는가 ─────────────────────────────
 * 접수 시작에 확인을 두지 않는 것과 같은 판단이다(features/form/ui/form-close-sheet.tsx).
 * 잘못 눌러도 그 자리에서 다시 지울 수 있고, 되돌아오는 것은 지우기 전 그대로라 새로 생기는
 * 피해가 없다. 확인을 양쪽에 다 붙이면 정작 삭제 확인이 습관적으로 넘겨진다.
 *
 * ── 왜 필터도 URL 쿼리도 없는가 ────────────────────────────────
 * 폼 목록은 칩을 쿼리스트링에 실어 링크로 공유할 수 있게 했다("접수 중인 신규모집 폼 좀
 * 봐줘"). 여기서는 그럴 일이 없다 — 지운 폼은 치우려고 지운 것이라 남에게 보내는 목록이
 * 아니고, 쌓아 두는 화면도 아니다(되살리거나 그대로 두거나 둘 중 하나다). 실을 상태가 없어
 * `Suspense` 경계도 필요 없다(app/(admin)/forms/page.tsx가 감싸는 이유가 여기엔 없다).
 */

function DeletedFormCard({
  form,
  restoring,
  canRestore,
  onRestore,
}: Readonly<{
  form: FormSummary;
  /** 이 카드의 복구가 진행 중인가 — 연타로 요청이 두 번 나가는 것을 막는다 */
  restoring: boolean;
  canRestore: boolean;
  onRestore: () => void;
}>) {
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        {/*
          접수 상태 배지를 그리지 않는다 — 근거는 entities/form의 DELETED_FORM_BADGE 주석.
          지워진 폼의 '접수중'은 이미 사실이 아니고, 그 배지를 보고 아직 응답을 받는 중이라고
          읽으면 복구할지 판단하는 기준이 통째로 어긋난다.
        */}
        <Badge tone={DELETED_FORM_BADGE.tone}>{DELETED_FORM_BADGE.label}</Badge>
        <div className="flex-1" />
        {/* 이 숫자가 곧 신청자 쪽에서 함께 빠져 있는 건수다 — 복구를 판단하는 값이라 크게 둔다 */}
        <div className="text-[13.5px] text-n500">응답 {form.responseCount}</div>
      </div>
      {/*
        제목을 상세로 가는 링크로 만들지 않는다. 지워진 폼은 상세 조회에서도 빠지므로
        (서버 #329가 목록·조회 양쪽에서 뺀다) 누르면 "폼을 찾을 수 없습니다"로 떨어진다 —
        갈 수 없는 곳을 누를 수 있게 두면 화면이 고장 난 것으로 읽힌다.
      */}
      <div className="mt-2 text-[18px] leading-[1.35] font-semibold">{form.formTtlNm}</div>
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
        {/* 권한이 없으면 감추지 않고 잠근다 — 근거는 features/auth/model/use-can.ts */}
        <button
          type="button"
          disabled={restoring || !canRestore}
          title={canRestore ? FORM_RESTORE_NOTE : NO_FORM_DELETE}
          onClick={onRestore}
          className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {restoring ? "되살리는 중…" : "되살리기"}
        </button>
        <div className="flex-1" />
        {/*
          지운 일시가 이 화면의 핵심 값이다 — 방금 실수로 지운 것과 지난 학기에 치운 것을
          가르는 유일한 단서라, 없으면 무엇을 되살려야 하는지 고를 수 없다. 목록 카드의 다른
          날짜(수정 일자)와 달리 **일자가 아니라 일시**인 것은 되살릴 대상이 대개 조금 전에
          지운 것이고, 같은 날 여러 개를 치운 날에는 일자만으로 갈리지 않기 때문이다.

          값이 형식에 안 맞으면 `formatDt`가 빈 문자열을 준다 — 그때 '지움 '만 남기지 않도록
          자리표시자를 둔다(없는 값을 지어내는 것이 아니라 빈 칸임을 드러내는 표시다).
        */}
        <div className="text-[13px] text-n500">지움 {formatDt(form.delDt) || "-"}</div>
      </div>
    </Card>
  );
}

export function DeletedFormListPage() {
  const router = useRouter();
  const { forms, status, errorMessage, reload } = useFormList({ deleted: true });
  const deletion = useFormDelete();
  const canRestore = useCan(FORM_DELETE_CAPABILITY);

  /*
   * **서버가 지운 폼만 줬는지 응답으로 한 번 더 본다.**
   *
   * 이 한 줄이 실제로 값을 했다. 이 화면은 계약이 확정되기 전 `GET /v1/forms?deleted=true`로
   * 나가고 있었는데(ssccops-web#359), 서버는 그 파라미터를 모르고 **스프링은 모르는 쿼리
   * 파라미터를 조용히 무시하므로** 그 호출에는 살아 있는 폼 전부가 200으로 돌아왔다. 그대로
   * 그렸다면 이 화면은 멀쩡한 폼들을 "삭제됨" 배지와 함께 세워 놓고 되살리라고 권했을 것이다
   * — 대신 `delDt`가 `null`인 항목이 전부 걸러져 목록이 비었다(ssccops-web#362).
   *
   * 경로가 `GET /v1/forms/deleted`로 바로잡힌 지금은 서버가 지운 폼만 준다. 그래도 남기는
   * 것은 **모르는 배포에서 조용히 다른 답이 오는 자리를 화면이 스스로 막고 있어야** 하기
   * 때문이다 — 위가 바로 그 일이 실제로 일어난 기록이다. 지금은 전부 통과한다.
   */
  const deletedForms = forms.filter((f) => f.delDt !== null);

  const runRestore = async (formId: number) => {
    const { outcome, message } = await deletion.restore(formId);
    if (outcome === "busy") return;

    flash(message);
    /*
     * 성공도 stale(이미 되살아났다·사라졌다)도 똑같이 다시 부른다. 되살린 폼은 이 목록에서
     * 빠져야 하고, stale은 뜻 자체가 "화면이 낡았다"라 할 일이 최신 목록을 가져오는 것이다.
     * 낙관적으로 카드만 지우지 않는 것은 폼 목록·상세가 쓰는 방식과 같다(#7에서 정한 재조회).
     */
    if (outcome === "done" || outcome === "stale") reload();
  };

  return (
    <>
      <PageHeader
        title="지운 폼"
        subtitle="되살리면 폼 목록으로 돌아옵니다"
        action={{ label: "폼 목록", onClick: () => router.push(ROUTES.forms) }}
      />
      <PageBody>
        {/*
          **신청자 쪽에서 무슨 일이 일어나 있는지를 이 화면이 말한다.** 지울 때 확인 시트가 한
          번 알리지만 그것은 누르는 순간뿐이고, 그 뒤로 그 사실이 남아 있는 자리는 여기뿐이다 —
          여기 없으면 운영진은 지운 폼이 자기 목록에서만 빠진 줄 안다.
        */}
        <div className="mb-4 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
          지운 폼은 폼 목록에서 빠지고, 그 폼에 낸 응답은 신청자의 &lsquo;내 신청&rsquo;에서도
          보이지 않습니다. {FORM_RESTORE_NOTE}.
        </div>

        {status === "loading" && <EmptyState message="불러오는 중…" />}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "지운 폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (deletedForms.length === 0 ? (
            <EmptyState message="지운 폼이 없습니다." />
          ) : (
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {deletedForms.map((f) => (
                <DeletedFormCard
                  key={f.formId}
                  form={f}
                  restoring={deletion.pendingFormId === f.formId}
                  canRestore={canRestore}
                  onRestore={() => void runRestore(f.formId)}
                />
              ))}
            </div>
          ))}
      </PageBody>
    </>
  );
}
