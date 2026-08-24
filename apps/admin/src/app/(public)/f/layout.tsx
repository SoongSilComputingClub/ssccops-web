import { AuthGate } from "@/features/auth";

/**
 * 공개 폼(/f/*) 게이트.
 *
 * 미들웨어는 "인증됐는가"까지만 가른다 — 미인증이면 /login?next=/f/{formId} 로 이미 걸러진다.
 * 여기서 남는 경우는 "구글 로그인은 했지만 아직 우리 회원이 아닌" 사용자이고, 그 판정은
 * 서버 세션 조회가 있어야 가능하므로 클라이언트 게이트인 AuthGate가 맡는다
 * (미들웨어에 두면 공개 폼 요청마다 백엔드 왕복이 하나 더 붙는다).
 *
 * 그래서 폼 화면 자체는 로그인·가입 여부를 전혀 몰라도 된다. 열렸다면 이미 회원이다.
 */
export default function PublicFormLayout({ children }: LayoutProps<"/f">) {
  /*
   * AuthGate의 로딩·오류 화면이 h-full/flex-1 기준이라, 기댈 높이를 여기서 준다.
   * 그 높이는 100vh가 아니라 dvh다 — 모바일 브라우저에서 100vh는 주소창이 접힌 큰 쪽으로
   * 고정되므로, 내용이 짧아도 화면이 주소창 높이만큼 늘 넘쳐 스크롤이 생기고 가운데 정렬한
   * 안내 화면이 아래로 밀린다(관리자 셸이 h-screen을 h-dvh로 바꾼 것과 같은 이유다, #85).
   */
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthGate>{children}</AuthGate>
    </div>
  );
}
