"use client";

import { useState } from "react";
import { useAuditStore } from "@/entities/audit";
import { useOpTypeStore, type OpType } from "@/entities/op-type";
import { OT_ROLES, TODAY } from "@/shared/config/constants";
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
  Toggle,
  flash,
} from "@/shared/ui";

const EMPTY: OpType = {
  name: "",
  approval: true,
  role: "회장",
  quorum: false,
  quorumN: 0,
  amount: "",
  spend: false,
  check: "",
  on: true,
};

export function OpTypeListPage() {
  const { opTypes, saveOpType, toggleOpType } = useOpTypeStore();
  const appendAudit = useAuditStore((s) => s.append);
  const [editing, setEditing] = useState<string | null>(null); // ""=신규, name=수정
  const [draft, setDraft] = useState<OpType>(EMPTY);

  const startEdit = (t?: OpType) => {
    setEditing(t ? t.name : "");
    setDraft(t ? { ...t } : EMPTY);
  };

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      flash("유형명을 입력하세요");
      return;
    }
    const normalized: OpType = {
      ...draft,
      name,
      role: draft.approval ? draft.role : "-",
      quorumN: draft.quorum ? draft.quorumN || 3 : 0,
      amount: draft.amount.trim() || "-",
      check: draft.check.trim() || "-",
      spend: name.includes("지출") || draft.amount.includes("원"),
    };
    saveOpType(editing || "", normalized);
    appendAudit({
      target: "기준정보",
      id: `opType.${name}`,
      action: editing ? "수정" : "등록",
      by: "김도현",
      before: editing || "-",
      after: name,
      ip: "10.0.12.4",
      at: `${TODAY} 10:00`,
    });
    flash(editing ? `${name} 수정됨` : `${name} 추가됨`);
    setEditing(null);
  };

  return (
    <>
      <PageHeader title="하위 업무 유형 관리" subtitle="승인 규칙 기준정보" />
      <PageBody>
        <div className="mb-4 flex justify-end">
          <Button onClick={() => startEdit()}>＋ 업무 유형 추가</Button>
        </div>

        {editing !== null && (
          <Card className="mb-4 shadow-[0_0_0_1px_#3182f6]">
            <SectionLabel className="mb-3">
              {editing ? "하위 업무 유형 수정" : "새 하위 업무 유형"}
            </SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="유형명">
                <TextField
                  inset
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="예: 예산지출"
                />
              </Field>
              <Field label="기준 금액">
                <TextField
                  inset
                  value={draft.amount === "-" ? "" : draft.amount}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                  placeholder="예: 300,000원 이상"
                />
              </Field>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] text-n400">승인 여부</div>
              <div className="flex gap-[7px]">
                {["필요", "불필요"].map((v) => (
                  <Chip
                    key={v}
                    active={draft.approval === (v === "필요")}
                    onClick={() => setDraft((d) => ({ ...d, approval: v === "필요" }))}
                  >
                    {v}
                  </Chip>
                ))}
              </div>
            </div>
            {draft.approval && (
              <div className="mt-4">
                <div className="mb-2 text-[13.5px] text-n400">승인자 역할</div>
                <div className="flex gap-[7px]">
                  {OT_ROLES.map((r) => (
                    <Chip
                      key={r}
                      active={draft.role === r}
                      onClick={() => setDraft((d) => ({ ...d, role: r }))}
                    >
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] text-n400">의사결정</div>
              <div className="flex items-center gap-[7px]">
                {["단독", "정족수"].map((v) => (
                  <Chip
                    key={v}
                    active={draft.quorum === (v === "정족수")}
                    onClick={() => setDraft((d) => ({ ...d, quorum: v === "정족수" }))}
                  >
                    {v}
                  </Chip>
                ))}
                {draft.quorum && (
                  <>
                    <TextField
                      inset
                      value={draft.quorumN || ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, quorumN: Number(e.target.value) || 0 }))
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
              <Field label="완료 점검 항목">
                <TextField
                  inset
                  value={draft.check === "-" ? "" : draft.check}
                  onChange={(e) => setDraft((d) => ({ ...d, check: e.target.value }))}
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
          <div className="grid grid-cols-[1fr_.7fr_.7fr_.8fr_1fr_1.4fr_70px_60px]">
            {["유형명", "승인", "승인자", "의사결정", "기준 금액", "완료 점검 항목", "사용", "관리"].map(
              (h) => (
                <div key={h} className="pb-[10px] text-[13px] tracking-[.3px] text-n500">
                  {h}
                </div>
              ),
            )}
            {opTypes.map((t) => (
              <div key={t.name} className="contents">
                <div
                  className={
                    t.on
                      ? "border-t border-black/5 py-3 text-[15px] font-semibold"
                      : "border-t border-black/5 py-3 text-[15px] text-n500 line-through"
                  }
                >
                  {t.name}
                </div>
                <div className="border-t border-black/5 py-3">
                  <Badge tone={t.approval ? "blue" : "grey"}>
                    {t.approval ? "필요" : "불필요"}
                  </Badge>
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {t.role}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {t.quorum ? `정족수 ${t.quorumN}인` : "단독"}
                </div>
                <div className="border-t border-black/5 py-3 text-[14.5px] text-n400">
                  {t.amount}
                </div>
                <div className="min-w-0 truncate border-t border-black/5 py-3 pr-2 text-[14px] text-n400">
                  {t.check}
                </div>
                <div className="border-t border-black/5 py-3">
                  <Toggle on={t.on} onChange={() => toggleOpType(t.name)} />
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
