"use client";

import { useRouter } from "next/navigation";
import type { FormTemplateSummary } from "@/entities/form-template";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  NO_TEMPLATE_WRITE,
  useFormFromTemplate,
  useFormTemplates,
} from "@/features/form-template";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Card,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  Toggle,
  flash,
  type GridColumn,
} from "@/shared/ui";

/*
 * 폼 템플릿 관리 (ssccops-server #142).
 *
 * ── 이 화면에 "삭제"가 없는 이유 ────────────────────────────────
 * 서버에 DELETE 자체가 없다. 템플릿은 지우지 않고 사용 여부로 내린다 — 내린 템플릿은 '템플릿에서
 * 시작' 선택지에서만 빠지고 조회·수정은 그대로 되며, 그 템플릿으로 이미 만든 폼은 아무 영향도
 * 받지 않는다. 그래서 **꺼진 템플릿도 취소선으로 목록에 남는다**: 안 그러면 되돌릴 길이 없다
 * (폼 라벨·하위 업무 유형과 같은 축이다).
 *
 * ── 권한 (서버 클래스 레벨 @RequireAuthority) ──────────────────
 * 템플릿 API는 조회까지 전부 FORM_WRITE다. 그래서 사이드바에서는 이 메뉴를 감추고(nav.ts),
 * 화면 안에서는 조작을 잠근다 — 주소를 직접 쳐서 들어온 경우 목록 조회 자체가 403이라, 표 대신
 * 그 사유가 오류 자리에 뜬다(features/form-template 의 문구 매핑).
 */

export function FormTemplateListPage() {
  const router = useRouter();
  const admin = useFormTemplates();
  const creation = useFormFromTemplate();
  /* 템플릿의 조회·등록·수정·사용 여부 전환이 전부 같은 권한 하나다 — 서버가 그렇게 걸어 두었다 */
  const canWrite = useCan(CAPABILITY.FORM_WRITE);

  const goNew = () => router.push(ROUTES.formTemplateNew);
  const goEdit = (formTmplId: number) => router.push(ROUTES.formTemplateEdit(formTmplId));

  /*
   * 폼을 만든 뒤에는 목록을 다시 부르지 않고 **새 폼의 편집 화면으로 이동**한다.
   * 새 폼은 작성 중(DRAFT)이고 접수 기간도 라벨도 비어 있어 손볼 것이 반드시 남는다 —
   * 폼 복제와 같은 판단이다. 편집 화면이 진입 시 상세를 다시 조회하므로 갱신도 함께 끝난다.
   */
  const createForm = async (template: FormTemplateSummary) => {
    const { formId, message } = await creation.create(template.formTmplId, template.tmplNm);
    if (!message) return;

    flash(message);
    if (formId) router.push(ROUTES.formEdit(formId));
  };

  /** 좁은 화면에서 카드가 길어지지 않게 설명·수정 일자는 감춘다 (#85) */
  const columns: GridColumn<FormTemplateSummary>[] = [
    {
      key: "tmplNm",
      header: "템플릿 이름",
      width: "2fr",
      mobilePrimary: true,
      render: (t) => (
        <span
          onClick={() => (canWrite ? goEdit(t.formTmplId) : undefined)}
          title={canWrite ? undefined : NO_TEMPLATE_WRITE}
          className={
            t.useYn
              ? "cursor-pointer font-medium hover:text-accent"
              : "cursor-pointer text-n500 line-through hover:text-accent"
          }
        >
          {t.tmplNm}
        </span>
      ),
    },
    {
      key: "tmplExpln",
      header: "설명",
      width: "2fr",
      mobileHide: true,
      // 설명은 없을 수 있다 — 변환기가 채우지 않고 그리는 쪽이 표시 규칙을 정한다
      render: (t) => <span className="text-n400">{t.tmplExpln || "-"}</span>,
    },
    {
      key: "qitemCnt",
      header: "문항",
      width: ".7fr",
      // 서버가 세어 준 값 — 목록에 문항 구성이 실리지 않는 대신 이것으로 빈 템플릿을 가른다
      render: (t) => <span className="text-n400">{t.qitemCnt}개</span>,
    },
    {
      key: "mdfcnDt",
      header: "수정",
      width: "1fr",
      mobileHide: true,
      render: (t) => <span className="text-n400">{formatYmd(t.mdfcnDt)}</span>,
    },
    {
      key: "useYn",
      header: "사용 여부",
      width: "88px",
      render: (t) => (
        <Toggle
          on={t.useYn}
          onChange={() => void admin.toggle(t)}
          disabled={!canWrite}
          title={canWrite ? undefined : NO_TEMPLATE_WRITE}
          /*
           * 응답이 오기 전에 다시 눌리면 방금 바꾼 값을 되돌리게 된다 — 진행 중에는 훅이
           * 요청을 막고, 여기서는 그 사실을 흐리게 보여 준다.
           */
          className={admin.isToggling(t.formTmplId) ? "opacity-50" : undefined}
        />
      ),
    },
    {
      key: "actions",
      header: "조작",
      width: "160px",
      align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-3 text-[14px]">
          {/* 권한이 없으면 감추지 않고 잠근다 — 근거는 features/auth/model/use-can.ts */}
          <button
            type="button"
            disabled={!canWrite || !t.useYn || creation.pending}
            title={
              !canWrite
                ? NO_TEMPLATE_WRITE
                : t.useYn
                  ? undefined
                  : "사용하지 않는 템플릿입니다 — 사용 여부를 켜면 폼을 만들 수 있습니다"
            }
            onClick={() => void createForm(t)}
            className="cursor-pointer whitespace-nowrap text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creation.pendingTemplateId === t.formTmplId ? "만드는 중…" : "폼 만들기"}
          </button>
          <button
            type="button"
            disabled={!canWrite}
            title={canWrite ? undefined : NO_TEMPLATE_WRITE}
            onClick={() => goEdit(t.formTmplId)}
            className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            수정
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="템플릿 관리"
        subtitle="폼 문항 구성을 다음 회차에 다시 쓴다"
        action={{
          label: "+ 새 템플릿",
          onClick: goNew,
          disabled: !canWrite,
          title: canWrite ? undefined : NO_TEMPLATE_WRITE,
        }}
      />
      <PageBody>
        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "템플릿을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" && (
          <>
            {admin.toggleErrorMessage && (
              <div className="mb-3 text-[13.5px] text-danger">
                {admin.toggleErrorMessage}
              </div>
            )}
            <Card className="px-5 pt-4 pb-[6px]">
              <GridTable
                columns={columns}
                rows={admin.templates}
                rowKey={(t) => String(t.formTmplId)}
                empty={
                  <EmptyState
                    message="등록된 템플릿이 없습니다."
                    /*
                     * 빈 화면의 유도 버튼만은 감춘다 — 잠긴 버튼이 "여기를 누르세요"라고
                     * 권하면서 동시에 누르지 못하게 하는 모순이 된다. 사유는 헤더의 잠긴
                     * '+ 새 템플릿'이 이미 말해 준다 (폼 목록과 같은 판단).
                     */
                    action={canWrite ? { label: "+ 새 템플릿", onClick: goNew } : undefined}
                  />
                }
              />
            </Card>
            <div className="mt-3 text-[13px] text-n500">
              사용 여부를 끄면 취소선으로 남고 새 폼을 시작할 수 없게 됩니다. 이미 만들어 둔
              폼은 영향을 받지 않으며 언제든 다시 켤 수 있습니다.
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
