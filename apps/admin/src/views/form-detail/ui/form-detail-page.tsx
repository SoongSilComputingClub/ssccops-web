"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORM_RECEIPT_BADGE,
  SYSTEM_FORM_BADGE,
  SYSTEM_FORM_DELETE_LOCKED,
  SYSTEM_FORM_DUPLICATE_NOTE,
  SYSTEM_FORM_OPEN_PARTS,
  type FormDetail,
  type FormPage,
  type Qitem,
} from "@/entities/form";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  FormCloseSheet,
  useDuplicateForm,
  useFormDetail,
  useFormStatus,
  type FormStatusChange,
} from "@/features/form";
import {
  NO_TEMPLATE_WRITE,
  SaveAsTemplateSheet,
  useTemplateFromForm,
} from "@/features/form-template";
import { FIELD_LABEL } from "@/shared/config/labels";
import { isChoiceQitemType, QITEM_TYPE_NM } from "@/shared/config/codes";
import { publicFormUrl, ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatDt, formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
  StatBox,
  flash,
} from "@/shared/ui";

/** 잠긴 버튼에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_WRITE = "폼을 고치거나 복제할 권한이 없습니다";
const NO_STATUS_CHANGE = "접수 상태를 바꿀 권한이 없습니다";

function QitemPreview({
  qitem,
  sel,
  onPick,
  pages,
}: {
  qitem: Qitem;
  sel: string[];
  onPick: (option: string) => void;
  pages: FormPage[];
}) {
  const isChoice = isChoiceQitemType(qitem.qitemTypeCd);
  return (
    <div className="border-t border-black/5 py-3 first:border-t-0">
      <div className="text-[16px] font-medium">
        {qitem.qitemLblNm || "(제목 없음)"}
        {qitem.reqYn && <span className="ml-1 text-accent">*</span>}
      </div>
      <div className="mt-[2px] text-[12.5px] text-n500">
        {qitem.qitemId} · {QITEM_TYPE_NM[qitem.qitemTypeCd]}
      </div>
      {qitem.ptrnCn && (
        <div className="mt-1 font-mono text-[12px] text-n500">
          입력 형식 · {qitem.ptrnNm} · {qitem.ptrnCn}
        </div>
      )}
      {isChoice && qitem.maxSlctCnt && (
        <div className="mt-1 text-[12.5px] text-accent">
          최대 {qitem.maxSlctCnt}개
        </div>
      )}
      {isChoice ? (
        <div className="mt-2 flex flex-col gap-[6px]">
          {qitem.optionList.map((o) => {
            const picked = sel.includes(o);
            const branch = qitem.branchMap?.[o];
            return (
              <div
                key={o}
                onClick={() => onPick(o)}
                className="flex cursor-pointer items-center gap-2 text-[14.5px]"
              >
                <div
                  className={cn(
                    "size-[14px] flex-none border",
                    qitem.qitemTypeCd === "SINGLE_CHOICE"
                      ? "rounded-full"
                      : "rounded-[3px]",
                    picked ? "border-accent bg-accent" : "border-line-strong",
                  )}
                />
                {/* 플렉스 아이템의 min-width:auto를 풀어 준다 — 띄어쓰기 없는 긴 보기 대비 */}
                <span className="min-w-0 break-words">{o}</span>
                {branch !== undefined && (
                  <span className="text-[12.5px] text-accent">
                    → {branch + 1}. {pages[branch]?.pageTtl ?? ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            "mt-2 rounded-[10px] border border-line bg-[#f9fafb] px-3 py-2 text-[14px] text-n500",
            qitem.qitemTypeCd === "LONG_TEXT" && "min-h-[56px]",
          )}
        >
          답변 입력
        </div>
      )}
    </div>
  );
}

/**
 * 서버에서 받아 온 폼 한 건을 그린다.
 *
 * 조회 상태 분기와 분리한 것은 미리보기 상태(현재 페이지·선택지)가 **폼이 도착한 뒤에야
 * 의미가 있기** 때문이다. 한 컴포넌트에 두면 로딩 중에도 페이지 인덱스를 들고 있게 되고,
 * 폼이 바뀌었을 때 초기화를 따로 챙겨야 한다.
 */
function FormDetailContent({ form, reload }: { form: FormDetail; reload: () => void }) {
  const router = useRouter();
  const status = useFormStatus();
  const duplication = useDuplicateForm();
  /*
   * 두 권한을 따로 본다 (#29). 서버가 폼 편집(FORM_WRITE)과 접수 상태 전이(FORM_STATUS_CHANGE)를
   * 다른 권한으로 막고 있어서다 — 하나로 묶으면 접수만 여닫을 수 있는 회원에게서 그 버튼까지
   * 잠근다. 둘 다 FORM_MANAGE 아래라 대개 함께 오지만, 함께 온다는 사실에 기대지 않는다.
   */
  const canWrite = useCan(CAPABILITY.FORM_WRITE);
  const canChangeStatus = useCan(CAPABILITY.FORM_STATUS_CHANGE);
  const templateSave = useTemplateFromForm();
  const [closeSheetOpen, setCloseSheetOpen] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  /* 배지는 서버 파생값으로 그린다 — 근거는 entities/form의 FORM_RECEIPT_BADGE 주석 */
  const badge = FORM_RECEIPT_BADGE[form.receiptStatus];
  const { pages, qitems } = form.qitemCpstCn;
  const pageQitems = qitems.filter((q) => (q.pageSeq ?? 0) === page);
  const summary = form.responseSummary;

  const pick = (qitem: Qitem, option: string) => {
    setSel((s) => {
      const cur = s[qitem.qitemId] ?? [];
      if (qitem.qitemTypeCd === "SINGLE_CHOICE")
        return { ...s, [qitem.qitemId]: [option] };
      if (cur.includes(option))
        return { ...s, [qitem.qitemId]: cur.filter((o) => o !== option) };
      if (qitem.maxSlctCnt && cur.length >= qitem.maxSlctCnt) return s;
      return { ...s, [qitem.qitemId]: [...cur, option] };
    });
  };

  /* 분기 이동은 이미 받아 온 문항 구성만 보면 되므로 서버 왕복 없이 화면에서 계산한다 */
  const nextPage = () => {
    for (const q of pageQitems) {
      if (q.qitemTypeCd === "SINGLE_CHOICE" && q.branchMap) {
        const picked = sel[q.qitemId]?.[0];
        if (picked !== undefined && q.branchMap[picked] !== undefined) {
          return q.branchMap[picked];
        }
      }
    }
    return Math.min(pages.length - 1, page + 1);
  };

  /*
   * 전이 결과 처리는 한 곳에 모은다 — 마감·접수 시작·마감 철회가 전부 같은 API라 성공 후
   * 갱신 방법이 갈리면 어떤 화면은 최신, 어떤 화면은 옛 상태를 그리게 된다.
   *
   * 갱신은 낙관적 업데이트가 아니라 **재조회**다. 응답이 formSttsCd만이 아니라 receiptStatus·
   * 접수 기간·수정 일시까지 바꾸고, 그 값들은 서버의 Clock 기준이라 화면이 미리 만들어 낼 수
   * 없다. 목록 화면도 같은 이유로 재조회를 쓴다(#7에서 정한 방식).
   *
   * 전이표 밖(stale)도 성공과 똑같이 다시 불러온다 — 그 오류의 뜻이 "화면이 낡았다"이므로
   * 여기서 할 일은 사과가 아니라 최신 상태를 가져오는 것이다.
   */
  const applyStatusChange = async (run: () => Promise<FormStatusChange>) => {
    const { outcome, message } = await run();
    if (outcome === "busy") return;

    flash(message);
    if (outcome === "changed" || outcome === "stale") reload();
    else if (outcome === "missing") router.push(ROUTES.forms);
  };

  const startReceipt = () => void applyStatusChange(() => status.open(form.formId));

  const confirmClose = () =>
    void applyStatusChange(async () => {
      const change = await status.close(form.formId);
      // 요청이 끝난 뒤에 닫는다 — 먼저 닫으면 실패했을 때 무엇을 하다 실패했는지가 사라진다
      if (change.outcome !== "busy") setCloseSheetOpen(false);
      return change;
    });

  /*
   * 복제 후에는 사본의 **편집 화면**으로 보낸다.
   *
   * 사본은 DRAFT이고 라벨도 접수 기간도 승계하지 않으므로(서버 #32) 복제 직후에 반드시 손봐야
   * 할 것이 남는다. 예전처럼 토스트만 띄우면 사용자는 방금 만든 사본을 목록에서 스스로 찾아야
   * 했고, 목록은 서버에서 오므로 재조회 전까지는 거기 있지도 않았다.
   */
  const runDuplicate = async () => {
    const { formId: copyFormId, message } = await duplication.duplicate(form.formId);
    if (!message) return;

    flash(message);
    if (copyFormId) router.push(ROUTES.formEdit(copyFormId));
  };

  /*
   * '템플릿으로 저장' — 복제와 다른 조작이라 버튼도 따로 둔다 (#134).
   *
   * 서버가 저장하는 것은 **이 폼에 지금 저장돼 있는 문항 구성**이다. 상세 화면은 서버에서 받은
   * 값을 그대로 보고 있으므로 화면과 저장되는 내용이 어긋날 여지가 없다 — 편집 화면에서는
   * 초안이 아직 안 나갔을 수 있어 먼저 저장을 끝낸다.
   */
  const saveAsTemplate = async (input: { tmplNm: string; tmplExpln: string }) => {
    const { formTmplId, message } = await templateSave.save(form.formId, input);
    if (!message) return;

    flash(message);
    if (formTmplId) setTemplateSheetOpen(false);
  };

  const publicUrl = publicFormUrl(form.formId);
  const copyLink = () => {
    navigator.clipboard?.writeText(publicUrl);
    flash("링크를 복사했습니다");
  };

  return (
    <>
      <PageHeader
        title="폼 상세"
        subtitle={`폼 #${form.formId}`}
        showBack
        action={{
          label: "응답",
          onClick: () => router.push(ROUTES.responses(form.formId)),
        }}
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card>
              {/* 375px에서 배지가 둘로 늘면 한 줄에 들어가지 않는다 — 접히게 둔다 */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {form.sysYn && (
                  <Badge tone={SYSTEM_FORM_BADGE.tone}>{SYSTEM_FORM_BADGE.label}</Badge>
                )}
                <span className="font-mono text-[13px] text-n500">
                  폼 #{form.formId}
                </span>
              </div>
              <div className="mt-2 text-[23px] font-medium">{form.formTtlNm}</div>
              <KeyValueGrid
                className="mt-4"
                labelWidth={90}
                items={[
                  { k: FIELD_LABEL.receiptStartAt, v: formatDt(form.rcptBgngDt) || "미설정" },
                  { k: FIELD_LABEL.receiptEndAt, v: formatDt(form.rcptEndDt) || "미설정" },
                  /*
                   * 문항 버전은 서버가 줄 때만 그린다. 값이 없는데 '1'로 채우면 아직 한 번도
                   * 바꾸지 않은 폼처럼 보이는데, 그것은 웹이 알 수 없는 사실이다.
                   */
                  ...(form.qitemVer !== null
                    ? [{ k: FIELD_LABEL.qitemVersion, v: `v${form.qitemVer}` }]
                    : []),
                  // 서버가 mbr을 조인해 준 이름 — 회원 목록을 따로 뒤지지 않는다
                  { k: FIELD_LABEL.creator, v: form.creatr.mbrNm },
                  { k: FIELD_LABEL.createdAt, v: formatYmd(form.crtDt) },
                  { k: FIELD_LABEL.updatedAt, v: formatYmd(form.mdfcnDt) },
                ]}
              />
              {form.labels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-[6px]">
                  {form.labels.map((l) => (
                    <Pill key={l.formLblId} tone="blue">
                      {l.lblNm}
                    </Pill>
                  ))}
                </div>
              )}
              {/*
                시스템 폼 안내.
                **잠긴 것만 말하지 않는다** — 그러면 폼 전체가 굳은 줄 알고 아무도 손대지
                않는다. 실제로 막히는 것은 삭제와 시스템이 쓰는 문항뿐이라, 회차마다 바꾸는
                값들이 열려 있다는 사실을 같은 상자에 적는다 (권한 트리 화면과 같은 방식).

                이 화면에는 삭제 버튼이 없어(서버에도 폼 삭제 경로가 없다) 잠글 버튼 대신
                안내가 그 자리를 대신한다.
              */}
              {form.sysYn && (
                <div className="mt-3 rounded-[12px] bg-bg px-[14px] py-[10px] text-[13px] leading-[1.6] text-n400">
                  <Badge tone={SYSTEM_FORM_BADGE.tone}>{SYSTEM_FORM_BADGE.label}</Badge>{" "}
                  {SYSTEM_FORM_DELETE_LOCKED}. {SYSTEM_FORM_OPEN_PARTS}.
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {/* 권한이 없어도 감추지 않고 잠근다 — 근거는 features/auth/model/use-can.ts */}
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={!canWrite}
                  title={canWrite ? undefined : NO_WRITE}
                  onClick={() => router.push(ROUTES.formEdit(form.formId))}
                >
                  수정
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={duplication.pending || !canWrite}
                  /* 시스템 폼도 복제는 열려 있다 — 사본이 일반 폼이 된다는 것만 미리 알린다 */
                  title={
                    !canWrite
                      ? NO_WRITE
                      : form.sysYn
                        ? SYSTEM_FORM_DUPLICATE_NOTE
                        : undefined
                  }
                  onClick={() => void runDuplicate()}
                >
                  {duplication.pending ? "복제하는 중…" : "복제"}
                </Button>
              </div>
              {/*
                템플릿 저장은 템플릿 API라 요구 권한이 폼 편집과 같은 FORM_WRITE지만, 서버가
                거는 곳이 다르므로(FormTemplateController) 사유 문구도 그쪽 것을 쓴다.
              */}
              <Button
                variant="ghost"
                className="mt-2 w-full"
                disabled={!canWrite || templateSave.pending}
                title={canWrite ? undefined : NO_TEMPLATE_WRITE}
                onClick={() => setTemplateSheetOpen(true)}
              >
                템플릿으로 저장
              </Button>
              <div className="mt-3 flex items-center rounded-[12px] border border-line p-3">
                <div className="text-[14.5px]">접수 상태 변경</div>
                <div className="flex-1" />
                {/*
                  버튼 문구·활성은 파생값이 아니라 formSttsCd로 고른다 — 전이표가 그 값으로
                  정의돼 있어서, receiptStatus로 고르면 기간이 끝난(EXPIRED) 폼은 상태가 아직
                  OPEN인데 '접수 시작'이 떠 400을 받는다.
                */}
                <button
                  type="button"
                  disabled={status.pending || !canChangeStatus}
                  title={canChangeStatus ? undefined : NO_STATUS_CHANGE}
                  onClick={
                    form.formSttsCd === "OPEN"
                      ? () => setCloseSheetOpen(true)
                      : startReceipt
                  }
                  className="cursor-pointer rounded-[10px] border border-line-strong bg-bg px-3 py-[6px] text-[14px] hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {form.formSttsCd === "OPEN" ? "마감" : "접수 시작"}
                </button>
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">공개 링크</SectionLabel>
              <div className="rounded-[10px] bg-[#f9fafb] p-3 text-[14px] break-all text-accent">
                {publicUrl}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => router.push(ROUTES.publicForm(form.formId))}>
                  링크 열기
                </Button>
                <Button variant="ghost" onClick={copyLink}>
                  링크 복사
                </Button>
              </div>
              <div className="mt-2 text-[13px] text-n500">
                공개 링크는 폼 ID 기준으로 고정됩니다.
              </div>
            </Card>

            <Card>
              <SectionLabel className="mb-3">응답 요약</SectionLabel>
              {/* 서버 집계값 — 작성 중(DRAFT) 응답은 어느 칸에도 들어가지 않는다 */}
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                <StatBox label="전체" value={summary.total} />
                <StatBox label="제출" value={summary.submitted} />
                {/* 수정요청은 응답자의 차례로 넘어간 것이라 결론 둘과 칸을 나눈다 (#133) */}
                <StatBox label="수정요청" value={summary.changesRequested} />
                <StatBox label="승인" value={summary.accepted} tone="accent" />
                <StatBox label="반려" value={summary.rejected} tone="danger" />
              </div>
              <Button
                className="mt-3"
                onClick={() => router.push(ROUTES.responses(form.formId))}
              >
                응답 보기
              </Button>
            </Card>
          </div>

          <Card>
            <SectionLabel className="mb-3">문항 미리보기</SectionLabel>
            <div className="mb-3 flex flex-wrap gap-[6px]">
              {pages.map((p, i) => (
                <Chip key={i} active={page === i} onClick={() => setPage(i)}>
                  {i + 1}. {p.pageTtl}
                </Chip>
              ))}
            </div>
            <div className="rounded-[10px] bg-[#f9fafb] p-3">
              <div className="text-[12.5px] text-n500">
                {page + 1} / {pages.length} 페이지
              </div>
              <div className="mt-1 text-[18px] font-semibold">
                {pages[page]?.pageTtl}
              </div>
              {pages[page]?.pageDescCn && (
                <div className="mt-1 text-[13.5px] whitespace-pre-line text-n400">
                  {pages[page].pageDescCn}
                </div>
              )}
            </div>
            <div className="mt-2">
              {pageQitems.length === 0 ? (
                <div className="py-5 text-center text-[14.5px] text-n500">
                  이 페이지에는 문항이 없습니다.
                </div>
              ) : (
                pageQitems.map((q) => (
                  <QitemPreview
                    key={q.qitemId}
                    qitem={q}
                    sel={sel[q.qitemId] ?? []}
                    onPick={(o) => pick(q, o)}
                    pages={pages}
                  />
                ))
              )}
            </div>
            <div className="mt-4 flex max-w-[420px] gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                이전 페이지
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                disabled={page >= pages.length - 1}
                onClick={() => setPage(nextPage())}
              >
                다음 페이지
              </Button>
            </div>
          </Card>
        </div>
      </PageBody>

      <FormCloseSheet
        open={closeSheetOpen}
        formTtlNm={form.formTtlNm}
        rcptEndDt={form.rcptEndDt}
        responseCount={form.responseCount}
        pending={status.pending}
        onClose={() => setCloseSheetOpen(false)}
        onConfirm={confirmClose}
      />

      <SaveAsTemplateSheet
        open={templateSheetOpen}
        formTtlNm={form.formTtlNm}
        pending={templateSave.pending}
        onClose={() => setTemplateSheetOpen(false)}
        onSave={(input) => void saveAsTemplate(input)}
      />
    </>
  );
}

/**
 * 폼 상세 — 목록을 거치지 않고 단건 API로 받는다.
 *
 * 예전에는 목 스토어의 전체 목록에서 find()로 골랐다. 목록 응답에는 문항 구성(qitemCpstCn)이
 * 실리지 않으므로 그 방식은 서버 연동에서 성립하지 않고, URL로 바로 들어온 경우 목록 자체가
 * 없어 "폼을 찾을 수 없습니다"가 떴다.
 */
export function FormDetailPage({ formId }: { formId: number }) {
  const { form, status, errorMessage, reload } = useFormDetail(formId);

  // 상태 전이·복제 후 최신 값을 다시 받아 오는 통로 — 낙관적 업데이트를 쓰지 않는 이유는 위 주석
  if (status === "ready" && form) return <FormDetailContent form={form} reload={reload} />;

  return (
    <>
      <PageHeader title="폼 상세" showBack />
      <PageBody>
        {status === "loading" && <EmptyState message="불러오는 중…" />}
        {status === "not-found" && <EmptyState message="폼을 찾을 수 없습니다." />}
        {status === "error" && (
          <EmptyState
            message={errorMessage || "폼을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}
      </PageBody>
    </>
  );
}
