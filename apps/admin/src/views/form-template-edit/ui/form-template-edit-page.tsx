"use client";

import { useRouter } from "next/navigation";
import type { QitemCpstCn } from "@/entities/form";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { QitemComposer } from "@/features/form";
import {
  NO_TEMPLATE_WRITE,
  useFormTemplateEditor,
  type FormTemplateEditor,
} from "@/features/form-template";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 폼 템플릿 등록·수정 (ssccops-server #142).
 *
 * ── 등록과 수정이 한 화면인 근거 ────────────────────────────────
 * AGENTS.md는 단건 수정을 등록 화면과 나누라고 적고 있는데, 그 규칙이 겨냥한 것은 **여러
 * 종류를 한 상태 기계로 다루는 등록 화면**(하위 업무)이다. 템플릿은 종류가 하나이고 서버도
 * 생성·수정에 같은 요청 DTO를 쓴다 — 나누면 두 화면이 같은 입력란과 같은 검증을 두 벌 갖게
 * 되고, 한쪽만 고쳐져 조용히 어긋난다. 폼 편집기가 이미 같은 판단을 하고 있다.
 *
 * ── 문항 편집기는 폼 편집기의 것을 그대로 쓴다 ───────────────────
 * `QitemComposer` 한 벌이 두 화면을 맡는다. 서버가 폼과 템플릿의 문항 구성을 같은 검증기로
 * 보기 때문에, 편집기를 따로 만들면 여기서는 만들 수 있었던 구성이 그 템플릿으로 만든 폼의
 * 저장에서 거절된다.
 *
 * ── 자동 저장이 없다 ───────────────────────────────────────────
 * 폼 편집기와 갈리는 지점이다(근거는 use-form-template-editor.ts). 그래서 저장 버튼이 "이걸
 * 눌러야 저장된다"는 원래 뜻을 갖고, 저장하지 않고 나가면 브라우저가 이탈을 경고한다.
 */

export function FormTemplateEditPage({ formTmplId }: { formTmplId?: number }) {
  const editor = useFormTemplateEditor(formTmplId);
  const canWrite = useCan(CAPABILITY.FORM_WRITE);
  const isNew = formTmplId === undefined;
  const title = isNew ? "새 템플릿" : "템플릿 편집";

  /*
   * 이 화면은 잠그는 것이 아니라 **아예 열지 않는다** — 폼 편집 화면과 같은 판단이다.
   * 잠긴 입력란 수십 개를 보여 주는 것은 안내가 아니고, 무엇보다 조회부터 403이라 채울 값도
   * 없다. 목록의 '수정'과 '+ 새 템플릿'은 이미 잠겨 있으므로 여기 닿는 것은 주소를 직접 친
   * 경우다.
   */
  if (!canWrite) {
    return (
      <>
        <PageHeader title={title} showBack />
        <PageBody>
          <EmptyState message={`${NO_TEMPLATE_WRITE}.`} />
        </PageBody>
      </>
    );
  }

  if (editor.status === "ready") {
    return <FormTemplateEditContent editor={editor} title={title} />;
  }

  return (
    <>
      <PageHeader title={title} showBack />
      <PageBody>
        {editor.status === "loading" && <EmptyState message="불러오는 중…" />}
        {editor.status === "not-found" && (
          <EmptyState message="템플릿을 찾을 수 없습니다 — 목록에서 다시 선택해주세요." />
        )}
        {editor.status === "error" && (
          <EmptyState
            message={editor.loadErrorMessage || "템플릿을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: editor.reload }}
          />
        )}
      </PageBody>
    </>
  );
}

function FormTemplateEditContent({
  editor,
  title,
}: {
  editor: FormTemplateEditor;
  title: string;
}) {
  const router = useRouter();
  const { draft, setDraft, issues } = editor;

  const setCpst = (fn: (cpst: QitemCpstCn) => QitemCpstCn) =>
    setDraft((d) => ({ ...d, qitemCpstCn: fn(d.qitemCpstCn) }));

  /** 지금 저장 — 보류 중이면 사유를 알린다. 조용히 아무 일도 일어나지 않으면 안 된다 */
  const save = async (): Promise<number | null> => {
    if (issues.blockingMessage) {
      flash(issues.blockingMessage);
      return null;
    }
    const savedId = await editor.save();
    flash(savedId ? "저장했습니다" : editor.saveErrorMessage || "저장하지 못했습니다");
    return savedId;
  };

  /* 목록으로 넘어가기 전에 저장을 끝낸다 — 화면 내 이동은 beforeunload가 잡아 주지 않는다 */
  const saveAndGoList = async () => {
    if (await save()) router.push(ROUTES.formTemplates);
  };

  return (
    <>
      <PageHeader
        title={title}
        /* 첫 저장으로 번호가 생기는 순간 "저장 전"에서 템플릿 번호로 바뀐다 */
        subtitle={
          editor.formTmplId
            ? `템플릿 #${editor.formTmplId}${editor.creatrMbrNm ? ` · 만든 사람 ${editor.creatrMbrNm}` : ""}`
            : "저장 전"
        }
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">기본정보</SectionLabel>
              <div className="flex flex-col gap-[14px]">
                <Field label="템플릿 이름" required error={issues.tmplNm || null}>
                  <TextField
                    value={draft.tmplNm}
                    invalid={Boolean(issues.tmplNm)}
                    onChange={(e) => setDraft((d) => ({ ...d, tmplNm: e.target.value }))}
                    placeholder="예: 신규 부원 모집 표준 문항"
                  />
                </Field>
                <Field label="설명" error={issues.tmplExpln || null}>
                  <TextArea
                    value={draft.tmplExpln}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, tmplExpln: e.target.value }))
                    }
                    placeholder="어떤 폼에 쓰는 구성인지 적어 두면 고를 때 도움이 됩니다 (선택)"
                  />
                </Field>
              </div>
            </Card>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 py-[13px]"
                  disabled={editor.saving}
                  onClick={() => void save()}
                >
                  {editor.saving ? "저장하는 중…" : "저장"}
                </Button>
                <Button
                  className="flex-1 py-[13px]"
                  disabled={editor.saving}
                  onClick={() => void saveAndGoList()}
                >
                  저장하고 목록으로
                </Button>
              </div>
              {editor.saveErrorMessage && (
                <div className="text-[13.5px] text-danger">{editor.saveErrorMessage}</div>
              )}
              <div className="text-[13px] text-n500">
                {/*
                  자동 저장이 없다는 사실과, 사용 여부가 여기서 바뀌지 않는다는 사실을 함께
                  말한다 — 후자는 입력란이 없는 이유이기도 하다.
                */}
                템플릿은 저장을 눌러야 반영됩니다. 사용 여부는 템플릿 관리 목록에서 바꿉니다.
              </div>
              {editor.dirty && (
                <div className="text-[13px] text-n400">저장하지 않은 변경이 있습니다.</div>
              )}
            </div>
          </div>

          {/* 폼 편집 화면과 같은 편집기 한 벌 — 템플릿에는 응답이 없어 삭제 제한도 없다 */}
          <QitemComposer
            cpst={draft.qitemCpstCn}
            onChange={setCpst}
            issues={issues.qitems}
          />
        </div>
      </PageBody>
    </>
  );
}
