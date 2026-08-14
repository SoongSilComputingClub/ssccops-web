"use client";

import { useState } from "react";
import {
  genNoText,
  mbrGrdNm,
  mbrGrdTone,
  mbrSttsNm,
  mbrSttsTone,
  useMbrStore,
  type Mbr,
} from "@/entities/member";
import { useSessionStore } from "@/entities/session";
import { TODAY } from "@/shared/config/constants";
import {
  Badge,
  Button,
  Card,
  Field,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

/** 본인이 수정할 수 있는 mbr 컬럼 */
const EDITABLE = [
  { key: "mbrNm", label: "회원_명", ph: "필수" },
  { key: "stdntNo", label: "학생_번호", ph: "선택" },
  { key: "scsbjtNm", label: "학과_명", ph: "" },
  { key: "telno", label: "전화번호", ph: "" },
] as const;

type EditableKey = (typeof EDITABLE)[number]["key"];

export function MyAccountPage() {
  const mbrId = useSessionStore((s) => s.mbrId);
  const mbr = useMbrStore((s) => s.mbrs.find((m) => m.mbrId === mbrId));

  if (!mbr) return null;

  return (
    <>
      <PageHeader title="내 계정" subtitle="프로필" />
      <PageBody>
        <Card className="mb-4">
          <div className="flex items-center gap-[10px]">
            <div className="text-[25px] font-medium">{mbr.mbrNm}</div>
            <Badge tone={mbrGrdTone(mbr.mbrGrdCd)}>{mbrGrdNm(mbr.mbrGrdCd)}</Badge>
            <Badge tone={mbrSttsTone(mbr.mbrSttsCd)}>{mbrSttsNm(mbr.mbrSttsCd)}</Badge>
            <div className="flex-1" />
            <div className="text-[14px] text-n500">
              회원 #{mbr.mbrId} · {genNoText(mbr)} · {mbr.scsbjtNm || "학과 미입력"}
            </div>
          </div>
        </Card>

        <ProfileTab mbr={mbr} />
      </PageBody>
    </>
  );
}

function ProfileTab({ mbr }: { mbr: Mbr }) {
  const updateMbr = useMbrStore((s) => s.updateMbr);
  const [draft, setDraft] = useState<Partial<Record<EditableKey | "scyrNo", string>>>({});

  const current = (key: EditableKey | "scyrNo"): string => {
    const v = mbr[key];
    return v === null || v === undefined ? "" : String(v);
  };
  const value = (key: EditableKey | "scyrNo") => draft[key] ?? current(key);
  const changedEntries = Object.entries(draft).filter(
    ([k, v]) => v !== undefined && v !== current(k as EditableKey | "scyrNo"),
  );

  const save = () => {
    if (!value("mbrNm").trim()) {
      flash("회원_명은 비울 수 없습니다");
      return;
    }
    const patch: Partial<Mbr> = { mdfcnDt: `${TODAY}T10:00:00` };
    for (const [k, v] of changedEntries) {
      if (k === "scyrNo") patch.scyrNo = Number(v) || null;
      else Object.assign(patch, { [k]: v });
    }
    updateMbr(mbr.mbrId, patch);
    setDraft({});
    flash(`${changedEntries.length}건을 저장했습니다`);
  };

  return (
    <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
      <Card>
        <SectionLabel className="mb-3">내가 수정할 수 있는 항목</SectionLabel>
        <div className="grid grid-cols-2 gap-[14px]">
          {EDITABLE.map((f) => (
            <Field key={f.key} label={f.label}>
              <TextField
                value={value(f.key)}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.ph}
              />
            </Field>
          ))}
          <Field label="학년_번호">
            <TextField
              value={value("scyrNo")}
              onChange={(e) => setDraft((d) => ({ ...d, scyrNo: e.target.value }))}
              placeholder="1~4"
            />
          </Field>
        </div>
        {changedEntries.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setDraft({})}>
              되돌리기
            </Button>
            <Button onClick={save}>저장</Button>
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel className="mb-3">운영진만 변경할 수 있는 항목</SectionLabel>
        <KeyValueGrid
          items={[
            {
              k: "기수_번호",
              v:
                genNoText(mbr) === "미배정"
                  ? "미배정 · 운영진이 배정합니다"
                  : genNoText(mbr),
            },
            { k: "이메일", v: mbr.eml || "미입력" },
            {
              k: "회원_등급",
              v: <Badge tone={mbrGrdTone(mbr.mbrGrdCd)}>{mbrGrdNm(mbr.mbrGrdCd)}</Badge>,
            },
            {
              k: "회원_상태",
              v: (
                <Badge tone={mbrSttsTone(mbr.mbrSttsCd)}>
                  {mbrSttsNm(mbr.mbrSttsCd)}
                </Badge>
              ),
            },
            { k: "가입_일자", v: mbr.joinYmd },
          ]}
        />
      </Card>
    </div>
  );
}
