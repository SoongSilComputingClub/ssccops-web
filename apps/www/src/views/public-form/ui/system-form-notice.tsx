"use client";

import { useEffect } from "react";
import { systemFormNotice } from "@/entities/form";
import { lmsOrigin } from "@/shared/config/lms-routes";
import { Notice } from "@/shared/ui";

/*
 * 시스템 폼을 공개 주소로 열었을 때의 안내 (ssccops#417 · #555).
 *
 * 기획안 폼은 LMS의 제출 화면(`/proposals/new`)이 그린다 — 커리큘럼 줄 포맷·유형 선택지의 뜻 같은
 * 안내가 그쪽에 있고, 이 화면은 아무 폼이나 그리는 일반 응답 화면이다. 어드민이 공개 링크를
 * 숨겨도(ssccops#415) **이미 복사돼 돌아다니는 `/f/{key}`는 살아 있다.** 그 링크로 들어온 사람에게
 * 문항을 그려 주면 안내 없는 기획안을 쓰게 되고, 막기만 하면 갈 곳이 없다 — 그래서 LMS로 보낸다.
 *
 * ── 자동 이동 ─────────────────────────────────────────────────
 * 오리진이 있으면 마운트 즉시 옮겨 간다. 카드만 두고 누르게 하는 것보다 바로 보내는 편이 낫다 —
 * 링크를 받은 사람이 원한 것은 «기획안 제출»이고 이 화면은 그 길의 잘못된 입구일 뿐이다.
 * 목적지가 **남의 오리진**이라 `router.replace`가 아니라 `window.location.replace`다(공유 착지
 * `ShareLanding`과 같은 이유 — App Router의 이동은 앱 안 주소를 위한 것이다). `replace`인 것은 뒤로
 * 가기가 이 화면으로 돌아와 다시 튕기는 고리를 만들지 않기 위해서다.
 *
 * 버튼을 함께 두는 것은 자동 이동이 막히는 자리가 있어서다 — 인앱 브라우저가 이동을 삼키거나
 * 자바스크립트가 늦게 붙으면 사람이 직접 누를 것이 필요하다.
 *
 * **오리진이 없으면 이동도 버튼도 없다** — 죽은 주소로 보내지 않는다(`lms-routes.ts`의 규칙 ·
 * `/academic`의 CTA와 `/me`의 학술 카드가 같은 판단이다). 안내만 남긴다.
 */
export function SystemFormNotice({ sysFormCd }: Readonly<{ sysFormCd: string }>) {
  const notice = systemFormNotice(sysFormCd);
  const origin = lmsOrigin();
  const href = origin ? `${origin}${notice.lmsPath}` : null;

  useEffect(() => {
    if (href) window.location.replace(href);
  }, [href]);

  return (
    <Notice
      title={notice.title}
      description={
        href
          ? `${notice.description} LMS로 이동하고 있습니다.`
          : `${notice.description} LMS 주소가 설정되지 않았습니다. 운영진에게 문의해주세요.`
      }
    >
      {href && (
        <a
          href={href}
          className="rounded-xl bg-accent px-[16px] py-[12px] text-[15px] font-semibold text-on-solid transition-colors hover:bg-accent-strong"
        >
          {notice.action}
        </a>
      )}
    </Notice>
  );
}
