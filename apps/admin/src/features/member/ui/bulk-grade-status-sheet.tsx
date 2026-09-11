"use client";

import { useState } from "react";
import {
  CHANGE_REASON_MAX,
  changeWarningLabel,
  statusAllowsExpectedEndDate,
  type MemberBulkChangeResult,
  type MemberBulkChangeRow,
  type MemberBulkChangeStatus,
} from "@/entities/member";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Chip,
  Field,
  KeyValueGrid,
  Pill,
  Sheet,
  StatBox,
  TextArea,
  TextField,
  type BadgeTone,
} from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";
import { useMemberCodes } from "../model/use-member-codes";

/*
 * 회원 등급·상태 **일괄** 변경 시트 (#382 · 서버 #338).
 *
 * ── 한 명짜리 시트(grade-status-sheet.tsx)와 무엇이 같고 무엇이 다른가 ──
 * 입력은 같다 — 값 칩 · 적용 일자 · 종료 예정일 · 사유, 그리고 서버가 거절할 입력을 미리 잠그는
 * 규칙(미래 일자 · 적용일보다 앞선 종료일 · 사유 길이)도 그대로다. 요청 본문의 필드 이름이
 * 글자 그대로 같고 서버도 한 명짜리 로직에 그대로 넘기므로, 여기서 다른 규칙을 세우면 그 차이는
 * 화면이 지어낸 것이다.
 *
 * **«현재와 같은 값이면 잠금»만 없다.** 대상마다 현재 값이 다르고 이 시트는 그 값을 알지도
 * 못한다(선택은 id와 이름뿐이다). 판정할 수 없는 것을 판정하는 대신 서버가 그런 회원을
 * `SKIPPED`로 돌려주고, 결과 화면이 그것을 실패가 아닌 "이미 그 값"으로 센다. 칩에 "(현재)"
 * 표시가 없는 것도 같은 이유다.
 *
 * ── 왜 단계가 셋인가 (입력 → 미리보기 → 결과) ───────────────────
 * 선택이 페이지를 넘어 살아남으므로(use-member-selection) 저장 대상에 **지금 화면에 없는 사람**이
 * 섞여 있다. 한 명짜리 시트는 제목에 이름이 있어 누구를 바꾸는지 자명하지만, 여기서는 "23명"이
 * 누구인지 이름을 전부 펼쳐 보여 주지 않으면 운영자가 확인할 길이 없다 — 되돌리려면 한 명씩
 * 다시 바꿔야 하는 일이라 저장 전에 대상이 눈에 보여야 한다.
 *
 * 결과를 토스트로 끝내지 않는 것은 CSV 이관 결과(views/csv-import/ui/result-step.tsx)와 같은
 * 판단이다. 회원마다 트랜잭션이 따로라 결과는 성공/실패가 아니라 **변경·건너뜀·실패 세 갈래의
 * 보고**이고, 탈퇴·제명 때 남은 역할·하위 업무의 경고는 **누구 것인지** 보여야 사람이 가서
 * 정리한다. 그래서 경고를 요약하지 않고 회원별 줄에 붙인다.
 *
 * ── 대상은 저장 시점에 굳힌다 ───────────────────────────────────
 * 결과 단계는 부모가 넘긴 `targets`가 아니라 응답의 `rows`로 그린다. 부모는 결과를 받는 즉시
 * 목록을 다시 부르고 선택을 비우는데(`onSaved`), 그 순간 `targets`는 비어 있다 — 응답이
 * 이름을 함께 실어 주는 이유가 이것이다.
 *
 * ── 상태는 부모가, 그림은 단계 컴포넌트가 (#409) ──────────────────
 * 세 단계의 상태·훅은 `BulkGradeStatusSheet` 하나가 쥔다 — 단계를 오가도 입력이 살아 있어야
 * 하고(미리보기에서 «이전»으로 돌아오면 값이 그대로여야 한다), 요청과 결과도 한 자리에서
 * 이어져야 한다. 단계 컴포넌트(`BulkInputStep`·`BulkPreviewStep`·`BulkResultStep`)는 받은 값을
 * 그리기만 하고 상태를 갖지 않는다. 잠금 판정은 순수 함수(`checkBulkInput`)다.
 */

type Step = "input" | "preview" | "result";

/** 결과 어휘 — CSV 이관 결과(등록·건너뜀·실패)와 같은 모양·같은 색이다 */
const STATUS_LABEL: Record<MemberBulkChangeStatus, string> = {
  CHANGED: "변경",
  SKIPPED: "건너뜀",
  FAILED: "실패",
};

const STATUS_TONE: Record<MemberBulkChangeStatus, BadgeTone> = {
  CHANGED: "blue",
  SKIPPED: "amber",
  FAILED: "red",
};

/** 입력 단계의 잠금 판정. 전부 입력에서 파생된다 — 상태로 쥐지 않는다 */
type BulkInputCheck = {
  today: string;
  endDateAllowed: boolean;
  futureApplied: boolean;
  endBeforeApplied: boolean;
  tooLongReason: boolean;
  /** 빈 문자열이면 잠기지 않았다 */
  blockedReason: string;
};

/** «다음»·«N명 변경»을 잠그는 사유 — 먼저 걸리는 것 하나만 말한다 */
function bulkBlockedReason({
  targetCount,
  isGrade,
  pick,
  futureApplied,
  endBeforeApplied,
  tooLongReason,
}: Readonly<{
  targetCount: number;
  isGrade: boolean;
  pick: string | null;
  futureApplied: boolean;
  endBeforeApplied: boolean;
  tooLongReason: boolean;
}>): string {
  if (targetCount === 0) return "대상이 없습니다 — 목록에서 회원을 먼저 선택하세요";
  if (pick === null) return `변경할 ${isGrade ? "등급" : "상태"}을 선택하세요`;
  if (futureApplied) return "적용 일자는 오늘 이후일 수 없습니다";
  if (endBeforeApplied) return "종료 예정일은 적용 일자보다 앞설 수 없습니다";
  if (tooLongReason) return `변경 사유는 ${CHANGE_REASON_MAX}자를 넘을 수 없습니다`;
  return "";
}

/** 서버가 거절할 입력을 미리 잠그는 규칙 — 한 명짜리 시트와 같다(파일 머리 주석) */
function checkBulkInput({
  isGrade,
  targetCount,
  pick,
  appliedDate,
  expectedEndDate,
  reason,
}: Readonly<{
  isGrade: boolean;
  targetCount: number;
  pick: string | null;
  appliedDate: string;
  expectedEndDate: string;
  reason: string;
}>): BulkInputCheck {
  /* 종료 예정일은 휴학·군휴학에만 자리가 있다 — 한 명짜리 시트와 같은 판단 */
  const endDateAllowed =
    !isGrade && pick !== null && statusAllowsExpectedEndDate(pick as MbrSttsCd);

  const today = todayInSeoul();
  const futureApplied = appliedDate !== "" && appliedDate > today;
  const endBeforeApplied =
    endDateAllowed && expectedEndDate !== "" && expectedEndDate < (appliedDate || today);
  const tooLongReason = reason.trim().length > CHANGE_REASON_MAX;

  const blockedReason = bulkBlockedReason({
    targetCount,
    isGrade,
    pick,
    futureApplied,
    endBeforeApplied,
    tooLongReason,
  });

  return { today, endDateAllowed, futureApplied, endBeforeApplied, tooLongReason, blockedReason };
}

export function BulkGradeStatusSheet({
  kind,
  targets,
  onClose,
  onSaved,
}: Readonly<{
  kind: "grd" | "stts" | null;
  /** memberId → 이름. 미리보기가 이름을 펼치고, 저장 시점에 id 목록으로 굳힌다 */
  targets: ReadonlyMap<number, string>;
  onClose: () => void;
  /**
   * 서버가 결과를 돌려줬다 — **일부가 실패했어도 부른다.** 요청이 통째로 거절된 경우(400·403)
   * 에만 부르지 않는다. 부모는 여기서 목록을 다시 부르고 선택을 비운다.
   */
  onSaved: (result: MemberBulkChangeResult) => void;
}>) {
  const { grades, statuses, loading } = useMemberCodes();
  const { bulkChangeGrade, bulkChangeStatus, changing, changeErrorMessage, clearChangeError } =
    useMemberActions();

  const [step, setStep] = useState<Step>("input");
  const [result, setResult] = useState<MemberBulkChangeResult | null>(null);
  /** null은 "아직 고르지 않았다" — 한 명짜리와 달리 현재 값이 없으므로 고르기 전에는 잠근다 */
  const [pick, setPick] = useState<string | null>(null);
  const [appliedDate, setAppliedDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [reason, setReason] = useState("");

  if (!kind) return null;

  const isGrade = kind === "grd";
  const options = isGrade ? grades : statuses;
  const pickedName = options.find((o) => o.code === pick)?.name ?? "";

  const check = checkBulkInput({
    isGrade,
    targetCount: targets.size,
    pick,
    appliedDate,
    expectedEndDate,
    reason,
  });

  const close = () => {
    /* 요청이 나가 있는 동안은 닫지 않는다 — 닫히면 회원별 결과를 볼 자리가 사라진다 */
    if (changing) return;
    setStep("input");
    setResult(null);
    setPick(null);
    setAppliedDate("");
    setExpectedEndDate("");
    setReason("");
    clearChangeError();
    onClose();
  };

  const dateOrNull = (value: string): string | null => (value === "" ? null : value);
  /* 적지 않은 사유는 null이다 — 문자열을 지어내지 않는 이유는 한 명짜리 시트 주석 */
  const reasonOrNull = (): string | null => reason.trim() || null;

  const submit = async () => {
    const mbrIds = [...targets.keys()];
    const saved = isGrade
      ? await bulkChangeGrade({
          mbrIds,
          aftrMbrGrdCd: pick as MbrGrdCd,
          grdAplcnYmd: dateOrNull(appliedDate),
          grdChgRsnCn: reasonOrNull(),
        })
      : await bulkChangeStatus({
          mbrIds,
          aftrMbrSttsCd: pick as MbrSttsCd,
          sttsAplcnYmd: dateOrNull(appliedDate),
          sttsEndPrnmntYmd: check.endDateAllowed ? dateOrNull(expectedEndDate) : null,
          sttsChgRsnCn: reasonOrNull(),
        });

    /* 요청 자체가 거절됐다 — 미리보기에 남아 사유를 보여 준다. 이때는 한 명도 바뀌지 않았다 */
    if (!saved) return;
    setResult(saved);
    setStep("result");
    onSaved(saved);
  };

  const title = isGrade ? "회원등급 일괄 변경" : "회원상태 일괄 변경";

  /* ── 결과 ─────────────────────────────────────────────────── */
  if (step === "result" && result) {
    return (
      <BulkResultStep title={title} pickedName={pickedName} result={result} onClose={close} />
    );
  }

  /* ── 미리보기 ─────────────────────────────────────────────── */
  if (step === "preview") {
    return (
      <BulkPreviewStep
        title={title}
        isGrade={isGrade}
        targets={targets}
        pickedName={pickedName}
        appliedDate={appliedDate}
        expectedEndDate={expectedEndDate}
        reason={reason}
        endDateAllowed={check.endDateAllowed}
        blockedReason={check.blockedReason}
        changing={changing}
        changeErrorMessage={changeErrorMessage}
        clearChangeError={clearChangeError}
        onClose={close}
        onSubmit={submit}
        onBack={() => setStep("input")}
      />
    );
  }

  /* ── 입력 ─────────────────────────────────────────────────── */
  return (
    <BulkInputStep
      title={title}
      isGrade={isGrade}
      targetCount={targets.size}
      options={options}
      loading={loading}
      pick={pick}
      appliedDate={appliedDate}
      expectedEndDate={expectedEndDate}
      reason={reason}
      check={check}
      setPick={setPick}
      setAppliedDate={setAppliedDate}
      setExpectedEndDate={setExpectedEndDate}
      setReason={setReason}
      clearChangeError={clearChangeError}
      onClose={close}
      onNext={() => setStep("preview")}
    />
  );
}

/* ── 입력 ─────────────────────────────────────────────────── */
function BulkInputStep({
  title,
  isGrade,
  targetCount,
  options,
  loading,
  pick,
  appliedDate,
  expectedEndDate,
  reason,
  check,
  setPick,
  setAppliedDate,
  setExpectedEndDate,
  setReason,
  clearChangeError,
  onClose,
  onNext,
}: Readonly<{
  title: string;
  isGrade: boolean;
  targetCount: number;
  options: ReadonlyArray<{ code: string; name: string }>;
  loading: boolean;
  pick: string | null;
  appliedDate: string;
  expectedEndDate: string;
  reason: string;
  check: BulkInputCheck;
  setPick: (value: string) => void;
  setAppliedDate: (value: string) => void;
  setExpectedEndDate: (value: string) => void;
  setReason: (value: string) => void;
  /** 입력이 바뀌면 서버가 거절한 사유를 지운다 — 새 입력에 옛 사유가 붙어 있으면 안 된다 */
  clearChangeError: () => void;
  onClose: () => void;
  onNext: () => void;
}>) {
  const { today, endDateAllowed, futureApplied, endBeforeApplied, tooLongReason, blockedReason } =
    check;

  return (
    <Sheet
      open
      title={title}
      hint={`선택한 ${targetCount}명 · 변경할 값을 선택하세요`}
      onClose={onClose}
      onOk={onNext}
      okLabel="다음"
      okDisabled={blockedReason !== ""}
      okTitle={blockedReason || undefined}
    >
      <Field label={isGrade ? "변경할 등급" : "변경할 상태"} required className="mb-4">
        {loading ? (
          <div className="text-[14px] text-n500">선택지를 불러오는 중…</div>
        ) : options.length === 0 ? (
          <div className="text-[14px] text-danger">
            기준 코드를 불러오지 못했습니다. 화면을 새로고침해주세요
          </div>
        ) : (
          <div className="flex flex-wrap gap-[7px]">
            {options.map((option) => (
              <Chip
                key={option.code}
                active={pick === option.code}
                onClick={() => {
                  setPick(option.code);
                  clearChangeError();
                }}
              >
                {option.name}
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field
        label="적용 일자"
        error={futureApplied ? "적용 일자는 오늘 이후일 수 없습니다" : null}
        className="mb-4"
      >
        <TextField
          type="date"
          value={appliedDate}
          max={today}
          invalid={futureApplied}
          onChange={(e) => {
            setAppliedDate(e.target.value);
            clearChangeError();
          }}
        />
        <div className="mt-[5px] text-[12.5px] text-n500">
          비워 두면 서버의 오늘로 기록됩니다 · 대상 전원에게 같은 날짜가 적용됩니다
        </div>
      </Field>

      {endDateAllowed && (
        <Field
          label="종료 예정일"
          error={endBeforeApplied ? "종료 예정일은 적용 일자보다 앞설 수 없습니다" : null}
          className="mb-4"
        >
          <TextField
            type="date"
            value={expectedEndDate}
            invalid={endBeforeApplied}
            onChange={(e) => {
              setExpectedEndDate(e.target.value);
              clearChangeError();
            }}
          />
          <div className="mt-[5px] text-[12.5px] text-n500">
            휴학·군휴학처럼 끝이 정해진 상태에만 남길 수 있습니다 (선택)
          </div>
        </Field>
      )}

      <Field
        label={`변경 사유 (선택 · ${reason.trim().length}/${CHANGE_REASON_MAX})`}
        error={
          tooLongReason ? `변경 사유는 ${CHANGE_REASON_MAX}자를 넘을 수 없습니다` : null
        }
      >
        <TextArea
          value={reason}
          maxLength={CHANGE_REASON_MAX}
          onChange={(e) => {
            setReason(e.target.value);
            clearChangeError();
          }}
          placeholder="예: 개강총회 승급"
        />
      </Field>
    </Sheet>
  );
}

/* ── 미리보기 ─────────────────────────────────────────────── */
function BulkPreviewStep({
  title,
  isGrade,
  targets,
  pickedName,
  appliedDate,
  expectedEndDate,
  reason,
  endDateAllowed,
  blockedReason,
  changing,
  changeErrorMessage,
  clearChangeError,
  onClose,
  onSubmit,
  onBack,
}: Readonly<{
  title: string;
  isGrade: boolean;
  targets: ReadonlyMap<number, string>;
  pickedName: string;
  appliedDate: string;
  expectedEndDate: string;
  reason: string;
  endDateAllowed: boolean;
  blockedReason: string;
  changing: boolean;
  changeErrorMessage: string | null;
  clearChangeError: () => void;
  onClose: () => void;
  onSubmit: () => void;
  onBack: () => void;
}>) {
  const noun = isGrade ? "등급" : "상태";

  return (
    <Sheet
      open
      title={title}
      hint={`아래 ${targets.size}명의 ${noun}를 바꿉니다 · 되돌리려면 한 명씩 다시 바꿔야 합니다`}
      onClose={onClose}
      onOk={onSubmit}
      okLabel={changing ? "변경 중…" : `${targets.size}명 변경`}
      okDisabled={changing || blockedReason !== ""}
      okTitle={blockedReason || undefined}
      cancelLabel="이전"
      onCancel={() => {
        if (changing) return;
        clearChangeError();
        onBack();
      }}
    >
      <KeyValueGrid
        className="mb-4"
        items={[
          { k: noun, v: <b>{pickedName}</b> },
          /* 비워 두면 서버의 오늘이다 — 화면 시계로 채우지 않는 이유는 요청 타입 주석 */
          { k: "적용 일자", v: appliedDate || "오늘 (서버 기준)" },
          ...(endDateAllowed ? [{ k: "종료 예정일", v: expectedEndDate || "없음" }] : []),
          { k: "변경 사유", v: reason.trim() || <span className="text-n500">없음</span> },
        ]}
      />
      <Field label={`대상 ${targets.size}명`}>
        {/*
          이름을 전부 펼친다 — 다른 페이지에서 고른 사람이 섞여 있어 "N명"만으로는 누구인지
          확인할 수 없다. 100명이어도 필로 접히면 몇 줄이고, 시트가 안에서 스크롤된다.
        */}
        <div className="flex flex-wrap gap-[6px]">
          {/* 동명이인이 있을 수 있어 열쇠는 이름이 아니라 회원 번호다 */}
          {[...targets].map(([memberId, name]) => (
            <Pill key={memberId} tone="outline">
              {name}
            </Pill>
          ))}
        </div>
      </Field>
      <div className="mt-3 text-[13px] text-n500">
        이미 {pickedName}인 회원은 건너뛰고 이력을 남기지 않습니다.
      </div>
      {/* 서버가 거절한 사유는 시트 안에 남긴다 — 한 명짜리 시트와 같은 자리 */}
      {changeErrorMessage && (
        <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] text-danger">
          {changeErrorMessage}
        </div>
      )}
    </Sheet>
  );
}

/* ── 결과 ─────────────────────────────────────────────────── */
function BulkResultStep({
  title,
  pickedName,
  result,
  onClose,
}: Readonly<{
  title: string;
  pickedName: string;
  result: MemberBulkChangeResult;
  onClose: () => void;
}>) {
  const { summary, rows } = result;

  return (
    <Sheet
      open
      title={title}
      hint={`${summary.totalCount}명 중 ${summary.changedCount}명 변경 · ${summary.skippedCount}명 이미 ${pickedName} · ${summary.failedCount}명 실패`}
      onClose={onClose}
      cancelLabel="닫기"
    >
      {/* 375px 화면의 시트 안에서는 4칸이 서지 않는다 — CSV 결과처럼 2×2로 접는다 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatBox label="전체" value={summary.totalCount} />
        <StatBox label="변경" value={summary.changedCount} tone="accent" />
        <StatBox label="건너뜀 (이미 같은 값)" value={summary.skippedCount} />
        <StatBox label="실패" value={summary.failedCount} tone="danger" />
      </div>
      {summary.skippedCount > 0 && (
        <div className="mb-3 text-[13px] text-n500">
          건너뛴 회원은 이미 같은 값이라 이력을 남기지 않았습니다 — 실패가 아닙니다.
        </div>
      )}
      <div className="flex flex-col">
        {rows.map((row) => (
          <ResultRow key={row.memberId} row={row} />
        ))}
      </div>
    </Sheet>
  );
}

/**
 * 회원별 결과 한 줄. 경고는 **그 회원 줄 아래**에 붙는다 — 요약으로 합치면 누구 것인지가
 * 사라지고, 경고의 쓸모는 사람이 가서 정리하는 것이다(상세의 경고 패널과 같은 배지·문구).
 */
function ResultRow({ row }: Readonly<{ row: MemberBulkChangeRow }>) {
  return (
    <div className="border-t border-hairline py-[9px] first:border-t-0">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {row.name ?? (
            /* 없는 회원이라 서버도 이름을 모른다 — 번호를 그대로 보여 줘야 운영자가 찾는다 */
            <span className="text-n500" title="이름을 알 수 없는 회원입니다 — 이미 삭제되었을 수 있습니다">
              회원 #{row.memberId}
            </span>
          )}
        </span>
        <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      </div>
      {/* 사유는 서버 문장 그대로다 — 건너뜀에도 붙는다. 화면이 코드로 문장을 다시 짓지 않는다 */}
      {row.reason && <div className="mt-[3px] text-[13px] text-n400">{row.reason}</div>}
      {row.warnings.length > 0 && (
        <div className="mt-[6px] flex flex-col gap-[4px] rounded-[10px] bg-amber-soft px-[10px] py-[7px]">
          {row.warnings.map((warning) => (
            <div key={warning.code} className="flex items-baseline gap-2 text-[13.5px] text-amber">
              <Badge tone="grey">{changeWarningLabel(warning.code)}</Badge>
              <span className="min-w-0">
                {warning.message} <span className="text-[12.5px]">({warning.count}건)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
