import { Suspense } from "react";
import { SignupGate } from "@/features/auth";
import { MemberLinkPage } from "@/views/signup";

/*
 * 기존(이관) 회원 계정 연결 (#58).
 *
 * 가입 화면과 **같은 게이트**를 쓴다 — 열려면 "인증됨 + 미가입"이어야 한다. 이미 가입한
 * 사용자가 이 주소를 열면 게이트가 되돌리고(연결은 미가입 계정만 하는 일이다), 미인증은
 * 미들웨어가 로그인으로 보낸다. 서버도 같은 판정을 하지만(409 `ALREADY_SIGNED_UP`) 그 전에
 * 화면을 열어 줄 이유가 없다.
 *
 * 게이트와 화면 둘 다 `?next=`를 읽으므로 Suspense 경계가 필요하다 — /signup과 같은 형태다.
 */
export default function Page() {
  return (
    <Suspense>
      <SignupGate>
        <MemberLinkPage />
      </SignupGate>
    </Suspense>
  );
}
