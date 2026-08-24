"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  QITEM_VERSION_NOTE,
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_DELETE_LOCKED,
  SYSTEM_FORM_OPEN_PARTS,
  type QitemCpstCn,
} from "@/entities/form";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  FormSaveStatusBar,
  QitemComposer,
  useFormEditor,
  useFormLabelOptions,
  useFormStatus,
  type FormEditor,
} from "@/features/form";
import { SaveAsTemplateSheet, useTemplateFromForm } from "@/features/form-template";
import { FIELD_LABEL } from "@/shared/config/labels";
import { fromInput, toInput, withServiceOffset } from "@/shared/lib/date";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 폼 편집기.
 *
 * 편집 상태와 자동 저장은 features/form(useFormEditor)이 전담한다. 이 파일은 초안을 그리고
 * 조작을 초안 변경으로 옮기는 일만 한다 — 어떤 값이 언제 서버로 나가는지는 여기서 알 필요가
 * 없고, 알게 두면 JSX 사이에 저장 규칙이 흩어진다.
 *
 * 저장 버튼은 남겼지만 의미가 달라졌다. 이제는 "이걸 눌러야 저장된다"가 아니라 **"지금
 * 저장됐다는 것을 확인하고 싶다 · 실패했을 때 직접 다시 시도한다"** 를 위한 수단이다.
 *
 * '저장하고 접수 시작'은 **명시적으로 누를 때만** 접수 상태를 건드린다. #8에서 이 버튼을 뺐던
 * 이유는 저장 본문에 formSttsCd를 실어 보내던 구조 때문이었다 — 자동 저장이 상태를 실어 나르면
 * "편집했더니 접수가 시작됐다"가 가능해진다. 지금은 상태 전이가 별도 API(ssccops-server #33)라
 * 자동 저장은 상태를 그대로 되돌려 보낼 뿐이고, 접수 시작은 이 버튼 한 번에만 일어난다.
 *
 * 그 대신 **서버에서는 두 번의 호출**이다(저장 → 상태 전이). 저장은 됐는데 전이가 실패하는
 * 경우가 실재하므로 화면은 그 둘을 구분해 말한다 — 뭉뚱그리면 사용자가 편집 내용까지 날아간
 * 줄 알고 처음부터 다시 만든다.
 */

export function FormEditPage({ formId }: { formId?: number }) {
  const editor = useFormEditor(formId);
  const canWrite = useCan(CAPABILITY.FORM_WRITE);

  /*
   * 이 화면만은 잠그는 것이 아니라 **아예 열지 않는다** (#29).
   *
   * 다른 곳과 규칙이 다른 이유는 편집기가 자동 저장이기 때문이다. 입력란을 열어 두면 타이핑
   * 한 번마다 저장 요청이 나가 전부 403으로 떨어지고, 사용자는 자기가 쓴 내용이 어디에도
   * 남지 않았다는 것을 저장 실패 배너로만 알게 된다. 잠긴 입력란 수십 개를 보여 주는 것도
   * 안내가 아니다 — 여기서는 못 쓴다는 사실 하나가 필요한 전부다.
   *
   * 목록·상세의 '수정'은 이미 잠겨 있으므로 이 분기에 닿는 것은 주소를 직접 친 경우다.
   */
  if (!canWrite) {
    return (
      <>
        <PageHeader title="폼 편집" showBack />
        <PageBody>
          <EmptyState message="폼을 고칠 권한이 없습니다 — 폼 작성·수정(FORM_WRITE) 권한이 필요합니다." />
        </PageBody>
      </>
    );
  }

  if (editor.status === "ready") return <FormEditContent editor={editor} />;

  return (
    <>
      <PageHeader title="폼 편집" showBack />
      <PageBody>
        {editor.status === "loading" && <EmptyState message="불러오는 중…" />}
        {editor.status === "not-found" && <EmptyState message="폼을 찾을 수 없습니다." />}
        {editor.status === "error" && (
          <EmptyState
            message={editor.loadErrorMessage || "폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: editor.reload }}
          />
        )}
      </PageBody>
    </>
  );
}

function FormEditContent({ editor }: { editor: FormEditor }) {
  const router = useRouter();
  const { draft, labelIds, assignedLabels, setDraft, setLabelIds, issues } = editor;
  const labelOptions = useFormLabelOptions();
  const formStatus = useFormStatus();
  const templateSave = useTemplateFromForm();
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);

  /*
   * 지정돼 있지만 후보에는 없는 라벨 = **비활성화된 뒤에도 이 폼에 남아 있는 라벨**이다.
   *
   * 후보는 활성 라벨만 받아 오므로(라벨은 삭제가 아니라 비활성화다) 이 라벨들은 그냥 두면
   * 화면에서 사라진다. 그런데 저장은 지정을 통째로 교체하는 방식이라, 안 보인다는 이유로
   * 요청에 안 실리면 **아무도 누르지 않았는데 지정이 조용히 풀린다.** 그래서 여기서 따로
   * 뽑아 칩으로 노출한다 — 해제는 되지만 다시 고를 수는 없다(서버가 400으로 막는다).
   *
   * 후보 조회가 아직 끝나지 않았거나 실패한 동안에는 계산하지 않는다. 그때는 후보가 빈
   * 배열이라 지정된 라벨이 전부 비활성으로 보이게 된다.
   */
  const labelsLoaded = !labelOptions.loading && !labelOptions.errorMessage;
  const activeLabelIds = new Set(labelOptions.labels.map((l) => l.formLblId));
  const inactiveAssigned = labelsLoaded
    ? assignedLabels.filter(
        (l) => labelIds.includes(l.formLblId) && !activeLabelIds.has(l.formLblId),
      )
    : [];

  const toggleLabel = (formLblId: number) =>
    setLabelIds((ids) =>
      ids.includes(formLblId) ? ids.filter((x) => x !== formLblId) : [...ids, formLblId],
    );

  /** 해제하면 되돌릴 수 없으므로(재선택 불가) 사라지기 전에 그 사실을 알린다 */
  const unassignInactive = (formLblId: number, lblNm: string) => {
    toggleLabel(formLblId);
    flash(`${lblNm} 지정 해제됨 — 비활성 라벨이라 다시 지정할 수 없습니다`);
  };

  /*
   * 페이지·문항 편집은 features/form 의 QitemComposer 한 벌이 맡는다 (#134).
   * 템플릿 편집 화면도 같은 컴포넌트를 쓴다 — 편집기가 두 벌이면 규칙이 갈려, 템플릿에서는
   * 만들 수 있었던 구성이 그 템플릿으로 만든 폼의 저장에서 거절된다.
   */
  const setCpst = (fn: (cpst: QitemCpstCn) => QitemCpstCn) =>
    setDraft((d) => ({ ...d, qitemCpstCn: fn(d.qitemCpstCn) }));

  /** 지금 저장 — 보류 중이면 사유를 알린다. 조용히 아무 일도 일어나지 않으면 안 된다 */
  const saveNow = async (): Promise<number | null> => {
    if (issues.blockingMessage) {
      flash(issues.blockingMessage);
      return null;
    }
    const savedFormId = await editor.saveNow();
    flash(savedFormId ? "저장했습니다" : "저장하지 못했습니다. 저장 상태를 확인해주세요");
    return savedFormId;
  };

  /*
   * '템플릿으로 저장' — **저장을 먼저 끝낸다** (#134).
   *
   * 서버는 요청 본문의 문항을 받지 않고 경로가 가리키는 폼의 **현재 저장된** 구성을 복사한다.
   * 그래서 자동 저장이 아직 나가지 않은 상태에서 부르면, 방금 고친 문항이 빠진 템플릿이 남고
   * 사용자는 그 사실을 다음 회차에야 알게 된다. 신규 폼은 첫 저장 전까지 폼 번호가 없어
   * 경로 자체를 만들 수 없으므로 같은 저장이 그 문제도 함께 푼다.
   */
  const saveAsTemplate = async (input: { tmplNm: string; tmplExpln: string }) => {
    const savedFormId = await editor.saveNow();
    if (!savedFormId) {
      flash("저장하지 못해 템플릿으로 남기지 않았습니다. 저장 상태를 확인해주세요");
      return;
    }

    const { formTmplId, message } = await templateSave.save(savedFormId, input);
    if (!message) return;

    flash(message);
    if (formTmplId) setTemplateSheetOpen(false);
  };

  /* 상세로 넘어가기 전에 저장을 끝낸다 — 화면 내 이동은 beforeunload가 잡아 주지 않는다 */
  const goDetail = async () => {
    const savedFormId = await saveNow();
    if (savedFormId) router.push(ROUTES.formDetail(savedFormId));
  };

  /*
   * '저장하고 접수 시작' — 저장(POST/PUT) 다음에 상태 전이(POST /status), **두 번의 호출**이다.
   *
   * 세 갈래를 각각 다르게 말한다. 하나로 뭉뚱그리면 "저장도 안 됐다"로 읽혀 사용자가 편집을
   * 처음부터 다시 한다.
   * 1. 저장 자체가 안 됨 → 상태 전이는 시도조차 하지 않는다 (없는 폼을 열 수는 없다)
   * 2. 저장은 됐는데 전이 실패 → **저장됐다는 사실을 먼저 말한다.** 문항 0개·접수 기간 모순이
   *    여기 걸리는데, 둘 다 편집 화면에서 고치고 다시 누르면 되는 것들이다
   * 3. 둘 다 성공 → 상세로 보낸다. 이후 마감·재개는 상세 화면의 몫이다
   *
   * 저장은 자동 저장과 같은 프라미스 체인을 타므로(useFormEditor) 여기서 두 번 눌러도 저장이
   * 두 번 나가지 않고, 전이 쪽 연타는 useFormStatus의 잠금이 막는다.
   */
  const saveAndOpenReceipt = async () => {
    if (issues.blockingMessage) {
      flash(issues.blockingMessage);
      return;
    }

    const savedFormId = await editor.saveNow();
    if (!savedFormId) {
      flash("저장하지 못해 접수를 시작하지 않았습니다. 저장 상태를 확인해주세요");
      return;
    }

    const { outcome, message } = await formStatus.open(savedFormId);
    if (outcome === "busy") return;

    if (outcome === "changed") {
      flash(message);
      router.push(ROUTES.formDetail(savedFormId));
      return;
    }

    flash(`저장은 됐지만 접수를 시작하지 못했습니다 — ${message}`);
  };

  return (
    <>
      <PageHeader
        title="폼 편집"
        // 첫 자동 저장으로 폼_ID가 생기는 순간 "새 폼"에서 폼 번호로 바뀐다
        subtitle={editor.formId ? `폼 #${editor.formId}` : "새 폼"}
        showBack
      />
      <PageBody>
        <FormSaveStatusBar save={editor.save} onRetry={editor.retry} />

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col gap-4">
            {/*
              시스템 폼과 문항 버전 안내 (ssccops-server #140).

              저장을 누르기 전에 알아야 하는 두 가지를 같은 상자에서 말한다 — 이 폼에서 무엇이
              잠겨 있고 무엇이 열려 있는가, 그리고 문항을 고치면 무엇이 남는가. 잠긴 것만 적으면
              폼 전체가 굳은 줄 알고 아무도 손대지 않으므로 열려 있는 값도 함께 적는다.
            */}
            {(editor.sysYn || editor.qitemVer !== null) && (
              <div className="rounded-[12px] border border-line bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
                {editor.sysYn && (
                  <div>
                    <Badge tone={SYSTEM_FORM_BADGE.tone}>{SYSTEM_FORM_BADGE.label}</Badge>{" "}
                    {SYSTEM_FORM_DELETE_LOCKED}. {SYSTEM_FORM_OPEN_PARTS}.{" "}
                    문항은 문구 수정·추가·순서 변경이 모두 되고, 시스템이 사용하는 문항만 지울
                    수 없습니다.
                  </div>
                )}
                {/* 버전은 서버가 준 값만 말한다 — 신규 폼은 아직 저장된 구성이 없다 */}
                {editor.qitemVer !== null && (
                  <div className={editor.sysYn ? "mt-2" : undefined}>
                    {FIELD_LABEL.qitemVersion} v{editor.qitemVer} · {QITEM_VERSION_NOTE}
                  </div>
                )}
              </div>
            )}

            <Card>
              <SectionLabel className="mb-3">기본정보</SectionLabel>
              <div className="flex flex-col gap-[14px]">
                <Field label={FIELD_LABEL.formTitle} required error={issues.formTtlNm || null}>
                  <TextField
                    value={draft.formTtlNm}
                    invalid={Boolean(issues.formTtlNm)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, formTtlNm: e.target.value }))
                    }
                    placeholder="예: 2026-1 신규 부원 모집"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                  <Field label={FIELD_LABEL.receiptStartAt}>
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.rcptBgngDt, true)}
                      invalid={Boolean(issues.rcptDt)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          // 오프셋을 여기서 붙인다 — 서버에서 받아 온 값(+09:00)과 방금 친 값이
                          // 같은 모양이어야 아래 접수 기간 비교(문자열 대소)가 어긋나지 않는다
                          rcptBgngDt: withServiceOffset(fromInput(e.target.value, true)),
                        }))
                      }
                    />
                  </Field>
                  <Field label={FIELD_LABEL.receiptEndAt} error={issues.rcptDt || null}>
                    <TextField
                      type="datetime-local"
                      value={toInput(draft.rcptEndDt, true)}
                      invalid={Boolean(issues.rcptDt)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          rcptEndDt: withServiceOffset(fromInput(e.target.value, true)),
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">{FIELD_LABEL.formLabel}</SectionLabel>
              {/*
                라벨 지정은 폼 저장 본문(labelIds)에 함께 실린다 — 별도 라벨 API를 같이 부르면
                자동 저장 화면에서 두 요청의 도착 순서에 따라 지정이 되살아난다 (#10 합의)
              */}
              {labelOptions.loading ? (
                <div className="text-[13.5px] text-n500">라벨을 불러오는 중…</div>
              ) : labelOptions.errorMessage ? (
                <div className="text-[13.5px] text-danger">{labelOptions.errorMessage}</div>
              ) : labelOptions.labels.length === 0 && inactiveAssigned.length === 0 ? (
                <div className="text-[13.5px] text-n500">사용할 수 있는 라벨이 없습니다.</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-[7px]">
                    {labelOptions.labels.map((l) => (
                      <Chip
                        key={l.formLblId}
                        active={labelIds.includes(l.formLblId)}
                        onClick={() => toggleLabel(l.formLblId)}
                      >
                        {l.lblNm}
                      </Chip>
                    ))}
                    {/* 비활성 라벨은 항상 지정된 상태로만 나타난다 — 후보가 아니라 잔여 지정이다 */}
                    {inactiveAssigned.map((l) => (
                      <Chip
                        key={l.formLblId}
                        active
                        onClick={() => unassignInactive(l.formLblId, l.lblNm)}
                      >
                        <span className="line-through">{l.lblNm}</span>
                        <span className="ml-[5px] text-[12px]">비활성</span>
                      </Chip>
                    ))}
                  </div>
                  {inactiveAssigned.length > 0 && (
                    <div className="mt-[9px] text-[13px] text-n500">
                      비활성 라벨은 이미 지정된 것만 유지됩니다. 해제하면 다시 지정할 수 없습니다.
                    </div>
                  )}
                </>
              )}
            </Card>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 py-[13px]"
                  onClick={() => void saveNow()}
                >
                  지금 저장
                </Button>
                <Button className="flex-1 py-[13px]" onClick={() => void goDetail()}>
                  저장하고 상세로
                </Button>
              </div>
              {/* 접수 상태를 바꾸는 유일한 버튼 — 자동 저장은 상태를 건드리지 않는다 */}
              <Button
                variant="ghost"
                className="py-[13px]"
                disabled={formStatus.pending}
                onClick={() => void saveAndOpenReceipt()}
              >
                {formStatus.pending ? "접수를 시작하는 중…" : "저장하고 바로 접수 시작"}
              </Button>
              {/*
                '템플릿으로 저장'은 복제와 다른 조작이라 버튼도 따로 둔다 (#134).
                누르면 먼저 저장이 나간다 — 서버가 복사하는 것은 화면의 초안이 아니라
                **폼에 저장돼 있는 문항 구성**이기 때문이다.
              */}
              <Button
                variant="ghost"
                className="py-[13px]"
                disabled={templateSave.pending}
                onClick={() => setTemplateSheetOpen(true)}
              >
                템플릿으로 저장
              </Button>
              <div className="text-[13px] text-n500">
                접수를 시작하면 공개 링크로 응답을 받습니다. 문항이 없거나 접수 일시가
                올바르지 않으면 시작되지 않습니다.
              </div>
            </div>
          </div>

          <QitemComposer
            cpst={draft.qitemCpstCn}
            onChange={setCpst}
            issues={issues.qitems}
            inUseQitemIds={editor.inUseQitemIds}
            systemRequiredQitemIds={editor.systemRequiredQitemIds}
          />
        </div>
      </PageBody>

      <SaveAsTemplateSheet
        open={templateSheetOpen}
        formTtlNm={draft.formTtlNm}
        pending={templateSave.pending}
        onClose={() => setTemplateSheetOpen(false)}
        onSave={(input) => void saveAsTemplate(input)}
      />
    </>
  );
}
