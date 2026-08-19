"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_ROLE_CLSF_CD, type RoleClassification } from "@/entities/role";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useRoleClassifications, type RoleClassificationField } from "@/features/role";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageBody,
  PageHeader,
  Segmented,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 역할 분류 관리 (/members/role-labels · #49 · 서버 #80).
 *
 * ── 조회는 열고 변경만 잠근다 ───────────────────────────────────
 * 분류 조회(GET)에는 서버가 권한을 걸지 않았고 생성·수정·삭제만 ROLE_MANAGE 를 요구한다 —
 * 역할 목록의 필터 칩이 이 값을 쓰기 때문이다. 그래서 **화면은 누구에게나 열되 변경 조작만
 * 잠근다**(views/form-labels 와 같은 방식 · 감추지 않고 잠그는 근거는 features/auth 의 use-can).
 * 역할 목록 쪽이 화면 전체를 닫는 것과 갈리는데, 그쪽은 조회부터 403 이라 열어 봐야 오류뿐이다.
 *
 * ── 분류 코드를 사용자가 입력한다 ───────────────────────────────
 * 프런트 채번(`CLSF_1`, `CLSF_2` …)을 제거했다. 그 코드는 서버에 없는 값이라 저장되는 순간
 * 역할과 연결할 수 없었고, 무엇보다 `role_clsf_cd` 는 데이터사전의 표준코드 시트에 **사람이
 * 등재하는** 값이라 뜻이 읽혀야 한다 — 일련번호를 등재하면 시트가 아무것도 설명하지 못한다.
 * 형식(`^[A-Z][A-Z0-9_]{1,19}$`)은 서버가 400 으로 검증하고 훅이 같은 규칙으로 먼저 걸러 준다.
 *
 * ── 코드는 생성 후 바꿀 수 없다 ─────────────────────────────────
 * PK 이자 `role.role_clsf_cd` 가 NOT NULL FK 로 가리키는 값이라 수정 요청 본문에 아예 없다.
 * 바꾸는 경로는 '새로 만들고 → 역할을 옮기고 → 기존 것을 지운다' 하나뿐이다.
 *
 * ── SYSTEM 분류는 삭제·이름 변경만 잠긴다 (ssccops#87 D-004) ─────
 * 서버가 잠그는 것은 그 둘뿐이고 **표시 순번은 SYSTEM 도 바꿀 수 있다** —
 * RoleClassificationServiceImpl 이 이름이 실제로 달라졌을 때만 409 를 던지고, 순번은 그대로
 * 반영한다("목록에서 몇 번째로 그릴지일 뿐이라 무엇도 깨뜨리지 않는다"). 그런데 화면은 수정
 * 버튼 자체를 잠가 편집에 들어가지도 못하게 하고 있었다 — 웹이 서버보다 더 잠그면 서버가
 * 열어 둔 조작에 닿을 길이 사라진다. 이제 편집은 열고 **이름 칸만** 잠근다.
 *
 * ── 사용 중인 분류 삭제 ─────────────────────────────────────────
 * `roleCount` 가 0 이 아니면 화면이 먼저 막지만 **판정 근거는 서버**다(409
 * ROLE_CLASSIFICATION_IN_USE). 화면이 들고 있는 숫자는 다른 사람이 방금 역할을 이 분류로
 * 옮겼으면 이미 낡았고, 그때는 서버 문구를 그대로 보여 준 뒤 목록을 다시 받는다.
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE =
  "역할 분류를 바꿀 권한(ROLE_MANAGE)이 없습니다 — 조회만 할 수 있습니다";
const SYSTEM_NAME_LOCKED =
  "SYSTEM 분류는 최고관리자 역할이 매달린 분류라 이름을 바꿀 수 없습니다 — 표시 순번은 바꿀 수 있습니다";
const SYSTEM_DELETE_LOCKED =
  "SYSTEM 분류는 최고관리자 역할이 매달린 분류라 지울 수 없습니다";

/* 오류 문구를 입력란에 묶어 준다 — 색과 위치만으로는 어느 칸의 이야기인지 전달되지 않는다 */
const ADD_ERROR_ID = "role-clsf-add-error";
const ROW_ERROR_ID = "role-clsf-row-error";

export function RoleLabelsPage() {
  const router = useRouter();
  const admin = useRoleClassifications();
  const canManage = useCan(CAPABILITY.ROLE_MANAGE);

  const [newCd, setNewCd] = useState("");
  const [newNm, setNewNm] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editNm, setEditNm] = useState("");
  const [editSeqno, setEditSeqno] = useState("");

  /*
   * 훅은 마지막 변이의 실패 사유 하나만 들고 있다(어느 조작이 실패했든 사용자가 볼 문장은
   * 하나뿐이다). 그 한 줄을 **어디에** 붙일지는 화면이 정한다 — 추가 실패면 입력란 아래,
   * 행 조작 실패면 표 위다. 한자리에만 두면 표 아래쪽 행의 삭제가 실패했을 때 사유가 화면
   * 밖에 뜨거나, 반대로 입력란이 자기 잘못도 아닌데 빨갛게 된다.
   */
  const [errorScope, setErrorScope] = useState<"add" | "row">("add");
  const addError = Boolean(admin.mutationErrorMessage) && errorScope === "add";
  const rowError = Boolean(admin.mutationErrorMessage) && errorScope === "row";

  /*
   * `aria-invalid` 는 **틀린 칸에만** 건다.
   *
   * 예전에는 "오류가 있다"는 사실만으로 코드·이름 두 칸에 함께 걸었다. 코드 형식 하나가
   * 틀려도 보조기술에는 "두 칸이 잘못됐다"로 전달됐고, 그러면서 정작 이유를 담은 문장은
   * 어느 칸에도 묶여 있지 않아 읽히지 않았다 (ssccops#87 D-003).
   */
  const invalidField = (scope: boolean, field: RoleClassificationField) =>
    scope && admin.mutationErrorField === field;

  const add = async () => {
    const roleClsfNm = newNm.trim();
    setErrorScope("add");
    if (await admin.create({ roleClsfCd: newCd, roleClsfNm: newNm })) {
      setNewCd("");
      setNewNm("");
      flash(`${roleClsfNm} 분류 추가됨`);
    }
  };

  const saveEdit = async (c: RoleClassification) => {
    const nextNm = editNm.trim();
    const nextSeqno = editSeqno.trim();
    setErrorScope("row");
    if (await admin.update(c.roleClsfCd, { roleClsfNm: editNm, indctSeqno: editSeqno })) {
      setEditing(null);
      /* 이름과 순번 중 실제로 달라진 것만 알린다 — 안 바꾼 값을 되읊으면 무엇이 바뀌었는지 흐려진다 */
      const changes = [
        nextNm === c.roleClsfNm ? "" : `${c.roleClsfNm} → ${nextNm}`,
        !nextSeqno || Number(nextSeqno) === c.indctSeqno
          ? ""
          : `${FIELD_LABEL.displayOrder} ${c.indctSeqno} → ${nextSeqno}`,
      ].filter(Boolean);
      flash(changes.length > 0 ? changes.join(" · ") : `${c.roleClsfNm} 그대로 저장됨`);
    }
  };

  const remove = async (c: RoleClassification) => {
    setErrorScope("row");
    if (await admin.remove(c.roleClsfCd)) flash(`${c.roleClsfNm} 삭제됨`);
  };

  const startEdit = (c: RoleClassification) => {
    admin.clearMutationError();
    setEditing(c.roleClsfCd);
    setEditNm(c.roleClsfNm);
    setEditSeqno(String(c.indctSeqno));
  };

  return (
    <>
      <PageHeader title="역할 관리" subtitle="분류 추가 · 이름 변경 · 삭제" />
      <PageBody>
        <div className="mb-4 flex items-center gap-3">
          <Segmented
            options={["역할 목록", "역할 분류"] as const}
            value="역할 분류"
            onChange={(v) => {
              if (v === "역할 목록") router.push(ROUTES.roles);
            }}
            className="w-[400px]"
          />
        </div>

        {/*
          코드와 이름을 나란히 받는다. 코드는 뜻이 읽히는 짧은 대문자 문자열이라 폭을 좁게 두고
          형식을 placeholder 로 보여 준다 — 규칙을 모르면 첫 시도가 400 으로 돌아온다.
        */}
        <div className="mb-4 max-w-[820px]">
          {/* 코드 220px + 이름 240px + 추가 버튼은 좁은 화면에 한 줄로 들어가지 않는다 —
              세로로 쌓고 lg 부터 예전처럼 한 줄에 나란히 둔다 */}
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <TextField
              value={newCd}
              onChange={(e) => setNewCd(e.target.value)}
              disabled={!canManage}
              invalid={invalidField(addError, "roleClsfCd")}
              aria-describedby={addError ? ADD_ERROR_ID : undefined}
              placeholder={`${FIELD_LABEL.roleClassificationCode} (예: PROJECT)`}
              /* iOS Safari 는 16px 미만 입력란에 포커스가 가면 페이지를 통째로 확대한다 */
              className="w-full font-mono text-[16px] lg:w-[220px] lg:text-[15.5px]"
            />
            <TextField
              value={newNm}
              onChange={(e) => setNewNm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canManage) void add();
              }}
              disabled={!canManage}
              invalid={invalidField(addError, "roleClsfNm")}
              aria-describedby={addError ? ADD_ERROR_ID : undefined}
              placeholder={`새 ${FIELD_LABEL.roleClassificationName}`}
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
          {/*
            role="alert" 를 붙이는 것은 이 줄이 조작에 대한 **응답**이기 때문이다. 붙지 않으면
            보조기술 사용자에게는 아무 일도 일어나지 않은 것과 같다 — 화면을 보는 사용자에게도
            바로 아래 상시 안내문과 문장이 비슷하면 같은 일이 일어난다(그래서 훅의 문구가
            실패 사실로 시작한다).
          */}
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
            {FIELD_LABEL.roleClassificationCode}는 대문자로 시작하고 대문자·숫자·밑줄만
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
            message={admin.errorMessage || "역할 분류를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.classifications.length === 0 ? (
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
                  분류 표는 순번·코드·이름·관리 네 열이 서로를 설명하는 값이라 카드로 쪼개면
                  '어느 분류의 수정 버튼인지'가 흐려진다(GridTable 을 쓰지 않고 직접 그린
                  이유도 인라인 편집 때문이다). 좁은 화면에서는 표를 바꾸는 대신 **이 표만**
                  가로로 스크롤시킨다 — 화면 전체가 밀리면 위의 탭·추가 줄까지 따라 밀린다.
                  min-w 는 1fr(이름) 열이 짜부라지지 않을 만큼만 잡고 lg 에서 되돌린다.
                */}
                <div className="overflow-x-auto">
                <div className="grid min-w-[600px] grid-cols-[100px_180px_1fr_130px] lg:min-w-0">
                  {[
                    FIELD_LABEL.displayOrder,
                    FIELD_LABEL.roleClassificationCode,
                    FIELD_LABEL.roleClassificationName,
                    "관리",
                  ].map((h) => (
                    <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                      {h}
                    </div>
                  ))}
                  {admin.classifications.map((c) => {
                    const isEditing = editing === c.roleClsfCd;
                    const isSystem = c.roleClsfCd === SYSTEM_ROLE_CLSF_CD;
                    const inUse = c.roleCount > 0;

                    /*
                     * 편집 진입을 막는 이유는 이제 권한 하나뿐이다. SYSTEM 은 편집에 들어간
                     * 뒤 이름 칸에서만 잠긴다 — 순번은 서버가 허용하므로 여기서 막을 근거가 없다.
                     */
                    const editLocked = canManage ? "" : NO_MANAGE;
                    const removeLocked = !canManage
                      ? NO_MANAGE
                      : isSystem
                        ? SYSTEM_DELETE_LOCKED
                        : inUse
                          ? `${c.roleCount}개 역할이 이 분류를 쓰고 있습니다 — 다른 분류로 먼저 옮겨주세요`
                          : "";

                    return (
                      <div key={c.roleClsfCd} className="contents">
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
                              aria-label={`${c.roleClsfNm} ${FIELD_LABEL.displayOrder}`}
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
                            {c.roleClsfCd}
                          </span>
                        </div>
                        <div className="border-t border-black/5 py-3 text-[15px]">
                          {isEditing ? (
                            <>
                              <input
                                value={editNm}
                                onChange={(e) => setEditNm(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void saveEdit(c);
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                autoFocus={!isSystem}
                                disabled={isSystem}
                                title={isSystem ? SYSTEM_NAME_LOCKED : undefined}
                                aria-label={`${c.roleClsfCd} ${FIELD_LABEL.roleClassificationName}`}
                                aria-invalid={
                                  invalidField(rowError, "roleClsfNm") || undefined
                                }
                                aria-describedby={rowError ? ROW_ERROR_ID : undefined}
                                className="w-[200px] rounded-[8px] border border-accent bg-bg px-2 py-1 text-[16px] outline-none disabled:cursor-not-allowed disabled:border-line disabled:opacity-45 lg:text-[14.5px]"
                              />
                              {isSystem && (
                                <span className="ml-2 text-[13px] text-n500">
                                  이름은 잠겨 있고 {FIELD_LABEL.displayOrder}만 바꿉니다
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{c.roleClsfNm}</span>
                              <span className="ml-2 text-[13px] text-n500">
                                {c.roleCount}개 역할
                              </span>
                              {isSystem && (
                                <Badge tone="outline" className="ml-2">
                                  이름 잠김
                                </Badge>
                              )}
                            </>
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
                                disabled={Boolean(editLocked) || admin.busy}
                                title={editLocked || undefined}
                                className="cursor-pointer text-accent disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(c)}
                                disabled={Boolean(removeLocked) || admin.busy}
                                title={removeLocked || undefined}
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
          역할이 하나라도 지정된 분류는 삭제할 수 없습니다 — 역할을 다른 분류로 먼저
          옮겨주세요. 분류명을 바꿔도 {FIELD_LABEL.roleClassificationCode}는 그대로
          유지됩니다. {FIELD_LABEL.displayOrder}은 목록을 그리는 순서이며 비워 두면 지금
          값을 그대로 씁니다.
          <br />
          <strong>SYSTEM</strong> 분류는 최고관리자 역할이 매달린 분류라 이름 변경·삭제가
          잠겨 있습니다 — {FIELD_LABEL.displayOrder}은 바꿀 수 있습니다.
        </div>
      </PageBody>
    </>
  );
}
