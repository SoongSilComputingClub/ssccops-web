"use client";

import { useState } from "react";
import { CAPABILITY } from "@/entities/session";
import type { SubWorkTypeSaveInput, SubWorkTypeSummary } from "@/entities/sub-work-type";
import { useCan } from "@/features/auth";
import { useSubWorkTypes } from "@/features/sub-work-type";
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
  TextArea,
  TextField,
  Toggle,
  flash,
} from "@/shared/ui";

/*
 * 하위 업무 유형 관리 (ssccops-server OPS-018 · OPS-019 · #34).
 *
 * 조회·저장·토글은 features/sub-work-type(useSubWorkTypes)이 전담한다. 이 파일은 표를 그리고
 * 폼 입력을 훅으로 넘기는 일만 한다.
 *
 * ── 목 스토어에서 옮겨 오며 화면이 달라진 곳 ─────────────────────
 * 1. **기준_금액 칸과 열을 뺐다.** crtr_amt·expnd_yn은 하위 업무 유형 API의 범위 밖이라
 *    서버가 받지도 내려주지도 않는다(위험도 판정 REQ-016이 붙을 때 열린다). 입력란만 남겨
 *    두면 사용자가 넣은 금액이 저장 없이 사라진다 — 값이 사라지는 칸보다 없는 칸이 낫다.
 * 2. **완료_점검_항목이 한 줄 입력에서 여러 줄로 바뀌었다.** 서버 계약이 배열이고(구분자를
 *    계약에 노출하지 않는다) 이 항목들은 하위 업무 등록 시 체크리스트 한 줄씩으로 복사된다.
 *    표의 '·' 연결은 표시 규칙일 뿐이라 입력에 그 구분자를 요구하지 않는다.
 * 3. **사용_여부 토글 열이 생겼다.** 유형은 하위 업무가 FK로 참조하므로 지우지 못한다 —
 *    삭제 대신 사용을 내리며, 그래서 목록에는 비활성 유형도 취소선으로 계속 보인다
 *    (되돌릴 수 있어야 한다). 라벨 관리 화면과 같은 축이다.
 *
 * ── 권한 (#29 · 서버 #9) ───────────────────────────────────────
 * 조회는 SUB_WORK_TYPE_READ(국장 이상), 등록·수정·사용 전환은 SUB_WORK_TYPE_MANAGE
 * (회장·부회장·총무)다. **목록은 보이는데 저장만 403인 상태가 정상적으로 존재한다.**
 * 그래서 화면은 열되 추가·수정·토글만 잠근다 — 유형별 승인 규칙은 하위 업무를 등록하는
 * 사람이라면 누구나 알아야 하는 기준정보라 표를 감추면 곤란하다.
 *
 * 잠금은 화면을 미리 막는 것이 아니라 겹쳐 두는 것이다. 권한이 방금 회수돼 잠기지 않은
 * 버튼을 눌렀다면 서버가 403으로 거절하고, 훅이 그 사유를 보여 주면서 세션을 다시 받아
 * 화면이 스스로 잠긴다 (syncSessionOnForbidden).
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE =
  "하위 업무 유형을 등록·수정할 권한이 없습니다 — 하위 업무 유형 관리(SUB_WORK_TYPE_MANAGE) 권한이 필요합니다";

interface Draft {
  typeName: string;
  approvalNeeded: boolean;
  /** 승인자 결재 권한 코드 (서버 #123) — 선택지는 서버가 내려준다 */
  authorizerAuthorityCode: string | null;
  minAgreeCountNeeded: boolean;
  minAgreeCount: number | null;
  /** 한 줄에 한 항목 — 저장할 때 배열로 끊는다 */
  completionCheckArticles: string;
}

/*
 * 승인자 기본값을 여기 박지 않는다(옛 "PRESIDENT") — 코드 어휘가 서버 데이터가 된 이상
 * 하드코딩이 곧 어긋날 자리다. 신규 폼을 열 때 서버가 준 선택지의 첫 항목으로 채운다.
 */
const EMPTY: Draft = {
  typeName: "",
  approvalNeeded: true,
  authorizerAuthorityCode: null,
  minAgreeCountNeeded: false,
  minAgreeCount: null,
  completionCheckArticles: "",
};

function toDraft(type: SubWorkTypeSummary): Draft {
  return {
    typeName: type.typeName,
    approvalNeeded: type.approvalNeeded,
    authorizerAuthorityCode: type.authorizerAuthorityCode,
    minAgreeCountNeeded: type.minAgreeCountNeeded,
    minAgreeCount: type.minAgreeCount,
    completionCheckArticles: type.completionCheckArticles.join("\n"),
  };
}

/*
 * 빈 줄은 여기서 버린다. 서버도 같은 정리를 하지만(joinCheckArticles) 그대로 보내면
 * 저장 직후 재조회에서 항목 수가 줄어 화면이 한 번 흔들린다.
 */
function toSaveInput(draft: Draft): SubWorkTypeSaveInput {
  return {
    typeName: draft.typeName,
    approvalNeeded: draft.approvalNeeded,
    authorizerAuthorityCode: draft.authorizerAuthorityCode,
    minAgreeCountNeeded: draft.minAgreeCountNeeded,
    minAgreeCount: draft.minAgreeCount,
    completionCheckArticles: draft.completionCheckArticles
      .split("\n")
      .map((article) => article.trim())
      .filter(Boolean),
  };
}

/** 최소_동의_수 표기 — 정족수 3인 / 단독 */
function agreeCountText(type: SubWorkTypeSummary): string {
  return type.minAgreeCountNeeded && type.minAgreeCount !== null
    ? `정족수 ${type.minAgreeCount}인`
    : "단독";
}

export function SubWorkTypeListPage() {
  const admin = useSubWorkTypes();
  /*
   * 조회와 관리를 서버가 다른 권한으로 나눠 두었다 (#29 · SubWorkTypeController) —
   * 목록은 SUB_WORK_TYPE_READ, 등록·수정·사용 전환은 SUB_WORK_TYPE_MANAGE 다.
   * 판정은 useCan 하나만 쓴다: 역할 이름이나 트리 펼침을 웹에서 다시 계산하지 않는다.
   */
  const canManage = useCan(CAPABILITY.SUB_WORK_TYPE_MANAGE);
  /** null=닫힘, 0=신규, n=해당 subWorkTypeId 수정 */
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const startEdit = (type?: SubWorkTypeSummary) => {
    setEditing(type ? type.subWorkTypeId : 0);
    setDraft(
      type
        ? toDraft(type)
        : {
            ...EMPTY,
            // 신규 폼의 승인자 기본값은 서버 선택지의 첫 항목이다 (선택지가 아직 없으면 미지정)
            authorizerAuthorityCode: admin.authorizerAuthorities[0]?.authrtCd ?? null,
          },
    );
    // 직전 저장의 오류 문구가 새로 연 폼에 남아 있으면 방금 입력이 잘못된 것처럼 보인다
    admin.clearSaveError();
  };

  const save = async () => {
    const typeName = draft.typeName.trim();
    const saved = await admin.save(editing ? editing : null, toSaveInput(draft));
    if (!saved) return;

    flash(editing ? `${typeName} 수정됨` : `${typeName} 추가됨`);
    setEditing(null);
  };

  return (
    <>
      <PageHeader title="하위 업무 유형 관리" subtitle="승인 규칙 기준정보" />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
          {/* 잠긴 버튼의 툴팁만으로는 왜 안 되는지 놓치기 쉬워 사유를 옆에 적는다 */}
          {!canManage && <div className="text-[13.5px] text-n500">{NO_MANAGE}</div>}
          <Button
            onClick={() => startEdit()}
            disabled={!canManage}
            title={canManage ? undefined : NO_MANAGE}
          >
            ＋ 하위 업무 유형 추가
          </Button>
        </div>

        {editing !== null && (
          <Card className="mb-4 shadow-[0_0_0_1px_#3182f6]">
            <SectionLabel className="mb-3">
              {editing ? "하위 업무 유형 수정" : "새 하위 업무 유형"}
            </SectionLabel>
            <Field label="유형_명" required>
              <TextField
                inset
                value={draft.typeName}
                onChange={(e) => setDraft((d) => ({ ...d, typeName: e.target.value }))}
                invalid={Boolean(admin.saveErrorMessage)}
                placeholder="예: 예산지출"
                className="max-w-[420px]"
              />
            </Field>
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] text-n400">승인_필요_여부</div>
              <div className="flex flex-wrap gap-[7px]">
                {["필요", "불필요"].map((v) => (
                  <Chip
                    key={v}
                    active={draft.approvalNeeded === (v === "필요")}
                    onClick={() =>
                      setDraft((d) => ({ ...d, approvalNeeded: v === "필요" }))
                    }
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </div>
            {/*
              승인이 불필요하면 승인자·의사결정 칸을 감춘다. 남은 값을 지우지는 않는다 —
              서버가 저장 시 정리하므로 실려 가도 무해하고, 지워 버리면 '필요'로 되돌렸을 때
              고르던 값이 사라진다.
            */}
            {draft.approvalNeeded && (
              <>
                <div className="mt-4">
                  <div className="mb-2 text-[13.5px] text-n400">승인자_결재_권한</div>
                  {/* 선택지·표시명 모두 서버가 준다 (서버 #123) — 권한 이름은 화면에서 바뀌는 운영 데이터다 */}
                  <div className="flex flex-wrap gap-[7px]">
                    {admin.authorizerAuthorities.map((option) => (
                      <Chip
                        key={option.authrtCd}
                        active={draft.authorizerAuthorityCode === option.authrtCd}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            authorizerAuthorityCode: option.authrtCd,
                          }))
                        }
                      >
                        {option.authrtNm}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-2 text-[13.5px] text-n400">최소_필요_동의_수</div>
                  <div className="flex flex-wrap items-center gap-[7px]">
                    {["단독", "정족수"].map((v) => (
                      <Chip
                        key={v}
                        active={draft.minAgreeCountNeeded === (v === "정족수")}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            minAgreeCountNeeded: v === "정족수",
                          }))
                        }
                      >
                        {v}
                      </Chip>
                    ))}
                    {draft.minAgreeCountNeeded && (
                      <>
                        <TextField
                          inset
                          value={draft.minAgreeCount ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              minAgreeCount: Number(e.target.value) || null,
                            }))
                          }
                          placeholder="3"
                          className="w-[64px] text-center"
                        />
                        <span className="text-[14px] text-n400">인 동의</span>
                      </>
                    )}
                  </div>
                  {/*
                    정족수 1은 단독과 다르다 — 단독은 승인자가 투표 없이 바로 누르고,
                    정족수 1은 다른 한 명의 찬성이 먼저 있어야 한다 (POL-007)
                  */}
                  <div className="mt-[6px] text-[12.5px] text-n500">
                    정족수는 승인자를 대체하지 않습니다. 찬성이 모여도 최종 승인은 승인자가
                    합니다.
                  </div>
                </div>
              </>
            )}
            <div className="mt-4">
              <Field label="완료_점검_항목_내용 (한 줄에 하나)">
                <TextArea
                  inset
                  value={draft.completionCheckArticles}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, completionCheckArticles: e.target.value }))
                  }
                  placeholder={"예: 영수증 첨부\n예산안 대비 확인"}
                />
              </Field>
            </div>
            {admin.saveErrorMessage && (
              <div className="mt-3 text-[13px] text-danger">{admin.saveErrorMessage}</div>
            )}
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void save()} disabled={admin.saving}>
                {admin.saving ? "저장 중…" : "저장"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                취소
              </Button>
            </div>
          </Card>
        )}

        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "하위 업무 유형을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.types.length === 0 ? (
            <EmptyState message="등록된 하위 업무 유형이 없습니다." />
          ) : (
            <>
              {admin.toggleErrorMessage && (
                <div className="mb-3 text-[13.5px] text-danger">
                  {admin.toggleErrorMessage}
                </div>
              )}
              {/*
                7열짜리 표라 375px에서는 열마다 40~50px밖에 남지 않는다. GridTable이 아니라
                손으로 짠 표여서 카드 전환이 따라오지 않으므로, 같은 방식(두 벌을 그리고
                hidden으로 가린다)을 여기서 되풀이한다 — 행이 `contents`라 행마다 박스가 없어
                CSS만으로는 카드로 바꿀 수 없고, 폭에 따라 한쪽만 렌더하면 서버 렌더 결과와
                어긋나 첫 페인트에서 잘못된 쪽이 보인다 (shared/ui/grid-table.tsx와 같은 이유).
              */}
              <Card className="hidden px-5 pt-4 pb-[6px] lg:block">
                <div className="grid grid-cols-[1fr_.7fr_.7fr_.8fr_1.6fr_70px_60px]">
                  {[
                    "유형_명",
                    "승인_필요",
                    "승인자",
                    "최소_동의_수",
                    "완료_점검_항목",
                    "사용_여부",
                    "관리",
                  ].map((h) => (
                    <div
                      key={h}
                      className="pb-[10px] text-[13px] tracking-[.3px] text-n500"
                    >
                      {h}
                    </div>
                  ))}
                  {admin.types.map((t) => (
                    <div key={t.subWorkTypeId} className="contents">
                      <div
                        className={
                          t.useYn
                            ? "border-t border-black/5 py-3 text-[15px] font-semibold"
                            : "border-t border-black/5 py-3 text-[15px] font-semibold text-n500 line-through"
                        }
                      >
                        {t.typeName}
                      </div>
                      <div className="border-t border-black/5 py-3">
                        <Badge tone={t.approvalNeeded ? "blue" : "grey"}>
                          {t.approvalNeeded ? "필요" : "불필요"}
                        </Badge>
                      </div>
                      <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                        {t.authorizerAuthorityName ?? "-"}
                      </div>
                      <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                        {agreeCountText(t)}
                      </div>
                      {/* 표에서만 '·'로 잇는다 — 저장 형태는 배열이고 구분자는 표시 규칙이다 */}
                      <div className="min-w-0 truncate border-t border-black/5 py-3 pr-2 text-[14px] text-n400">
                        {t.completionCheckArticles.join(" · ") || "-"}
                      </div>
                      <div className="border-t border-black/5 py-3">
                        {/*
                          응답이 오기 전에 다시 눌리면 방금 바꾼 값을 되돌리게 된다 —
                          진행 중에는 훅이 요청을 막고, 여기서는 그 사실을 흐리게 보여 준다
                        */}
                        <Toggle
                          on={t.useYn}
                          onChange={() => void admin.toggle(t)}
                          disabled={!canManage}
                          title={canManage ? undefined : NO_MANAGE}
                          className={
                            admin.isToggling(t.subWorkTypeId) ? "opacity-50" : undefined
                          }
                        />
                      </div>
                      <div className="border-t border-black/5 py-3">
                        <button
                          type="button"
                          disabled={!canManage}
                          title={canManage ? undefined : NO_MANAGE}
                          onClick={() => startEdit(t)}
                          className="cursor-pointer text-[14px] text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* 모바일 — 같은 데이터를 카드로. 잠금 판정(canManage)과 사유는 표와 같다 */}
              <div className="flex flex-col gap-2 lg:hidden">
                {admin.types.map((t) => (
                  <div
                    key={t.subWorkTypeId}
                    className="rounded-xl border border-line bg-surface p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={
                          t.useYn
                            ? "min-w-0 flex-1 text-[15px] font-semibold break-words"
                            : "min-w-0 flex-1 text-[15px] font-semibold break-words text-n500 line-through"
                        }
                      >
                        {t.typeName}
                      </div>
                      <Toggle
                        on={t.useYn}
                        onChange={() => void admin.toggle(t)}
                        disabled={!canManage}
                        title={canManage ? undefined : NO_MANAGE}
                        className={
                          admin.isToggling(t.subWorkTypeId)
                            ? "mt-[3px] flex-none opacity-50"
                            : "mt-[3px] flex-none"
                        }
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-[7px]">
                      <Badge tone={t.approvalNeeded ? "blue" : "grey"}>
                        {t.approvalNeeded ? "필요" : "불필요"}
                      </Badge>
                      <span className="text-[13.5px] text-n400">
                        {t.authorizerAuthorityName ?? "-"} · {agreeCountText(t)}
                      </span>
                    </div>
                    {/* 카드에서는 자르지 않는다 — 세로로 늘어나도 항목이 다 보이는 편이 낫다 */}
                    <div className="mt-2 text-[13.5px] break-words text-n400">
                      완료 점검 · {t.completionCheckArticles.join(" · ") || "-"}
                    </div>
                    <button
                      type="button"
                      disabled={!canManage}
                      title={canManage ? undefined : NO_MANAGE}
                      onClick={() => startEdit(t)}
                      className="mt-2 cursor-pointer text-[14px] text-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      수정
                    </button>
                  </div>
                ))}
              </div>
            </>
          ))}
        <div className="mt-3 text-[13.5px] text-n500">
          유형별 승인 규칙은 하위 업무 등록 시 자동 적용되며, 기존 하위 업무에는 소급되지
          않습니다.
        </div>
      </PageBody>
    </>
  );
}
