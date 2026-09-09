import { redirect } from "next/navigation";
import { loadSessionLanding } from "@/features/academic-session";
import { LoginGate } from "@/features/auth";
import { signupUrl, studioProgramSessionUrl } from "@/shared/config/routes";
import { EmptyState, Notice } from "@/shared/ui";

/*
 * 회차 공유 링크의 착지 해석기 (`/studio/sessions/{sessionId}` · #335 · 서버 #316·#319).
 *
 * ── 이것은 화면이 아니다 ───────────────────────────────────
 * 성공하면 아무것도 그리지 않고 활동 상세의 그 회차 자리로 넘긴다. 마크업이 있는 것은 넘길 수
 * 없을 때뿐이다(미로그인·미가입·없는 회차·조회 실패).
 *
 * ── 여기서 `redirect()`를 써도 되는 이유 ────────────────────
 * `apps/www`의 착지(`/s/{token}`)는 **서버 리다이렉트를 쓰지 않는다** — 307이 되면 크롤러가 OG
 * 태그가 담긴 HTML을 못 받아 카드가 통째로 안 만들어지기 때문이다. **그 제약은 여기 없다.**
 * 이 주소는 크롤러가 따라오는 자리가 아니라 사람이 이미 카드를 보고 누른 뒤에 닿는 자리이고,
 * 카드는 그전에 `/public/v1/share/{token}`이 이미 만들었다. 그리려는 내용도 없으므로 화면을 한
 * 번 그려 줄 이유가 없다.
 *
 * ── 미로그인이 막다른 길이 아니다 ──────────────────────────
 * 이 앱에는 밀어낼 로그인 화면이 없고 로그인은 보고 있는 화면 위에서 시작한다(www 규약). 그래서
 * 미로그인이면 `LoginGate`를 그리고, **로그인 뒤 같은 주소가 다시 그려지면 그때 해석이 끝나
 * 넘어간다** — 돌아올 곳을 따로 기억하지 않아도 되는 것이 이 구조의 덤이다.
 */
export async function SessionLandingPage({
  sessionId,
}: {
  sessionId: number | null;
}) {
  const result = await loadSessionLanding(sessionId);

  /*
   * `redirect()`는 내부적으로 예외를 던져 흐름을 끊는다 — 로더가 자기 안에서 이미 오류를 잡아
   * 결과값으로 돌려주므로 이 호출은 어떤 try/catch 안에도 있지 않다.
   */
  if (result.outcome === "ready") {
    redirect(studioProgramSessionUrl(result.academicProgramId, result.sessionId));
  }

  if (result.outcome === "unauthenticated") {
    return (
      <LoginGate
        title="로그인이 필요합니다"
        description="공유받은 회차는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해 주세요"
      />
    );
  }

  if (result.outcome === "signup-required") {
    const signup = signupUrl();
    return (
      <Notice
        title="회원 가입을 마쳐야 학술 활동 화면을 볼 수 있습니다"
        description="로그인은 되었지만 아직 동아리 회원으로 등록되지 않았습니다."
      >
        {signup && (
          <a
            href={signup}
            className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid hover:bg-accent-strong"
          >
            회원 가입하기
          </a>
        )}
      </Notice>
    );
  }

  if (result.outcome === "not-found") {
    return (
      <EmptyState
        title="회차를 찾을 수 없습니다"
        description="이미 삭제된 회차이거나 주소가 잘못됐을 수 있습니다 — 링크를 보낸 사람에게 다시 확인해주세요."
      />
    );
  }

  return <EmptyState title="회차를 불러오지 못했습니다" description={result.message} />;
}
