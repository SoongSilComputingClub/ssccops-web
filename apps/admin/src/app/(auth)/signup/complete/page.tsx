import { Suspense } from "react";
import { SignupCompletePage } from "@/views/signup";

// 완료 화면이 `?next=`(가입 후 돌아갈 곳)를 읽으므로 Suspense 경계가 필요하다
export default function Page() {
  return (
    <Suspense>
      <SignupCompletePage />
    </Suspense>
  );
}
