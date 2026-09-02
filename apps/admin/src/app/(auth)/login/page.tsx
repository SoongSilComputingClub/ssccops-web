import { Suspense } from "react";
import { LoginPage } from "@/views/login";

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
