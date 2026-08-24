"use client";

import { useState } from "react";
import {
  CHANGE_REASON_MAX,
  statusAllowsExpectedEndDate,
  type MemberChangeResult,
  type MemberDetail,
} from "@/entities/member";
import type { MbrGrdCd, MbrSttsCd } from "@/shared/config/codes";
import { todayInSeoul } from "@/shared/lib/date";
import { Chip, Field, Sheet, TextArea, TextField } from "@/shared/ui";
import { useMemberActions } from "../model/use-member-actions";
import { useMemberCodes } from "../model/use-member-codes";

/*
 * 회원 등급·상태 변경 시트 (#48 · 서버 #78).
 *
 * ── 왜 회원 정보 수정과 다른 화면인가 ───────────────────────────
 * 등급·상태는 변경 이력(mbr_grd_hstry · mbr_stts_hstry)을 함께 남겨야 하는 조작이라 서버가
 * 전용 엔드포인트로 열었다. 수정 화면에서 등급을 바꿀 수 있게 두면 **이력 없는 변경 경로**를
 * 화면이 만들어 내므로, 화면도 그 경계를 그대로 따른다.
 *
 * ── 선택지는 기준 코드 API로 그린다 ─────────────────────────────
 * `MBR_GRD_NM` 사전이나 목 스토어를 돌리지 않는다. 등급·상태는 기준정보 테이블이라 운영 중에
 * 이름·순서가 바뀔 수 있고, 서버에 없는 코드를 골라 보내면 400 `INVALID_CODE_VALUE`다 —
 * 고를 수 있는 값의 근거는 서버 한 곳이다(목록 화면의 필터 칩과 같은 훅을 쓴다).
 *
 * ── 저장 버튼을 미리 잠그는 세 자리 ─────────────────────────────
 * 현재와 같은 값(서버 400 `NO_CHANGE`) · 미래 적용 일자 · 적용 일자보다 앞선 종료 예정일.
 * 셋 다 서버가 거절할 입력이라 왕복하지 않는다. **판정 근거는 서버다** — 여기 규칙이 낡으면
 * 화면이 통과시킨 값이 서버에서 막힐 뿐 그 반대는 없다(오늘의 기준도 서버 시계다).
 */

export function GradeStatusSheet({
  member,
  kind,
  onClose,
  onChanged,
}: {
  /** 서버가 준 회원 — 현재 등급·상태의 근거다 */
  member: MemberDetail;
  kind: "grd" | "stts" | null;
  onClose: () => void;
  /** 변경 성공. 응답의 회원·경고를 상세 화면이 받아 뱃지와 이력을 갈아 끼운다 */
  onChanged: (result: MemberChangeResult) => void;
}) {
  const { grades, statuses, loading } = useMemberCodes();
  const { changeGrade, changeStatus, changing, changeErrorMessage, clearChangeError } =
    useMemberActions();

  /** null은 "아직 고르지 않았다" — 그때 화면이 보여 주는 것은 현재 값 그대로다 */
  const [pick, setPick] = useState<string | null>(null);
  const [appliedDate, setAppliedDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [reason, setReason] = useState("");

  if (!kind) return null;

  const isGrade = kind === "grd";
  const options = isGrade ? grades : statuses;
  const currentCode = isGrade ? member.membershipGradeCode : member.membershipStatusCode;
  const currentName = isGrade ? member.membershipGradeName : member.membershipStatusName;
  const selected = pick ?? (currentCode as string);

  /*
   * 종료 예정일은 휴학·군휴학에만 자리가 있다. 그 밖의 상태를 고르면 칸이 사라지고 값도 보내지
   * 않는다 — 실어 보내면 서버가 400으로 거절한다(조용히 버리지 않는 이유는 서버 요청 DTO 주석).
   */
  const endDateAllowed =
    !isGrade && statusAllowsExpectedEndDate(selected as MbrSttsCd);

  /* 미래 적용 일자는 서버가 400 VALIDATION_FAILED다 — 그 판정을 화면이 앞당겨 보여 줄 뿐이다 */
  const today = todayInSeoul();
  const futureApplied = appliedDate !== "" && appliedDate > today;
  /* 적용 일자보다 앞선 종료 예정일도 서버가 거절한다 */
  const endBeforeApplied =
    endDateAllowed &&
    expectedEndDate !== "" &&
    expectedEndDate < (appliedDate || today);

  const unchanged = selected === currentCode;
  const tooLongReason = reason.trim().length > CHANGE_REASON_MAX;

  const blockedReason = unchanged
    ? `이미 ${currentName}입니다 — 다른 값을 선택하세요`
    : futureApplied
      ? "적용 일자는 오늘 이후일 수 없습니다"
      : endBeforeApplied
        ? "종료 예정일은 적용 일자보다 앞설 수 없습니다"
        : tooLongReason
          ? `변경 사유는 ${CHANGE_REASON_MAX}자를 넘을 수 없습니다`
          : "";

  const close = () => {
    setPick(null);
    setAppliedDate("");
    setExpectedEndDate("");
    setReason("");
    clearChangeError();
    onClose();
  };

  /** 비어 있으면 보내지 않는다 — 적용 일자를 생략하면 서버가 자기 오늘로 채운다 */
  const dateOrNull = (value: string): string | null => (value === "" ? null : value);
  /*
   * 적지 않은 사유는 null이다. 예전에는 '사유 미기재'라는 문자열을 화면이 만들어 저장했는데,
   * 그것은 사유가 아니라 **사유가 없다는 사실**이라 이력에 사유처럼 남으면 안 된다.
   */
  const reasonOrNull = (): string | null => reason.trim() || null;

  const submit = async () => {
    const result = isGrade
      ? await changeGrade(member.memberId, {
          aftrMbrGrdCd: selected as MbrGrdCd,
          grdAplcnYmd: dateOrNull(appliedDate),
          grdChgRsnCn: reasonOrNull(),
        })
      : await changeStatus(member.memberId, {
          aftrMbrSttsCd: selected as MbrSttsCd,
          sttsAplcnYmd: dateOrNull(appliedDate),
          /* 허용 상태가 아니면 칸이 없었으므로 값도 없다 */
          sttsEndPrnmntYmd: endDateAllowed ? dateOrNull(expectedEndDate) : null,
          sttsChgRsnCn: reasonOrNull(),
        });

    /* 실패하면 시트를 닫지 않는다 — 사유가 방금 고른 값 옆에 남아 있어야 고칠 수 있다 */
    if (!result) return;
    onChanged(result);
    close();
  };

  return (
    <Sheet
      open
      title={isGrade ? "회원등급 변경" : "회원상태 변경"}
      hint={`현재 ${currentName} · 변경할 값을 선택하세요`}
      onClose={close}
      onOk={submit}
      okLabel={changing ? "변경 중…" : "변경"}
      okDisabled={changing || blockedReason !== ""}
      okTitle={blockedReason || undefined}
    >
      <Field label={isGrade ? "변경할 등급" : "변경할 상태"} required className="mb-4">
        {loading ? (
          /* 기준 코드가 아직 오지 않았다 — 코드 사전으로 임시로 그리면 서버에 없는 값을 고를 수 있다 */
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
                active={selected === option.code}
                onClick={() => {
                  setPick(option.code);
                  /* 값을 다시 고르면 서버가 준 낡은 거절 사유는 더 이상 맞지 않는다 */
                  clearChangeError();
                }}
              >
                {/* 현재 값임을 표시해 둔다 — 잠긴 저장 버튼의 이유가 칩에서도 보여야 한다 */}
                {option.name}
                {option.code === currentCode ? " (현재)" : ""}
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
          비워 두면 서버의 오늘로 기록됩니다
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
          placeholder="예: 정기 승급"
        />
      </Field>

      {/* 서버가 거절한 사유는 시트 안에 남긴다 — 토스트로 알리면 고른 값과 나란히 볼 수 없다 */}
      {changeErrorMessage && (
        <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] text-danger">
          {changeErrorMessage}
        </div>
      )}
    </Sheet>
  );
}
