import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  eventLoadErrorMessage,
  eventReceiptBadge,
  fetchPublicEvent,
  isEventNotFound,
  type PublicEventDetail,
} from "@/entities/event";
import { fetchAuthSession, type AuthSession } from "@/entities/session";
import { SignInButton } from "@/features/auth";
import { currentAccessToken, isUnauthenticated } from "@/shared/api/authed-client";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { ApplyFlow } from "./apply-flow";

/*
 * 본문 가로 상한은 공개 폼 계열이 **같은 값(860px)을 쓴다** — 한 곳만 고치지 말 것
 * (ssccops#153 · ssccops-web#203). 대상: admin의 public-form-page·proposal-list-page·
 * proposal-form-notice, www의 event-apply-page.
 *
 * lms의 proposal-new-page는 아직 720px이다 — 그 앱이 개발 중이라 이번 변경에서 뺐다.
 * 같은 성격의 화면이므로 개발이 끝나면 함께 860px로 맞출 것.
 *
 * 860px인 근거는 읽기 편한 줄 길이(한 줄 45~75자)다. 본문 글자가 15~16px이라 860px에서
 * 한 줄이 대략 60~70자로 그 범위에 든다. 더 넓히면 장문형 답변(textarea)에서 줄이 길어져
 * 시선이 되돌아오기 어렵고, 좁히면 선택지 많은 문항이 세로로만 늘어난다.
 *
 * **폭 제한을 푸는 것은 답이 아니다** — 문항은 단일 컬럼 세로 나열이라(QitemCard가 2단
 * 배치를 하지 않는다) 폭만 넓히면 짧은 입력칸이 화면 끝까지 늘어나 오히려 읽기 나빠진다.
 *
 * max-w는 상한이라 좁은 화면에서는 px-4가 그대로 지배한다 — 이 값은 PC에서만 효과가 있다.
 */

/*
 * 행사 참가 신청 (#154 · wave2 D2 · D3 · D15 · §8-4).
 *
 * ── 왜 한 주소 안에서 다 끝나는가 ─────────────────────────────
 * 신청 버튼 → 로그인 → 가입 → 폼 작성은 이탈이 가장 큰 구간이다(§8-4). 단계마다 화면을 나누면
 * 리다이렉트 왕복이 그만큼 늘고, 돌아올 곳을 단계 수만큼 관리해야 한다. 그래서 이 주소 하나가
 * 네 단계를 모두 그린다 — 로그인만 바깥(구글)을 다녀오고 **그 목적지도 이 주소다.**
 *
 * ── 서버에서 하는 판단과 브라우저에서 하는 일 ─────────────────
 * 행사가 신청을 받는가(D3)와 이 사람이 회원인가(D2)는 **서버에서** 본다 — 이 앱의 규약대로
 * 화면은 서버 컴포넌트이고, 세션 쿠키를 서버에서 읽으면 토큰이 브라우저 코드에 실리지 않는다.
 * 그 뒤 가입 폼과 신청서 작성만 클라이언트가 맡는다(`ApplyFlow`) — 답을 고칠 때마다 저장하고
 * 제출까지 해야 하는 화면이라 서버 렌더만으로는 그릴 수 없다.
 *
 * ── 리다이렉트를 걸지 않는다 ────────────────────────────────
 * 비로그인·미가입 모두 **이 화면 안에서** 안내한다. 밀어낼 로그인 화면이 이 앱에 없고, 억지로
 * 어딘가로 보내면 되돌아올 곳이 없어 왕복만 도는 길이 생긴다('내 신청'과 같은 규칙이다).
 */
export async function EventApplyPage({ eventId }: { eventId: number }) {
  let event: PublicEventDetail;
  try {
    event = await fetchPublicEvent(eventId);
  } catch (error) {
    // 게시되지 않은 행사와 없는 행사를 화면이 가르지 않는다 — 상세 화면과 같은 규칙이다
    if (isEventNotFound(error)) notFound();
    return (
      <ApplyShell event={null} eventId={eventId}>
        <EmptyState title={eventLoadErrorMessage(error)} />
      </ApplyShell>
    );
  }

  /*
   * 신청을 받지 않는 행사에서는 여기서 끝낸다 — 폼을 불러 보고 409를 받아 알아내지 않는다.
   * 상세 화면의 버튼과 **같은 조건**을 보므로 두 화면이 다른 말을 하지 않는다.
   */
  if (event.receiptStatus !== "ACCEPTING" || event.formId === null) {
    return (
      <ApplyShell event={event} eventId={eventId}>
        <ClosedNotice event={event} />
      </ApplyShell>
    );
  }

  const token = await currentAccessToken();
  if (!token) {
    return (
      <ApplyShell event={event} eventId={eventId}>
        <SignInNotice eventId={eventId} />
      </ApplyShell>
    );
  }

  return (
    <ApplyShell event={event} eventId={eventId}>
      <SignedInBody event={event} formId={event.formId} />
    </ApplyShell>
  );
}

/**
 * 회원 여부까지 확인한 뒤 작성 흐름을 연다.
 *
 * `/v1/auth/session`은 **미가입자에게도 200**을 준다(`signedUp: false`). 그래서 가입이
 * 필요하다는 것을 신청서 조회가 403으로 깨지고 나서 배우지 않아도 된다 — 세션이 곧바로 답한다.
 */
async function SignedInBody({
  event,
  formId,
}: {
  event: PublicEventDetail;
  formId: number;
}) {
  let session: AuthSession;
  try {
    session = await fetchAuthSession();
  } catch (error) {
    if (isUnauthenticated(error)) return <SessionExpiredNotice eventId={event.eventId} />;
    return <EmptyState title="신청을 시작하지 못했습니다 — 잠시 후 다시 시도해 주세요" />;
  }

  return (
    <ApplyFlow
      formId={formId}
      eventId={event.eventId}
      signedUp={session.signedUp}
      authUserEmail={session.authUser.email}
      authUserName={session.authUser.name}
    />
  );
}

/** 제목과 돌아갈 길을 고정으로 두른다 — 어느 단계에 서 있든 행사가 무엇인지 보여야 한다 */
function ApplyShell({
  event,
  eventId,
  children,
}: {
  event: PublicEventDetail | null;
  eventId: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-[14px]">
      <Link href={ROUTES.eventDetail(eventId)} className="text-[13.5px] text-accent-strong">
        ‹ 행사 안내로
      </Link>
      {event && (
        <header className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">
            {event.eventTtl}
          </h1>
          <p className="text-[13.5px] text-n500">참가 신청</p>
        </header>
      )}
      {children}
    </div>
  );
}

/**
 * 모집 중이 아닌 행사.
 *
 * 상태별로 **문구만** 갈린다 — 코드값은 어디에도 드러내지 않고, 표시명은 행사 슬라이스의
 * 배지 사전 한 곳에서 가져온다. 폼이 연결되지 않은 공지형 행사는 신청이라는 개념 자체가 없다.
 */
function ClosedNotice({ event }: { event: PublicEventDetail }) {
  const receipt = eventReceiptBadge(event.receiptStatus);

  if (event.receiptStatus === null || event.formId === null) {
    return (
      <Notice
        title="이 행사는 신청을 받지 않습니다"
        description="안내만 있는 행사입니다. 참여 방법이 따로 있다면 행사 안내에 적혀 있습니다."
      >
        <BackToEvent eventId={event.eventId} />
      </Notice>
    );
  }

  return (
    <Notice
      title={`지금은 신청을 받지 않습니다 — ${receipt?.label ?? "모집 준비 중"}`}
      description="모집이 열리면 이 화면에서 바로 신청할 수 있습니다. 행사 안내에서 일정을 확인해 주세요."
    >
      <BackToEvent eventId={event.eventId} />
    </Notice>
  );
}

/** 아직 로그인하지 않았다 — 이 화면의 기본 상태이지 오류가 아니다 */
function SignInNotice({ eventId }: { eventId: number }) {
  return (
    <Notice
      title="로그인하면 신청할 수 있습니다"
      description="행사 신청은 동아리 회원만 할 수 있습니다. 로그인한 뒤 이 화면으로 바로 돌아옵니다 — 아직 회원이 아니어도 여기서 가입까지 마칠 수 있습니다."
    >
      <SignInButton next={ROUTES.eventApply(eventId)} label="구글로 로그인" />
    </Notice>
  );
}

/** 토큰은 있는데 서버가 받아 주지 않았다 — 대개 만료다 */
function SessionExpiredNotice({ eventId }: { eventId: number }) {
  return (
    <Notice
      title="로그인이 만료되었습니다"
      description="보안을 위해 일정 시간이 지나면 로그인이 풀립니다. 다시 로그인하면 이어서 신청할 수 있습니다."
    >
      <SignInButton next={ROUTES.eventApply(eventId)} label="다시 로그인" />
    </Notice>
  );
}

function BackToEvent({ eventId }: { eventId: number }) {
  return (
    <Link
      href={ROUTES.eventDetail(eventId)}
      className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition-colors hover:bg-accent-strong"
    >
      행사 안내 보기
    </Link>
  );
}
