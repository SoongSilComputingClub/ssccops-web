import { SignupGate } from "@/features/auth";
import { SignupPage } from "@/views/signup";

export default function Page() {
  return (
    <SignupGate>
      <SignupPage />
    </SignupGate>
  );
}
