import type { ReactNode } from "react";
import { fetchAuthSession, type AuthSession } from "@/entities/session";
import { SignInButton } from "@/features/auth";
import { currentAccessToken, isUnauthenticated } from "@/shared/api/authed-client";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";
import { PublicFormFlow } from "./public-form-flow";

/*
 * 공개 폼 (`/f/{formId}`) — 링크를 아는 회원이 답을 내는 화면 (ssccops#214).
 *
 * ── 어드민에서 옮겨 오며 달라진 것 ────────────────────────────
 * 어드민에서는 미들웨어가 미인증 요청을 `/login`으로 밀어내고 `AuthGate`가 미가입을 걸러,
 * 이 화면이 열렸다면 이미 회원이었다. **이 앱에는 그 두 장치가 없다** — 미들웨어는 세션 쿠키만
 * 갱신하고 리다이렉트를 하지 않으며(`@ssccops/auth/supabase/proxy`), 밀어낼 로그인 화면도 없다.
 * 그래서 로그인·가입 여부를 이 화면이 직접 보고 **같은 주소 안에서** 안내한다 — 행사 신청
 * (`event-apply-page`)이 먼저 밟은 길이며, 단계마다 화면을 나누면 돌아올 곳을 단계 수만큼
 * 관리해야 한다.
 *
 * ── 서버에서 하는 판단 ───────────────────────────────────────
 * "로그인했는가"(쿠키의 토큰)와 "회원인가"(`/v1/auth/session`)는 **서버 컴포넌트에서** 본다.
 * 이 앱의 규약대로이고, 세션 쿠키를 서버에서 읽으면 토큰이 브라우저 코드에 실리지 않는다.
 * 그 뒤 가입 폼과 답 작성만 클라이언트가 맡는다 — 답을 고칠 때마다 저장해야 하는 화면이라
 * 서버 렌더만으로는 그릴 수 없다.
 *
 * ── 행사 신청과 갈리는 지점 ──────────────────────────────────
 * 돌아갈 행사가 없다. 그래서 접수 불가·오류 안내에 '행사 안내로' 같은 출구가 없고, 대신
 * 여러 건을 받는 폼(`mltplRspnsYn`)일 수 있어 제출 내역을 함께 그린다.
 */

/*
 * 본문 가로 상한 860px은 공개 폼 계열이 **같은 값을 쓴다** — 한 곳만 고치지 말 것
 * (ssccops#153 · ssccops-web#203). 대상: 이 화면과 `event-apply-page`.
 *
 * 860px인 근거는 읽기 편한 줄 길이(한 줄 45~75자)다. 본문 글자가 15~16px이라 860px에서 한 줄이
 * 대략 60~70자로 그 범위에 든다. 더 넓히면 장문형 답변에서 시선이 되돌아오기 어렵고, 좁히면
 * 선택지 많은 문항이 세로로만 늘어난다. **폭 제한을 푸는 것은 답이 아니다** — 문항은 단일 컬럼
 * 세로 나열이라(`QitemCard`가 2단 배치를 하지 않는다) 폭만 넓히면 짧은 입력칸이 화면 끝까지
 * 늘어나 오히려 읽기 나빠진다. max-w는 상한이라 좁은 화면에서는 px-4가 그대로 지배한다.
 */
export async function PublicFormPage({ formId }: { formId: number }) {
  if (!Number.isInteger(formId) || formId <= 0) {
    return (
      <PublicFormShell>
        <EmptyState title="잘못된 주소입니다 — 링크를 다시 확인해 주세요" />
      </PublicFormShell>
    );
  }

  const token = await currentAccessToken();
  if (!token) {
    return (
      <PublicFormShell>
        <Notice
          title="로그인이 필요합니다"
          description="이 폼은 SSCC 회원만 답을 낼 수 있습니다. 로그인하면 이어서 작성할 수 있습니다."
        >
          <SignInButton next={ROUTES.publicForm(formId)} />
        </Notice>
      </PublicFormShell>
    );
  }

  return (
    <PublicFormShell>
      <SignedInBody formId={formId} />
    </PublicFormShell>
  );
}

/**
 * 회원 여부까지 확인한 뒤 작성 흐름을 연다.
 *
 * `/v1/auth/session`은 **미가입자에게도 200**을 준다(`signedUp: false`). 그래서 가입이
 * 필요하다는 것을 폼 조회가 403으로 깨지고 나서 배우지 않아도 된다 — 세션이 곧바로 답한다.
 */
async function SignedInBody({ formId }: { formId: number }) {
  let session: AuthSession;
  try {
    session = await fetchAuthSession();
  } catch (error) {
    if (isUnauthenticated(error)) {
      return (
        <Notice
          title="로그인이 만료되었습니다"
          description="다시 로그인하면 작성 중이던 답을 이어서 쓸 수 있습니다."
        >
          <SignInButton next={ROUTES.publicForm(formId)} label="다시 로그인" />
        </Notice>
      );
    }
    return <EmptyState title="폼을 여는 데 실패했습니다 — 잠시 후 다시 시도해 주세요" />;
  }

  return (
    <PublicFormFlow
      formId={formId}
      signedUp={session.signedUp}
      authUserEmail={session.authUser.email}
      authUserName={session.authUser.name}
    />
  );
}

/** 어느 단계에 서 있든 같은 폭·여백을 두른다 — 돌아갈 행사가 없어 머리말은 두지 않는다 */
function PublicFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-[14px]">{children}</div>
  );
}
