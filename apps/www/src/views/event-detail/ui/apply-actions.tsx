"use client";

import Link from "next/link";
import type { EventReceiptStatus } from "@/entities/event";
import type { MyFormResponse } from "@/entities/form";
import { useMyResponses } from "@/features/form";
import { ROUTES } from "@/shared/config/routes";
import { closedMessage } from "./closed-message";

/*
 * 신청 패널의 버튼 자리 — **내 응답 상태를 아는 쪽** (ssccops#278).
 *
 * 상세는 익명 SSR이라(OG · wave2 D7) 서버 컴포넌트가 "이 회원이 이미 냈는가"를 알 수 없다.
 * 그래서 늘 '신청하기'만 보였고, 누르면 신청 화면이 "이미 신청하셨습니다 → 내 신청"으로
 * 보내고, 내 신청 카드는 다시 행사 상세로 왔다 — **고리**였다. 낸 답을 볼 자리가 없었다.
 *
 * 패널 전체를 클라이언트로 내리지 않고 버튼 자리만 떼어 내렸다. 일시·장소·인원은 크롤러도
 * 읽어야 하는 값이라 SSR에 남는다.
 *
 * ── 로그인하지 않은 사람에게는 조회를 보내지 않는다 ─────────────
 * `fetchMyFormResponses`는 세션이 없으면 요청 없이 `CLIENT_UNAUTHENTICATED`를 던진다. 훅은
 * 그것을 error로 돌려주고, 여기서는 error를 **"낸 것이 없다"와 같게** 본다 — 두 경우 모두
 * 보여줄 것은 '신청하기'다. 조회 실패 때문에 신청 길을 막지 않는다.
 *
 * ── 확인 중에는 어느 버튼도 열지 않는다 ────────────────────────
 * '신청하기'를 먼저 그렸다가 응답이 오면 바꾸면, 누른 순간 버튼이 바뀐다. 익명 사용자는
 * 첫 효과에서 바로 끝나(요청이 나가지 않는다) 실제로 기다리는 것은 로그인한 사람 한 왕복뿐이다.
 *
 * ── 임시 저장만 있으면 "낸 것이 없다" ───────────────────────────
 * 신청 화면이 초안을 이어서 연다. 여기서 초안을 "제출 완료"로 읽으면 내지도 않은 것을 냈다고
 * 말하게 된다.
 *
 * ── 모집이 끝나도 낸 것은 본다 ──────────────────────────────────
 * '제출 완료 → 내용 보기'는 접수 상태와 무관하게 열린다. 막히는 것은 새로 내는 길뿐이다.
 */
export function ApplyActions({
  eventId,
  formId,
  receiptStatus,
  mltplRspnsYn,
}: {
  eventId: number;
  /** 연결 폼 — 없으면 이 컴포넌트가 그려지지 않는다(패널이 먼저 거른다) */
  formId: number;
  receiptStatus: EventReceiptStatus;
  mltplRspnsYn: boolean | null;
}) {
  const { status, responses } = useMyResponses(formId);
  const open = receiptStatus === "ACCEPTING";

  if (status === "loading") {
    return (
      <>
        <button
          type="button"
          disabled
          className="cursor-wait rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white opacity-45"
        >
          확인 중…
        </button>
        <p className="text-center text-[12.5px] leading-[1.6] text-n500">
          신청 여부를 확인하고 있습니다.
        </p>
      </>
    );
  }

  const mine = status === "ready" ? pickMine(responses) : null;

  if (mine === null) {
    return open ? (
      <>
        <Link href={ROUTES.eventApply(eventId)} className={PRIMARY}>
          신청하기
        </Link>
        <p className="text-center text-[12.5px] leading-[1.6] text-n500">
          신청은 회원만 할 수 있습니다 — 아직 회원이 아니어도 신청 화면에서 가입까지 마칠 수
          있습니다
        </p>
      </>
    ) : (
      <>
        <button
          type="button"
          disabled
          title={closedMessage(receiptStatus)}
          className="cursor-not-allowed rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white opacity-45"
        >
          신청하기
        </button>
        <p className="text-center text-[12.5px] leading-[1.6] text-n500">
          {closedMessage(receiptStatus)}
        </p>
      </>
    );
  }

  const responseHref = ROUTES.myFormResponse(formId, mine.formRspnsId);

  if (mine.rspnsSttsCd === "CHANGES_REQUESTED") {
    return (
      <>
        <Link href={responseHref} className={PRIMARY}>
          수정하기
        </Link>
        <p className="text-center text-[12.5px] leading-[1.6] text-n500">
          운영진이 수정을 요청했습니다 — 내용을 고쳐 다시 제출해주세요
        </p>
      </>
    );
  }

  return (
    <>
      <Link href={responseHref} className={PRIMARY}>
        제출 완료
      </Link>
      <p className="text-center text-[12.5px] leading-[1.6] text-n500">
        누르면 제출한 내용을 볼 수 있습니다.
      </p>
      {/*
        여러 건을 받는 신청서에서만 한 건 더 낼 수 있다. 모집이 끝났으면 이 길도 닫힌다 —
        낸 것을 보는 것과 새로 내는 것은 다른 일이라 위 버튼은 남고 이것만 사라진다.
      */}
      {mltplRspnsYn === true && open && (
        <Link href={ROUTES.eventApply(eventId)} className={SECONDARY}>
          추가 제출
        </Link>
      )}
    </>
  );
}

const PRIMARY =
  "rounded-xl bg-accent px-[16px] py-[12px] text-center text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong";
const SECONDARY =
  "rounded-xl border border-line bg-surface px-[16px] py-[11px] text-center text-[14.5px] font-semibold text-accent-strong transition-colors hover:bg-bg";

/**
 * 내 응답 가운데 버튼이 대표할 한 건.
 *
 * 수정 요청을 받은 건이 있으면 그것이다 — 지금 내가 해야 할 일이 거기 있다. 없으면 제출
 * 이후 상태 중 가장 나중 건(목록은 낸 순서라 마지막)이고, 초안뿐이면 없는 것으로 본다.
 */
function pickMine(responses: MyFormResponse[]): MyFormResponse | null {
  const submitted = responses.filter((r) => r.rspnsSttsCd !== "DRAFT");
  return (
    submitted.find((r) => r.rspnsSttsCd === "CHANGES_REQUESTED") ??
    submitted[submitted.length - 1] ??
    null
  );
}
