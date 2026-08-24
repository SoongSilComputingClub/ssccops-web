import { Suspense } from "react";
import { SignupGate } from "@/features/auth";
import { SignupPage } from "@/views/signup";

/*
 * 게이트와 화면 둘 다 `?next=`(가입 후 돌아갈 곳)를 읽는다. useSearchParams는 정적
 * 프리렌더에서 Suspense 경계를 요구하므로 여기서 한 번 감싸 준다 — /login과 같은 형태다.
 */
export default function Page() {
  return (
    <Suspense>
      <SignupGate>
        <SignupPage />
      </SignupGate>
    </Suspense>
  );
}
