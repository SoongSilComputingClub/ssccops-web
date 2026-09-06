"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/*
 * 공유 링크 착지 화면 (ssccops#200).
 *
 * **이 화면은 사람에게 거의 보이지 않는다** — 마운트 즉시 상세로 옮겨 가기 때문이다. 그런데도
 * 실제 마크업을 그리는 이유는 크롤러가 받아야 할 것이 OG 태그가 담긴 HTML이기 때문이다.
 * 서버에서 `redirect()`로 보내면 응답이 307이 되어 카드가 통째로 만들어지지 않는다.
 *
 * **내용을 아무것도 싣지 않는다.** 제목 한 줄만 두는 것은 이 경로가 인증 밖에 있기 때문이며
 * (그래야 크롤러가 닿는다), 토큰이 주는 것은 미리보기까지라는 ADR-0016의 결정이 여기서
 * 지켜진다. 실제 내용은 이동한 뒤 권한 검사를 지나야 보인다.
 *
 * 링크를 함께 두는 것은 자동 이동이 막히는 자리가 있어서다 — 자바스크립트가 꺼져 있거나
 * 인앱 브라우저가 이동을 삼키면 사람이 직접 누를 것이 필요하다.
 */
export function ShareLanding({ title, href }: { title: string; href: string }) {
  const router = useRouter();

  useEffect(() => {
    /*
     * `replace`는 뒤로 가기를 눌렀을 때 이 화면으로 되돌아와 다시 앞으로 튕기는 고리를
     * 만들지 않는다 — 사람이 가려던 곳은 상세이고 이 화면은 지나가는 자리다.
     */
    router.replace(href);
  }, [href, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-[17px] font-medium">{title}</div>
      <div className="text-[13.5px] text-n400">업무 상세로 이동하고 있습니다</div>
      <Link href={href} className="text-[13.5px] text-accent underline">
        바로 열기
      </Link>
    </div>
  );
}
