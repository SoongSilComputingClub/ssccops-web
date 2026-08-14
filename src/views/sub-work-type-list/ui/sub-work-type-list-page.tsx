"use client";

import { useState } from "react";
import { crtrAmtText, useSubWorkTypeStore, type SubWorkType } from "@/entities/sub-work-type";
import { AUTZR_ROLE_CDS, AUTZR_ROLE_NM, type AutzrRoleCd } from "@/shared/config/codes";
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

type Draft = Omit<SubWorkType, "subWorkTypeId">;

const EMPTY: Draft = {
  typeNm: "",
  aprvNeedYn: true,
  autzrRoleCd: "PRESIDENT",
  minNeedAgreCntYn: false,
  minNeedAgreCnt: null,
  crtrAmt: null,
  expndYn: false,
  cmptnChckArtclCn: "",
};

/** "300,000" 같은 입력을 금액N15 로 */
function toAmt(v: string): number | null {
  const n = Number(v.replace(/[^0-9]/g, ""));
  return v.trim() === "" || Number.isNaN(n) || n === 0 ? null : n;
}

export function SubWorkTypeListPage() {
  const { subWorkTypes, addSubWorkType, updateSubWorkType } = useSubWorkTypeStore();
  /** null=닫힘, 0=신규, n=해당 subWorkTypeId 수정 */
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const startEdit = (t?: SubWorkType) => {
    setEditing(t ? t.subWorkTypeId : 0);
    setDraft(t ? { ...t } : EMPTY);
  };

  const save = () => {
    const typeNm = draft.typeNm.trim();
    if (!typeNm) {
      flash("유형_명을 입력하세요");
      return;
    }
    const normalized: Draft = {
      ...draft,
      typeNm,
      autzrRoleCd: draft.aprvNeedYn ? draft.autzrRoleCd : null,
      minNeedAgreCnt: draft.minNeedAgreCntYn ? draft.minNeedAgreCnt || 3 : null,
      cmptnChckArtclCn: draft.cmptnChckArtclCn?.trim() || null,
      expndYn: draft.crtrAmt !== null,
    };
    if (editing) {
      updateSubWorkType(editing, normalized);
      flash(`${typeNm} 수정됨`);
    } else {
      addSubWorkType(normalized);
      flash(`${typeNm} 추가됨`);
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader title="하위 업무 유형 관리" subtitle="승인 규칙 기준정보" />
      <PageBody>
        <div className="mb-4 flex justify-end">
          <Button onClick={() => startEdit()}>＋ 하위 업무 유형 추가</Button>
        </div>

        {editing !== null && (
          <Card className="mb-4 shadow-[0_0_0_1px_#3182f6]">
            <SectionLabel className="mb-3">
              {editing ? "하위 업무 유형 수정" : "새 하위 업무 유형"}
            </SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="유형_명">
                <TextField
                  inset
                  value={draft.typeNm}
                  onChange={(e) => setDraft((d) => ({ ...d, typeNm: e.target.value }))}
                  placeholder="예: 예산지출"
                />
              </Field>
              <Field label="기준_금액 (원)">
                <TextField
                  inset
                  value={draft.crtrAmt === null ? "" : String(draft.crtrAmt)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, crtrAmt: toAmt(e.target.value) }))
                  }
                  placeholder="예: 300000"
                />
              </Field>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] text-n400">승인_필요_여부</div>
              <div className="flex gap-[7px]">
                {["필요", "불필요"].map((v) => (
                  <Chip
                    key={v}
                    active={draft.aprvNeedYn === (v === "필요")}
                    onClick={() => setDraft((d) => ({ ...d, aprvNeedYn: v === "필요" }))}
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </div>
            {draft.aprvNeedYn && (
              <div className="mt-4">
                <div className="mb-2 text-[13.5px] text-n400">승인자_역할_코드</div>
                <div className="flex gap-[7px]">
                  {AUTZR_ROLE_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={draft.autzrRoleCd === cd}
                      onClick={() =>
                        setDraft((d) => ({ ...d, autzrRoleCd: cd as AutzrRoleCd }))
                      }
                    >
                      {AUTZR_ROLE_NM[cd]}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] text-n400">최소_필요_동의_수</div>
              <div className="flex items-center gap-[7px]">
                {["단독", "정족수"].map((v) => (
                  <Chip
                    key={v}
                    active={draft.minNeedAgreCntYn === (v === "정족수")}
                    onClick={() =>
                      setDraft((d) => ({ ...d, minNeedAgreCntYn: v === "정족수" }))
                    }
                  >
                    {v}
                  </Chip>
                ))}
                {draft.minNeedAgreCntYn && (
                  <>
                    <TextField
                      inset
                      value={draft.minNeedAgreCnt ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          minNeedAgreCnt: Number(e.target.value) || null,
                        }))
                      }
                      placeholder="3"
                      className="w-[64px] text-center"
                    />
                    <span className="text-[14px] text-n400">인 동의</span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4">
              <Field label="완료_점검_항목_내용">
                <TextField
                  inset
                  value={draft.cmptnChckArtclCn ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, cmptnChckArtclCn: e.target.value }))
                  }
                  placeholder="예: 영수증 첨부 · 예산안 대비 확인"
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={save}>저장</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                취소
              </Button>
            </div>
          </Card>
        )}

        <Card className="px-5 pt-4 pb-[6px]">
          <div className="grid grid-cols-[1fr_.7fr_.7fr_.8fr_1fr_1.4fr_60px]">
            {[
              "유형_명",
              "승인_필요",
              "승인자_역할",
              "최소_동의_수",
              "기준_금액",
              "완료_점검_항목",
              "관리",
            ].map((h) => (
              <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                {h}
              </div>
            ))}
            {subWorkTypes.map((t) => (
              <div key={t.subWorkTypeId} className="contents">
                <div className="border-t border-black/5 py-3 text-[15px] font-semibold">
                  {t.typeNm}
                </div>
                <div className="border-t border-black/5 py-3">
                  <Badge tone={t.aprvNeedYn ? "blue" : "grey"}>
                    {t.aprvNeedYn ? "필요" : "불필요"}
                  </Badge>
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {t.autzrRoleCd ? AUTZR_ROLE_NM[t.autzrRoleCd] : "-"}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {t.minNeedAgreCntYn ? `정족수 ${t.minNeedAgreCnt}인` : "단독"}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {crtrAmtText(t)}
                </div>
                <div className="min-w-0 truncate border-t border-black/5 py-3 pr-2 text-[14px] text-n400">
                  {t.cmptnChckArtclCn || "-"}
                </div>
                <div className="border-t border-black/5 py-3">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="cursor-pointer text-[14px] text-accent"
                  >
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="mt-3 text-[13.5px] text-n500">
          유형별 승인 규칙은 하위 업무 등록 시 자동 적용되며, 기존 하위 업무에는
          소급되지 않습니다.
        </div>
      </PageBody>
    </>
  );
}
