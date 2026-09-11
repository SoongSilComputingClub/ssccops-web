"use client";

import { useEffect } from "react";

/*
 * 공유 링크 착지 화면 (ssccops#200 · ssccops#253 · ADR-0017).
 *
 * **이 화면은 사람에게 거의 보이지 않는다** — 마운트 즉시 상세로 옮겨 가기 때문이다. 그런데도
 * 실제 마크업을 그리는 이유는 크롤러가 받아야 할 것이 OG 태그가 담긴 HTML이기 때문이다.
 * 서버에서 `redirect()`로 보내면 응답이 307이 되어 카드가 통째로 만들어지지 않는다.
 *
 * **내용을 아무것도 싣지 않는다.** 제목 한 줄만 두는 것은 이 경로가 인증 밖에 있기 때문이며
 * (그래야 크롤러가 닿는다), 토큰이 주는 것은 미리보기까지라는 ADR-0016의 결정이 여기서
 * 지켜진다. 실제 내용은 이동한 뒤 권한 검사를 지나야 보인다.
 *
 * ── 어드민의 같은 화면과 갈리는 것: 목적지가 남의 오리진이다 ──
 * 어드민에서는 상세가 같은 앱이라 `next/link`와 `router.replace`로 옮겨 간다. 여기서는
 * 목적지가 lms라 **앱 내부 이동이 아니다** — App Router의 `router.replace`는 외부 주소를
 * 다루지 않으므로 `window.location.replace`를 쓰고, 링크도 `Link`가 아니라 `<a>`다.
 * `replace`인 것은 어드민과 같은 이유다: 뒤로 가기가 이 화면으로 돌아와 다시 앞으로 튕기는
 * 고리를 만들지 않는다.
 *
 * 링크를 함께 두는 것은 자동 이동이 막히는 자리가 있어서다 — 자바스크립트가 꺼져 있거나
 * 인앱 브라우저가 이동을 삼키면 사람이 직접 누를 것이 필요하다.
 *
 * `href`가 `null`인 경우가 있다 — lms 오리진 설정이 비었을 때다(`lmsOrigin()`). 그때는
 * 이동도 링크도 없이 제목만 남긴다. **카드는 그대로 만들어지고**(메타는 이 컴포넌트와 무관하다)
 * 사람에게는 죽은 주소 대신 이유를 보여 준다.
 */
export function ShareLanding({ title, href }: Readonly<{ title: string; href: string | null }>) {
  useEffect(() => {
    if (href) window.location.replace(href);
  }, [href]);

  return (
    <div className="flex flex-col items-center gap-[10px] px-[18px] py-[64px] text-center">
      <div className="text-[17px] font-medium">{title}</div>
      {href ? (
        <>
          <div className="text-[13.5px] text-n500">상세 화면으로 이동하고 있습니다</div>
          <a href={href} className="text-[13.5px] text-accent underline">
            바로 열기
          </a>
        </>
      ) : (
        <div className="text-[13.5px] text-n500">
          이동할 주소가 설정되지 않았습니다 — 운영진에게 문의해 주세요
        </div>
      )}
    </div>
  );
}
