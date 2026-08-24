"use client";

import { useState } from "react";
import type { EventCategory } from "@/entities/event";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useEventCategories, type EventCategoryField } from "@/features/event";
import { FIELD_LABEL } from "@/shared/config/labels";
import {
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 행사 분류 관리 (/events/categories · #136 · D13).
 *
 * 구조의 근거는 views/role-labels(역할 분류 관리)와 같다 — 코드·이름을 나란히 받아 추가하고,
 * 행에서 이름·표시 순번을 인라인으로 고친다. 갈리는 점 둘:
 * - **조회부터 EVENT_MANAGE다**(서버 판정 · 역할 분류는 조회가 열려 있다). 메뉴가 이미
 *   게이트되지만 주소로 직접 들어온 경우를 위해 화면 안의 변경 조작도 같은 권한으로 잠근다.
 * - **사용 중 집계가 응답에 없다.** 그래서 삭제 버튼을 미리 잠글 근거가 없고, 사용 중인
 *   분류의 삭제는 서버가 409 EVENT_CLASSIFICATION_IN_USE로 거절한 뒤 문구로 안내한다.
 *
 * 분류 코드는 생성 후 바꿀 수 없다 — PK이자 행사가 FK로 가리키는 값이라 수정 요청 본문에
 * 아예 없다(역할 분류와 같은 판단).
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE =
  "행사 분류를 바꿀 권한이 없습니다 — 행사 관리(EVENT_MANAGE) 권한이 필요합니다";

/* 오류 문구를 입력란에 묶어 준다 — 색과 위치만으로는 어느 칸의 이야기인지 전달되지 않는다 */
const ADD_ERROR_ID = "event-clsf-add-error";
const ROW_ERROR_ID = "event-clsf-row-error";

export function EventCategoriesPage() {
  const admin = useEventCategories();
  const canManage = useCan(CAPABILITY.EVENT_MANAGE);

  const [newCd, setNewCd] = useState("");
  const [newNm, setNewNm] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editNm, setEditNm] = useState("");
  const [editSeqno, setEditSeqno] = useState("");

  /* 훅은 마지막 변이의 실패 사유 하나만 든다 — 어디에 붙일지는 화면이 정한다 (role-labels와 같다) */
  const [errorScope, setErrorScope] = useState<"add" | "row">("add");
  const addError = Boolean(admin.mutationErrorMessage) && errorScope === "add";
  const rowError = Boolean(admin.mutationErrorMessage) && errorScope === "row";

  /* aria-invalid는 틀린 칸에만 건다 (ssccops#87 D-003) */
  const invalidField = (scope: boolean, field: EventCategoryField) =>
    scope && admin.mutationErrorField === field;

  const add = async () => {
    const eventClsfNm = newNm.trim();
    setErrorScope("add");
    if (await admin.create({ eventClsfCd: newCd, eventClsfNm: newNm })) {
      setNewCd("");
      setNewNm("");
      flash(`${eventClsfNm} 분류 추가됨`);
    }
  };

  const saveEdit = async (c: EventCategory) => {
    const nextNm = editNm.trim();
    const nextSeqno = editSeqno.trim();
    setErrorScope("row");
    if (await admin.update(c.eventClsfCd, { eventClsfNm: editNm, indctSeqno: editSeqno })) {
      setEditing(null);
      /* 실제로 달라진 것만 알린다 — 안 바꾼 값을 되읊으면 무엇이 바뀌었는지 흐려진다 */
      const changes = [
        nextNm === c.eventClsfNm ? "" : `${c.eventClsfNm} → ${nextNm}`,
        !nextSeqno || Number(nextSeqno) === c.indctSeqno
          ? ""
          : `${FIELD_LABEL.displayOrder} ${c.indctSeqno} → ${nextSeqno}`,
      ].filter(Boolean);
      flash(changes.length > 0 ? changes.join(" · ") : `${c.eventClsfNm} 그대로 저장됨`);
    }
  };

  const remove = async (c: EventCategory) => {
    setErrorScope("row");
    if (await admin.remove(c.eventClsfCd)) flash(`${c.eventClsfNm} 삭제됨`);
  };

  const startEdit = (c: EventCategory) => {
    admin.clearMutationError();
    setEditing(c.eventClsfCd);
    setEditNm(c.eventClsfNm);
    setEditSeqno(String(c.indctSeqno));
  };

  return (
    <>
      <PageHeader title="행사 분류 관리" subtitle="분류 추가 · 이름 변경 · 삭제" />
      <PageBody>
        <div className="mb-4 max-w-[820px]">
          {/* 코드+이름+추가는 좁은 화면에 한 줄로 들어가지 않는다 — 세로로 쌓고 lg부터 나란히 */}
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <TextField
              value={newCd}
              onChange={(e) => setNewCd(e.target.value)}
              disabled={!canManage}
              invalid={invalidField(addError, "eventClsfCd")}
              aria-describedby={addError ? ADD_ERROR_ID : undefined}
              placeholder={`${FIELD_LABEL.eventClassificationCode} (예: RECRUIT)`}
              /* iOS Safari는 16px 미만 입력란에 포커스가 가면 페이지를 통째로 확대한다 (#105) */
              className="w-full font-mono text-[16px] lg:w-[220px] lg:text-[15.5px]"
            />
            <TextField
              value={newNm}
              onChange={(e) => setNewNm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canManage) void add();
              }}
              disabled={!canManage}
              invalid={invalidField(addError, "eventClsfNm")}
              aria-describedby={addError ? ADD_ERROR_ID : undefined}
              placeholder={`새 ${FIELD_LABEL.eventClassificationName}`}
              className="w-full text-[16px] lg:w-[240px] lg:text-[15.5px]"
            />
            <Button
              onClick={() => void add()}
              disabled={admin.busy || !canManage}
              title={canManage ? undefined : NO_MANAGE}
            >
              {admin.busy ? "처리 중…" : "추가"}
            </Button>
          </div>
          {/* role="alert" — 이 줄은 조작에 대한 응답이다 (role-labels와 같은 판단) */}
          {addError && (
            <div
              id={ADD_ERROR_ID}
              role="alert"
              className="mt-[6px] text-[13.5px] leading-[1.6] text-danger"
            >
              {admin.mutationErrorMessage}
            </div>
          )}
          <div className="mt-[6px] text-[13px] leading-[1.6] text-n500">
            {FIELD_LABEL.eventClassificationCode}는 대문자로 시작하고 대문자·숫자·밑줄만
            2~20자로 씁니다. <strong>코드는 만든 뒤에 바꿀 수 없습니다</strong> — 이름과{" "}
            {FIELD_LABEL.displayOrder}만 바꿀 수 있습니다. 새 코드는 데이터사전의 표준코드
            시트에도 등재해주세요.
          </div>
          {!canManage && (
            <div className="mt-[6px] text-[13px] text-n500">{NO_MANAGE}</div>
          )}
        </div>

        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "행사 분류를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.categories.length === 0 ? (
            <EmptyState message="등록된 분류가 없습니다." />
          ) : (
            <>
              {rowError && (
                <div
                  id={ROW_ERROR_ID}
                  role="alert"
                  className="mb-3 max-w-[820px] text-[13.5px] leading-[1.6] text-danger"
                >
                  {admin.mutationErrorMessage}
                </div>
              )}
              <Card className="max-w-[820px] px-5 pt-4 pb-[6px]">
                {/*
                  순번·코드·이름·관리 네 열이 서로를 설명하는 값이라 GridTable(카드 전환) 대신
                  직접 그린다 — 인라인 편집 때문이기도 하다. 좁은 화면에서는 이 표만 가로로
                  스크롤시킨다 (role-labels와 같은 판단).
                */}
                <div className="overflow-x-auto">
                <div className="grid min-w-[600px] grid-cols-[100px_180px_1fr_130px] lg:min-w-0">
                  {[
                    FIELD_LABEL.displayOrder,
                    FIELD_LABEL.eventClassificationCode,
                    FIELD_LABEL.eventClassificationName,
                    "관리",
                  ].map((h) => (
                    <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                      {h}
                    </div>
                  ))}
                  {admin.categories.map((c) => {
                    const isEditing = editing === c.eventClsfCd;

                    return (
                      <div key={c.eventClsfCd} className="contents">
                        <div className="border-t border-black/5 py-3 text-[15px]">
                          {isEditing ? (
                            <input
                              value={editSeqno}
                              onChange={(e) => setEditSeqno(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEdit(c);
                                if (e.key === "Escape") setEditing(null);
                              }}
                              inputMode="numeric"
                              aria-label={`${c.eventClsfNm} ${FIELD_LABEL.displayOrder}`}
                              aria-invalid={
                                invalidField(rowError, "indctSeqno") || undefined
                              }
                              aria-describedby={rowError ? ROW_ERROR_ID : undefined}
                              className="w-[64px] rounded-[8px] border border-accent bg-bg px-2 py-1 text-[16px] outline-none lg:text-[14.5px]"
                            />
                          ) : (
                            c.indctSeqno
                          )}
                        </div>
                        <div className="border-t border-black/5 py-3">
                          <span className="font-mono text-[13.5px] text-n400">
                            {c.eventClsfCd}
                          </span>
                        </div>
                        <div className="border-t border-black/5 py-3 text-[15px]">
                          {isEditing ? (
                            <input
                              value={editNm}
                              onChange={(e) => setEditNm(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEdit(c);
                                if (e.key === "Escape") setEditing(null);
                              }}
                              autoFocus
                              aria-label={`${c.eventClsfCd} ${FIELD_LABEL.eventClassificationName}`}
                              aria-invalid={
                                invalidField(rowError, "eventClsfNm") || undefined
                              }
                              aria-describedby={rowError ? ROW_ERROR_ID : undefined}
                              className="w-[200px] rounded-[8px] border border-accent bg-bg px-2 py-1 text-[16px] outline-none lg:text-[14.5px]"
                            />
                          ) : (
                            <span className="font-semibold">{c.eventClsfNm}</span>
                          )}
                        </div>
                        <div className="flex gap-3 border-t border-black/5 py-3 text-[14px]">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit(c)}
                                disabled={admin.busy}
                                className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="cursor-pointer text-n400"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                disabled={!canManage || admin.busy}
                                title={canManage ? undefined : NO_MANAGE}
                                className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                수정
                              </button>
                              {/*
                                사용 중 여부는 응답에 없어 미리 잠글 수 없다 — 사용 중이면
                                서버가 409로 거절하고 그 문구가 표 위(role="alert")에 뜬다.
                              */}
                              <button
                                type="button"
                                onClick={() => void remove(c)}
                                disabled={!canManage || admin.busy}
                                title={canManage ? undefined : NO_MANAGE}
                                className="cursor-pointer text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-n400"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </Card>
            </>
          ))}

        <div className="mt-3 max-w-[820px] text-[13.5px] leading-[1.7] text-n500">
          행사가 하나라도 쓰고 있는 분류는 삭제할 수 없습니다 — 행사의 분류를 먼저
          바꿔주세요. 분류명을 바꿔도 {FIELD_LABEL.eventClassificationCode}는 그대로
          유지됩니다. {FIELD_LABEL.displayOrder}은 목록을 그리는 순서이며 비워 두면 지금
          값을 그대로 씁니다.
        </div>
      </PageBody>
    </>
  );
}
