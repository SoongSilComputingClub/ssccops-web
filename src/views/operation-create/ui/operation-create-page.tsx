"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMbrStore } from "@/entities/member";
import { useMtgStore, type MtgDtl } from "@/entities/meeting";
import { findOper, useOperStore } from "@/entities/oper";
import { useSessionStore } from "@/entities/session";
import { useSubWorkStore } from "@/entities/sub-work";
import { crtrAmtText, useSubWorkTypeStore } from "@/entities/sub-work-type";
import { useWorkStore } from "@/entities/work";
import {
  ATND_TRGT_CDS,
  ATND_TRGT_NM,
  AUTZR_ROLE_NM,
  MTG_SE_CDS,
  MTG_SE_NM,
  OPER_TYPE_NM,
  PRCS_SE_CDS,
  PRCS_SE_NM,
  PRRTY_RNK_CDS,
  PRRTY_RNK_NM,
  WORK_TYPE_CDS,
  WORK_TYPE_NM,
  type AtndTrgtCd,
  type MtgSeCd,
  type OperTypeCd,
  type PrcsSeCd,
  type PrrtyRnkCd,
  type WorkTypeCd,
} from "@/shared/config/codes";
import { fromInput } from "@/shared/lib/date";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  SelectField,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

const KIND_META: Record<OperTypeCd, { table: string; note: string }> = {
  WORK: {
    table: "work",
    note: "행사·상시·정례 운영처럼 여러 하위 업무를 묶는 단위",
  },
  SUB_WORK: {
    table: "sub_work",
    note: "실제 실행 단위. 승인·점검 목록이 붙습니다",
  },
  MEETING: {
    table: "mtg",
    note: "정례·주제 회의. 안건과 결과를 기록합니다",
  },
};

const DEFAULT_CHCK_ARTCLS = ["세부 계획 수립", "진행", "결과 정리", "보고"] as const;

type AgendaDraft = Pick<MtgDtl, "agndNm" | "prcsSeCd" | "operId" | "agndCn">;

export function OperationCreatePage({ workId: fixedWorkId }: { workId?: number }) {
  const router = useRouter();
  const { works, addWork } = useWorkStore();
  const { subWorks, addSubWork, addSubWorkPicAltmnt, addChckArtcls } =
    useSubWorkStore();
  const { opers, addOper } = useOperStore();
  const addMtg = useMtgStore((s) => s.addMtg);
  const addMtgDtl = useMtgStore((s) => s.addMtgDtl);
  const subWorkTypes = useSubWorkTypeStore((s) => s.subWorkTypes);
  const mbrs = useMbrStore((s) => s.mbrs);
  const sessionMbrId = useSessionStore((s) => s.mbrId);

  const kinds: OperTypeCd[] = fixedWorkId ? ["SUB_WORK"] : ["WORK", "MEETING"];
  const [operTypeCd, setOperTypeCd] = useState<OperTypeCd>(kinds[0]);

  // oper 공통 속성
  const [operTtl, setOperTtl] = useState("");
  const [picId, setPicId] = useState<number>(sessionMbrId || mbrs[0]?.mbrId || 1);
  const [prrtyRnkCd, setPrrtyRnkCd] = useState<PrrtyRnkCd>("NORMAL");
  const [bgngDt, setBgngDt] = useState("");
  const [endDt, setEndDt] = useState("");

  // work 확장
  const [workTypeCd, setWorkTypeCd] = useState<WorkTypeCd>("EVENT");
  const [grvwCn, setGrvwCn] = useState("");

  // sub_work 확장
  const [subWorkTypeId, setSubWorkTypeId] = useState<number | null>(null);
  const [parentWorkId, setParentWorkId] = useState<number | null>(fixedWorkId ?? null);
  const [workCn, setWorkCn] = useState("");
  const [otsdUrlAddr, setOtsdUrlAddr] = useState("");

  // mtg 확장
  const [mtgSeCd, setMtgSeCd] = useState<MtgSeCd>("REGULAR");
  const [atndTrgtCd, setAtndTrgtCd] = useState<AtndTrgtCd>("ALL");
  const [mtgPlcNm, setMtgPlcNm] = useState("");
  const [mtgRbprsnId, setMtgRbprsnId] = useState<number>(
    sessionMbrId || mbrs[0]?.mbrId || 1,
  );
  const [agenda, setAgenda] = useState<AgendaDraft[]>([]);

  const rule = subWorkTypes.find((t) => t.subWorkTypeId === subWorkTypeId) ?? null;
  const operTtlOf = (operId: number) => findOper(opers, operId)?.operTtl ?? "-";
  const operRefs = [
    ...works.map((w) => ({
      operId: w.operId,
      label: `업무 · ${operTtlOf(w.operId)}`,
    })),
    ...subWorks.map((sw) => ({
      operId: sw.operId,
      label: `하위 업무 · ${sw.subWorkTtl}`,
    })),
  ];

  const submit = () => {
    if (!operTtl.trim() || !bgngDt) {
      flash("운영_제목 · 시작_일시는 필수입니다");
      return;
    }
    const operDraft = {
      operTypeCd,
      operTtl: operTtl.trim(),
      operRgtrId: sessionMbrId || null,
      prrtyRnkCd,
      bgngDt: fromInput(bgngDt, true),
      endDt: endDt ? fromInput(endDt, true) : null,
      picId,
      delDt: null,
    };

    if (operTypeCd === "WORK") {
      const operId = addOper(operDraft);
      const newWorkId = addWork({
        operId,
        workTypeCd,
        workSttsCd: "PLANNING",
        grvwCn: grvwCn.trim() || null,
        workPrgrsRt: 0,
      });
      flash("업무를 등록했습니다");
      router.replace(ROUTES.workDetail(newWorkId));
      return;
    }

    if (operTypeCd === "SUB_WORK") {
      if (!parentWorkId) {
        flash("상위 업무를 선택하세요");
        return;
      }
      if (!subWorkTypeId) {
        flash("하위_업무_유형을 선택하세요");
        return;
      }
      const operId = addOper(operDraft);
      const newSubWorkId = addSubWork({
        workId: parentWorkId,
        operId,
        subWorkTtl: operTtl.trim(),
        subWorkTypeId,
        workSttsCd: "PLANNING",
        aprvSttsCd: rule?.aprvNeedYn ? "PENDING" : "NOT_REQUIRED",
        workCn: workCn.trim() || null,
        cmptnCrtrCn: rule?.cmptnChckArtclCn ?? null,
        dlyYn: false,
        otsdUrlAddr: otsdUrlAddr.trim() || null,
        ddlnDt: endDt ? fromInput(endDt, true) : null,
        cmptnDt: null,
      });
      addSubWorkPicAltmnt(newSubWorkId, picId, "OWNER");
      addChckArtcls(newSubWorkId, DEFAULT_CHCK_ARTCLS);
      flash("하위 업무를 등록했습니다");
      router.replace(ROUTES.subWorkDetail(newSubWorkId));
      return;
    }

    const operId = addOper(operDraft);
    const newMtgId = addMtg({
      operId,
      mtgSeCd,
      atndTrgtCd,
      mtgSttsCd: "SCHEDULED",
      mtgRbprsnId,
      mtgPlcNm: mtgPlcNm.trim() || null,
      insdMtgDtlCn: null,
      otsdMtgDtlCn: null,
    });
    agenda.forEach((a, i) =>
      addMtgDtl({
        mtgId: newMtgId,
        agndNm: a.agndNm,
        prcsSeCd: a.prcsSeCd,
        agndSeq: i + 1,
        operId: a.operId,
        agndCn: a.agndCn,
        rsltCn: null,
        prsnrId: mtgRbprsnId,
      }),
    );
    flash("회의를 등록했습니다");
    router.replace(ROUTES.meetingDetail(newMtgId));
  };

  return (
    <>
      <PageHeader
        title="운영 등록"
        subtitle="운영_유형별 등록 폼"
        showBack={!!fixedWorkId}
      />
      <PageBody>
        <Card className="mb-4">
          <SectionLabel className="mb-3">등록할 운영_유형</SectionLabel>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${kinds.length},1fr)` }}
          >
            {kinds.map((cd) => (
              <div
                key={cd}
                onClick={() => setOperTypeCd(cd)}
                className={
                  operTypeCd === cd
                    ? "cursor-pointer rounded-[12px] bg-accent/8 p-[14px] shadow-[inset_0_0_0_1px_#3182f6]"
                    : "cursor-pointer rounded-[12px] border border-line p-[14px] hover:border-accent"
                }
              >
                <div className="flex items-center gap-2">
                  <div className="text-[16px] font-semibold">{OPER_TYPE_NM[cd]}</div>
                  <span className="font-mono text-[12.5px] text-n500">
                    {KIND_META[cd].table}
                  </span>
                </div>
                <div className="mt-1 text-[13px] leading-[1.5] text-n500">
                  {KIND_META[cd].note}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-[1.1fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">상위 속성 · oper</SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="운영_제목" required className="col-span-2">
                <TextField
                  value={operTtl}
                  onChange={(e) => setOperTtl(e.target.value)}
                  placeholder={
                    operTypeCd === "MEETING"
                      ? "예: 9월 1차 정기회의"
                      : "예: 동아리 박람회 부스 운영"
                  }
                />
              </Field>
              <Field label="담당자_ID">
                <SelectField
                  value={String(picId)}
                  onChange={(e) => setPicId(Number(e.target.value))}
                >
                  {mbrs.map((m) => (
                    <option key={m.mbrId} value={m.mbrId}>
                      {m.mbrNm}
                    </option>
                  ))}
                </SelectField>
              </Field>
              <Field label="우선_순위_코드">
                <div className="flex gap-[7px] pt-[6px]">
                  {PRRTY_RNK_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={prrtyRnkCd === cd}
                      onClick={() => setPrrtyRnkCd(cd)}
                    >
                      {PRRTY_RNK_NM[cd]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="시작_일시" required>
                <TextField
                  type="datetime-local"
                  value={bgngDt}
                  onChange={(e) => setBgngDt(e.target.value)}
                />
              </Field>
              <Field
                label={operTypeCd === "SUB_WORK" ? "마감_일시" : "종료_일시"}
              >
                <TextField
                  type="datetime-local"
                  value={endDt}
                  onChange={(e) => setEndDt(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">
              확장 속성 · {KIND_META[operTypeCd].table}
            </SectionLabel>

            {operTypeCd === "WORK" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">업무_유형_코드</div>
                <div className="mb-4 flex gap-[7px]">
                  {WORK_TYPE_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={workTypeCd === cd}
                      onClick={() => setWorkTypeCd(cd)}
                    >
                      {WORK_TYPE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <Field label="총평_내용">
                  <TextArea
                    value={grvwCn}
                    onChange={(e) => setGrvwCn(e.target.value)}
                    placeholder="운영 종료 후 회고 · 지금은 비워도 됩니다"
                  />
                </Field>
                <div className="mt-3 text-[13px] text-n500">
                  등록 후 하위 업무를 이 업무에 연결하면 업무_진행_률이 집계됩니다.
                </div>
              </>
            )}

            {operTypeCd === "SUB_WORK" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">하위_업무_유형</div>
                <div className="mb-3 flex flex-wrap gap-[7px]">
                  {subWorkTypes.map((t) => (
                    <Chip
                      key={t.subWorkTypeId}
                      active={subWorkTypeId === t.subWorkTypeId}
                      onClick={() => setSubWorkTypeId(t.subWorkTypeId)}
                    >
                      {t.typeNm}
                    </Chip>
                  ))}
                </div>
                {rule ? (
                  <div className="mb-4 rounded-[12px] bg-bg p-3">
                    <div className="text-[13.5px] font-semibold">
                      {rule.typeNm} 유형 규칙
                    </div>
                    <div className="mt-2 grid grid-cols-[92px_1fr] gap-y-[6px] text-[13.5px]">
                      <div className="text-n500">승인_필요</div>
                      <div className={rule.aprvNeedYn ? "text-danger" : undefined}>
                        {rule.aprvNeedYn
                          ? `${rule.autzrRoleCd ? AUTZR_ROLE_NM[rule.autzrRoleCd] : "책임자"} 승인 필요`
                          : "승인 없이 진행"}
                      </div>
                      <div className="text-n500">최소_동의_수</div>
                      <div>
                        {rule.minNeedAgreCntYn
                          ? `${rule.minNeedAgreCnt}명 동의`
                          : "해당 없음"}
                      </div>
                      <div className="text-n500">기준_금액</div>
                      <div>{crtrAmtText(rule)}</div>
                      <div className="text-n500">완료_점검</div>
                      <div>{rule.cmptnChckArtclCn ?? "-"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[13.5px] text-n500">
                    하위_업무_유형을 선택하면 승인 규칙이 표시됩니다
                  </div>
                )}
                <div className="mb-2 text-[13.5px] text-n400">상위 업무 연결</div>
                {fixedWorkId ? (
                  <>
                    <Chip active>
                      {works.find((w) => w.workId === fixedWorkId)
                        ? operTtlOf(
                            works.find((w) => w.workId === fixedWorkId)!.operId,
                          )
                        : fixedWorkId}{" "}
                      고정
                    </Chip>
                    <div className="mt-2 mb-4 text-[13px] text-n500">
                      하위 업무는 상위 업무 안에서만 생성됩니다
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap gap-[7px]">
                      {works.map((w) => (
                        <Chip
                          key={w.workId}
                          active={parentWorkId === w.workId}
                          onClick={() => setParentWorkId(w.workId)}
                        >
                          {operTtlOf(w.operId)}
                        </Chip>
                      ))}
                    </div>
                    <div className="mb-4 text-[13px] text-n500">
                      상위 업무를 반드시 선택하세요
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-[14px]">
                  <Field label="업무_내용">
                    <TextField
                      value={workCn}
                      onChange={(e) => setWorkCn(e.target.value)}
                      placeholder="무엇을 하는 하위 업무인지"
                    />
                  </Field>
                  <Field label="외부_URL_주소">
                    <TextField
                      value={otsdUrlAddr}
                      onChange={(e) => setOtsdUrlAddr(e.target.value)}
                      placeholder="문서 · 시트 URL"
                    />
                  </Field>
                </div>
                <div className="mt-3 text-[13px] text-n500">
                  등록 직후 업무_상태는 기획(PLANNING)입니다.
                </div>
              </>
            )}

            {operTypeCd === "MEETING" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">회의_구분_코드</div>
                <div className="mb-4 flex gap-[7px]">
                  {MTG_SE_CDS.map((cd) => (
                    <Chip key={cd} active={mtgSeCd === cd} onClick={() => setMtgSeCd(cd)}>
                      {MTG_SE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <div className="mb-2 text-[13.5px] text-n400">참석_대상_코드</div>
                <div className="mb-4 flex gap-[7px]">
                  {ATND_TRGT_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={atndTrgtCd === cd}
                      onClick={() => setAtndTrgtCd(cd)}
                    >
                      {ATND_TRGT_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-[14px]">
                  <Field label="회의_장소_명">
                    <TextField
                      value={mtgPlcNm}
                      onChange={(e) => setMtgPlcNm(e.target.value)}
                      placeholder="예: 동아리방"
                    />
                  </Field>
                  <Field label="회의_책임자_ID">
                    <SelectField
                      value={String(mtgRbprsnId)}
                      onChange={(e) => setMtgRbprsnId(Number(e.target.value))}
                    >
                      {mbrs.map((m) => (
                        <option key={m.mbrId} value={m.mbrId}>
                          {m.mbrNm}
                        </option>
                      ))}
                    </SelectField>
                  </Field>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {agenda.map((a, i) => (
                    <div key={i} className="rounded-[12px] border border-line p-3">
                      <div className="flex items-center">
                        <div className="text-[14px] font-semibold">안건 {i + 1}</div>
                        <div className="flex-1" />
                        <button
                          type="button"
                          onClick={() =>
                            setAgenda((list) => list.filter((_, j) => j !== i))
                          }
                          className="cursor-pointer text-[13.5px] text-n400 hover:text-danger"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="mt-2">
                        <div className="mb-[6px] text-[13.5px] text-n400">
                          연결 운영 <span className="text-accent">*</span>
                        </div>
                        <SelectField
                          value={a.operId === null ? "" : String(a.operId)}
                          onChange={(e) => {
                            const operId = e.target.value ? Number(e.target.value) : null;
                            const agndNm =
                              operRefs
                                .find((o) => o.operId === operId)
                                ?.label.split(" · ")[1] ?? null;
                            setAgenda((list) =>
                              list.map((x, j) =>
                                j === i ? { ...x, operId, agndNm } : x,
                              ),
                            );
                          }}
                        >
                          <option value="">선택하세요</option>
                          {operRefs.map((o) => (
                            <option key={o.operId} value={o.operId}>
                              {o.label}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <div className="mt-2 flex gap-[7px]">
                        {PRCS_SE_CDS.map((cd) => (
                          <Chip
                            key={cd}
                            active={a.prcsSeCd === cd}
                            onClick={() =>
                              setAgenda((list) =>
                                list.map((x, j) =>
                                  j === i ? { ...x, prcsSeCd: cd as PrcsSeCd } : x,
                                ),
                              )
                            }
                          >
                            {PRCS_SE_NM[cd]}
                          </Chip>
                        ))}
                      </div>
                      <TextArea
                        value={a.agndCn ?? ""}
                        onChange={(e) =>
                          setAgenda((list) =>
                            list.map((x, j) =>
                              j === i ? { ...x, agndCn: e.target.value || null } : x,
                            ),
                          )
                        }
                        placeholder="안건_내용 (선택)"
                        className="mt-2"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setAgenda((list) => [
                        ...list,
                        {
                          agndNm: null,
                          prcsSeCd: "PENDING",
                          operId: null,
                          agndCn: null,
                        },
                      ])
                    }
                    className="cursor-pointer rounded-[12px] border border-dashed border-line-strong py-3 text-[14.5px] text-n400 hover:border-accent hover:text-accent"
                  >
                    + 안건 추가
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="mt-5">
          <Button className="px-[26px] py-[11px]" onClick={submit}>
            {OPER_TYPE_NM[operTypeCd]} 등록
          </Button>
        </div>
      </PageBody>
    </>
  );
}
