"use client";

import { Button } from "@/shared/ui";

/**
 * «다시 시도» — 지금 주소를 다시 부른다. 워커가 `/offline`을 대신 내준 것이라 주소창은 원래 가려던
 * 화면이고, 연결이 돌아왔으면 그 화면이 뜬다. 서버 컴포넌트인 페이지에 onClick을 둘 수 없어 따로다.
 */
export function RetryButton() {
  return (
    <Button className="mt-6" onClick={() => window.location.reload()}>
      다시 시도
    </Button>
  );
}
