import { AuthGate } from "@/features/auth";

/**
 * 기획안 화면(/proposals/*) 게이트 (#163).
 *
 * 공개 폼(/f/*)의 게이트와 같은 구조다 — 미들웨어가 "인증됐는가"까지 가르고, "구글 로그인은
 * 했지만 아직 우리 회원이 아닌" 경우만 여기서 걸린다(그 판정에는 서버 세션 조회가 필요해
 * 미들웨어에 두면 요청마다 백엔드 왕복이 하나 더 붙는다).
 *
 * **기획안은 익명으로 낼 수 없다.** 응답 행이 회원을 가리키고(`form_rspns_hstry.mbr_id`),
 * 제출 현황도 "내가 낸 것"으로만 성립한다.
 *
 * 관리자 셸을 두르지 않는 것은 이 화면을 여는 사람이 운영진이 아니기 때문이다 — 사이드바를
 * 붙이면 갈 수 없는 운영 화면들이 목차에 늘어선다.
 */
export default function ProposalLayout({ children }: LayoutProps<"/proposals">) {
  /* 높이 기준은 100vh가 아니라 dvh다 — 모바일 주소창이 접히는 만큼 화면이 넘치는 것을 막는다 */
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthGate>{children}</AuthGate>
    </div>
  );
}
