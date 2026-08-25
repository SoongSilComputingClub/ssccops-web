"use client";

import { useState } from "react";
import { RSPNS_STTS_BADGE } from "@/entities/response";
import { CAPABILITY, hasCapability, useSessionStore } from "@/entities/session";
import {
  isRspnsSttsTerminal,
  RSPNS_RVW_TRGT_CDS,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import { Button, Card, Field, SectionLabel, Sheet, TextArea, flash } from "@/shared/ui";
import { useResponseReview } from "../model/use-response-review";

/**
 * 검토 처리 패널 (ssccops-server #141).
 *
 * 상태만 고르던 시트(`ResponseStatusSheet`)를 대체한다. 결론과 **왜 그렇게 했는가**를 한
 * 화면에서 적어 한 요청으로 보낸다 — 두 조작으로 나누면 상태는 바뀌었는데 사유가 없는 응답이
 * 남고, 이력 행은 잠겨 있어 나중에 채워 넣을 방법도 없다.
 *
 * 시트가 아니라 상세 안에 붙박이로 두는 것도 그 이유다. 검토 의견은 응답 내용을 보면서 쓰는
 * 글이라, 모달이 내용을 덮으면 무엇을 고치라고 적어야 하는지 보이지 않는다.
 *
 * ── 잠금은 셋이고 문구가 서로 다르다 ──────────────────────────
 * 권한 없음 · 제출 전 · 이미 처리를 마침. 사용자가 할 다음 행동이 각각 다르므로(역할을
 * 요청한다 · 기다린다 · 할 일이 없다) 한 문구로 뭉뚱그리지 않는다. **버튼은 감추지 않고
 * 잠근 채 사유를 `title`로 붙인다** — 이미 이 화면을 보고 있는 사람에게서 버튼만 사라지면
 * 기능이 없어진 것인지 권한 문제인지 알 수 없다.
 *
 * ── 성공 후 갱신은 재조회다 ────────────────────────────────────
 * 결론 하나가 상태 배지·처리 이력·폼 상세의 응답 요약 집계를 함께 움직이고, 그 파생값을
 * 화면이 다시 셀 수 없다. 전이 응답으로 부분 갱신하면 반려 직후 화면에 이전 사유가 남는다.
 *
 * ── 기획안 검토도 이 패널을 쓴다 (ssccops-web #164) ────────────
 * 기획안은 시스템 폼 한 벌의 응답이라 검토 규칙(의견 필수 여부 · 번복 없음 · 처리 후 재조회)이
 * 일반 응답과 **똑같다**. 그래서 두 번째 패널을 만들지 않고, 기획안에서만 달라지는 두 가지를
 * 선택 속성으로 받는다 — 승인만 따로 막는 사유(`acceptBlockReason`)와 승인이 무엇을 일으키는지
 * (`acceptNotice`). 패널을 복제하면 "승인·반려는 되돌릴 수 없다"는 규칙이 두 벌이 되어 한쪽만
 * 고쳐진다.
 */

/** 잠긴 조작에 붙는 사유 — 요구 권한을 이름으로 밝힌다 (#117) */
const NO_REVIEW =
  "응답을 심사할 권한이 없습니다 — 응답 심사(RESPONSE_REVIEW) 권한이 필요합니다";

/** 제출 전 답안 — 기다리면 풀린다 */
const NOT_SUBMITTED =
  "아직 제출되지 않은 응답입니다 — 응답자가 제출한 뒤에 심사할 수 있습니다";

/** 결론이 난 응답 — 서버가 400 INVALID_RESPONSE_STATUS_TRANSITION으로 거절한다 */
const ALREADY_REVIEWED = "이미 처리를 마친 응답입니다 — 승인·반려는 되돌릴 수 없습니다";

/** 의견 없이 수정요청·반려를 누르려 할 때. 서버가 400을 돌려주기 전에 화면이 먼저 알린다 */
const OPINION_REQUIRED =
  "검토 의견이 비어 있습니다 — 수정요청·반려는 무엇을 고쳐야 하는지 적어주세요";

/** 되돌릴 수 없는 결론을 고른 사람에게 마지막으로 한 번 더 알린다 */
const TERMINAL_WARNING = "승인·반려는 되돌릴 수 없습니다. 그대로 처리할까요?";

/** 수정요청은 되돌릴 수 있는 유일한 결론이라 경고 대신 다음에 일어날 일을 적는다 */
const CHANGES_NOTICE = "응답자가 내용을 고쳐 다시 낼 수 있게 됩니다. 그대로 처리할까요?";

/** 기본 안내 — 잠금 사유가 없을 때 패널 머리말에 선다 */
const DEFAULT_NOTICE =
  "결론과 검토 의견이 함께 기록됩니다. 승인·반려는 되돌릴 수 없습니다.";

export function ResponseReviewPanel({
  formId,
  formRspnsId,
  current,
  acceptBlockReason,
  acceptNotice,
  onReviewed,
}: {
  formId: number;
  formRspnsId: number;
  current: RspnsSttsCd;
  /**
   * 승인**만** 막는 사유. 있으면 승인 버튼이 잠기고 수정요청·반려는 그대로 열려 있다 (#164).
   *
   * 잠금 사유 셋(권한·제출 전·이미 처리)과 다른 축이라 따로 받는다 — 저쪽은 이 응답을 심사할
   * 수 없다는 뜻이지만 이쪽은 심사는 할 수 있고 **결론 하나가 지금 성립하지 않는다**는 뜻이다.
   * 기획안에서는 승인이 곧 학술 활동 생성이라, 이관이 성립하지 않는 기획안의 승인은 서버가
   * 400으로 되돌린다(서버 #150) — 그 왕복을 아끼고 검토자를 수정요청으로 돌린다.
   */
  acceptBlockReason?: string;
  /**
   * 승인 확인 시트에 덧붙일 문장 — 승인이 그 자리에서 무엇을 일으키는지.
   *
   * 일반 응답의 승인은 상태 하나가 바뀌는 일이지만 기획안의 승인은 데이터를 만든다. 확인 시트가
   * 그것을 말하지 않으면 검토자는 자기가 무엇을 만들었는지 모른 채 되돌릴 수 없는 조작을 한다.
   */
  acceptNotice?: string;
  /** 처리 성공 후 호출 — 호출부가 상세를 **통째로** 다시 부른다 */
  onReviewed: () => void;
}) {
  const { saving, review } = useResponseReview();
  /*
   * 판정 훅(features/auth의 useCan)을 쓰지 않고 세션을 직접 읽는다 — features끼리 가져오면
   * FSD 레이어가 깨진다. 판정 자체는 useCan과 같은 hasCapability라 규칙은 한 곳뿐이다.
   */
  const canReview = useSessionStore((s) =>
    hasCapability(s.member, CAPABILITY.RESPONSE_REVIEW),
  );

  const [opinion, setOpinion] = useState("");
  const [confirming, setConfirming] = useState<RspnsSttsCd | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const terminal = isRspnsSttsTerminal(current);
  /* 잠금 사유는 하나만 보여 준다 — 셋이 겹칠 때 사용자가 먼저 풀어야 하는 것부터 적는다 */
  const lockReason = !canReview
    ? NO_REVIEW
    : current === "DRAFT"
      ? NOT_SUBMITTED
      : terminal
        ? ALREADY_REVIEWED
        : "";

  const opinionFilled = opinion.trim().length > 0;

  /**
   * 이 결론을 지금 누를 수 있는가 — 잠금 사유가 있으면 그것이 답이고, 없으면 결론별 조건이다.
   *
   * 승인은 의견이 선택이라 여기서 걸리지 않는 대신 `acceptBlockReason`을 본다. 순서가 중요하다 —
   * 패널 전체가 잠긴 상태에서 승인만 다른 사유를 말하면 검토자는 고칠 수 없는 것을 고치려 든다.
   */
  const reasonFor = (cd: RspnsSttsCd): string => {
    if (lockReason) return lockReason;
    if (cd === "ACCEPTED") return acceptBlockReason ?? "";
    return opinionFilled ? "" : OPINION_REQUIRED;
  };

  const submit = (cd: RspnsSttsCd) => {
    void (async () => {
      const message = await review(formId, formRspnsId, {
        rspnsSttsCd: cd,
        rvwOpnnCn: opinion,
      });
      /*
       * 실패해도 확인 시트를 닫는다 — 사유는 패널 안에 뜨는데 시트가 그 위를 덮고 있으면
       * 무엇 때문에 거절됐는지 보이지 않는다. 적어 둔 의견은 지우지 않아 그대로 고쳐 다시
       * 누를 수 있다.
       */
      setConfirming(null);
      if (message) {
        setErrorMessage(message);
        return;
      }
      setOpinion("");
      setErrorMessage("");
      flash(`${RSPNS_STTS_BADGE[cd].label} 처리했습니다`);
      onReviewed();
    })();
  };

  return (
    <Card>
      <SectionLabel className="mb-1">검토 처리</SectionLabel>
      <div className="text-[13px] leading-[1.7] text-n500">
        {lockReason || DEFAULT_NOTICE}
      </div>

      {/*
        승인만 막힌 경우의 사유. 버튼의 title로도 붙지만 그것은 마우스를 올려야 보이고 터치에서는
        아예 보이지 않는다 — 승인이 왜 잠겼는지는 패널을 여는 순간 읽혀야 한다.
        패널 전체가 잠겼으면 그 사유가 이미 위에 있으므로 겹쳐 적지 않는다.
      */}
      {!lockReason && acceptBlockReason && (
        <div className="mt-3 rounded-[12px] border border-amber/40 bg-amber-soft px-3 py-[9px] text-[13.5px] leading-[1.7] text-amber">
          {acceptBlockReason}
        </div>
      )}

      <Field className="mt-4" label="검토 의견 (수정요청 · 반려 시 필수)">
        <TextArea
          value={opinion}
          disabled={Boolean(lockReason) || saving}
          onChange={(e) => {
            setOpinion(e.target.value);
            setErrorMessage("");
          }}
          placeholder="예: 학과와 학년이 서로 맞지 않습니다. 확인 후 다시 제출해주세요."
        />
        <div className="mt-[5px] text-[12.5px] leading-[1.7] text-n500">
          처리 이력에 그대로 남습니다. 승인은 적지 않아도 됩니다.
        </div>
      </Field>

      {/*
        Button은 whitespace-nowrap이라 자리가 모자라면 접히는 대신 글자가 테두리 밖으로 밀려
        나간다 — 375px에서는 조각 단위로 접히게 하고, lg 이상은 지금까지처럼 한 줄이다.
      */}
      <div className="mt-4 flex flex-wrap gap-2 lg:flex-nowrap">
        {RSPNS_RVW_TRGT_CDS.map((cd) => {
          const reason = reasonFor(cd);
          return (
            <Button
              key={cd}
              /* 반려만 늘 위험을 드러낸다 — 종결이고 응답자에게 되돌릴 길이 없다 */
              variant={
                cd === "ACCEPTED" ? "primary" : cd === "REJECTED" ? "ghost-danger" : "ghost"
              }
              disabled={Boolean(reason) || saving}
              title={reason || undefined}
              onClick={() => {
                setErrorMessage("");
                setConfirming(cd);
              }}
            >
              {RSPNS_STTS_BADGE[cd].label}
            </Button>
          );
        })}
      </div>

      {/* 서버가 거절한 사유는 패널 안에 남긴다 — 토스트로만 알리면 적은 의견과 나란히 볼 수 없다 */}
      {errorMessage && (
        <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] leading-[1.7] text-danger">
          {errorMessage}
        </div>
      )}

      <Sheet
        open={confirming !== null}
        title={confirming ? `${RSPNS_STTS_BADGE[confirming].label} 처리` : ""}
        /*
          승인이 무엇을 일으키는지는 호출부가 안다(일반 응답은 상태 하나가 바뀔 뿐이고 기획안은
          학술 활동을 만든다). 그 문장을 먼저 적고 되돌릴 수 없다는 경고로 닫는다 — 순서가
          반대면 무엇을 되돌릴 수 없다는 것인지 모른 채 경고부터 읽게 된다.
        */
        hint={
          confirming === "CHANGES_REQUESTED"
            ? CHANGES_NOTICE
            : confirming === "ACCEPTED" && acceptNotice
              ? `${acceptNotice} ${TERMINAL_WARNING}`
              : TERMINAL_WARNING
        }
        onClose={() => setConfirming(null)}
        onOk={() => {
          if (confirming) submit(confirming);
        }}
        okLabel={saving ? "처리 중…" : "처리"}
        okDisabled={saving}
      >
        <div className="rounded-[12px] border border-line bg-bg px-3 py-[9px] text-[14px] leading-[1.7] break-words">
          {opinion.trim() || (
            <span className="text-n500">검토 의견 없이 처리합니다</span>
          )}
        </div>
      </Sheet>
    </Card>
  );
}
