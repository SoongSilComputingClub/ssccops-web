"use client";

import { useEffect } from "react";
import type { EventSttsCd } from "@/shared/config/codes";
import { publicEventUrl } from "@/shared/config/routes";
import { Button, flash } from "@/shared/ui";
import { useShareLink } from "../model/use-share-link";

/*
 * 행사 공유 버튼 (ssccops#254 · ssccops-server#312 · ssccops-web#338 · ADR-0016 · ADR-0017).
 *
 * **버튼 하나가 두 갈래로 동작한다.** 앞의 세 대상(하위 업무·업무·회의)은 건넬 것이 토큰
 * 링크 하나뿐이라 `ShareButton` 하나로 끝났지만, 행사는 상태에 따라 건넬 것이 다르다.
 *
 *   게시 전(DRAFT) → 토큰 링크 `/s/{token}` — 기획 중인 행사를 나눌 유일한 길이다
 *   게시됨         → 공개 주소 `/events/{eventId}` — 이미 익명이 여는 주소다
 *
 * **두 버튼을 나란히 두지 않는다.** 그러면 운영자가 무엇을 눌러야 하는지 판단해야 하는데,
 * 상태를 아는 것은 화면이고 화면이 정하면 된다.
 *
 * ── 왜 게시된 행사에 토큰을 씌우지 않는가 ───────────────────
 * 서버가 409 `EVENT_SHARE_NOT_DRAFT`로 막는다(ssccops-server PR #315). 게시된 행사에는 이미
 * 공개 주소가 있어 토큰이 더하는 것은 폐기 기능뿐인데, **그 폐기가 원본 공개 URL을 막지
 * 못한다** — "공유를 중지했다"는 화면의 표시가 사실이 아니게 된다. 거절이 아무 수단도 빼앗지
 * 않는다는 것이 근거의 나머지 절반이다.
 *
 * ── 무엇이 복사됐는지 화면이 말한다 ─────────────────────────
 * 이 컴포넌트가 버튼만 그리지 않고 안내 문구를 함께 그리는 이유다. 말하지 않으면 운영자가
 * **게시 전 링크를 공개 링크로 알고 뿌린다** — 게시 전 링크로는 제목과 요약만 열리므로,
 * 받은 사람은 행사 안내를 받은 줄 알고 본문을 못 본다.
 *
 * ── 게시된 행사에서도 '공유 중지'가 보인다 ──────────────────
 * 조회·폐기는 상태를 보지 않는다(서버도 그렇다). 게시 전에 발급한 링크는 게시 뒤에도 살아
 * 있고, 그때 화면이 그것을 보지 못하면 **폐기할 수단이 없어진다.**
 *
 * ── 보관된 행사에는 공유가 없다 ─────────────────────────────
 * 발급은 게시된 행사와 같은 409이고, 공개 주소도 익명에게 404다(보관된 행사는 공개 상세가
 * 닫힌다). 건넬 것이 없으므로 안내만 남기고, 남아 있는 토큰을 거두는 길만 열어 둔다.
 */

/** 상태 × 살아 있는 토큰 × 오리진 설정 → 버튼 옆에 상시로 서는 한 줄 */
function noticeOf(
  eventSttsCd: EventSttsCd,
  hasLink: boolean,
  publicUrl: string | null,
): string {
  if (eventSttsCd === "ARCHIVED") {
    return hasLink
      ? "보관된 행사는 새로 공유할 수 없습니다 — 게시 전에 만든 링크가 남아 있어 중지할 수 있습니다"
      : "보관된 행사는 공유할 수 없습니다 — 다시 게시하면 공개 주소가 열립니다";
  }

  if (eventSttsCd === "PUBLISHED") {
    if (!publicUrl) {
      return "공개 링크 주소가 설정되지 않았습니다 — 운영진에게 문의해 주세요";
    }
    return hasLink
      ? "게시된 행사라 누구나 여는 공개 주소를 건넵니다 — 게시 전에 만든 링크도 아직 살아 있습니다"
      : "게시된 행사라 누구나 여는 공개 주소를 건넵니다";
  }

  return hasLink
    ? "게시 전 링크를 공유 중입니다 — 받은 사람에게는 제목과 요약만 보이고 본문은 게시한 뒤에 열립니다"
    : "게시 전 행사라 공유 링크를 만들어 나눕니다 — 받은 사람에게는 제목과 요약만 보입니다";
}

export function EventShareButton({
  eventId,
  eventSttsCd,
  title,
}: {
  eventId: number;
  eventSttsCd: EventSttsCd;
  title: string;
}) {
  /*
   * 게시된 행사에서만 공개 주소를 건넨다. 오리진 설정이 비면 `null`이고, 그때는 발급으로
   * 떨어지지 않고 버튼을 아예 그리지 않는다 — 떨어뜨리면 서버가 409로 막아 사람이 영문
   * 모를 오류를 본다.
   */
  const publicUrl = eventSttsCd === "PUBLISHED" ? publicEventUrl(eventId) : null;

  const { link, ready, pending, error, delivery, share, revoke } = useShareLink(
    "EVENT",
    eventId,
    title,
    { publicUrl },
  );

  useEffect(() => {
    if (error) flash(error);
  }, [error]);

  useEffect(() => {
    if (!delivery) return;
    /*
     * **무엇을 건넸는지를 문구가 먼저 말한다.** 둘 다 "공유 링크를 복사했습니다"로 두면
     * 게시 전 링크와 공개 주소가 화면에서 구별되지 않는다.
     */
    const isPublic = delivery.target === "public";
    const what = isPublic ? "공개 링크" : "게시 전 공유 링크";
    const tail = isPublic
      ? "누구나 열 수 있는 주소입니다"
      : "받은 사람에게는 제목과 요약만 보입니다";
    flash(
      delivery.how === "copied"
        ? `${what}를 복사했습니다 — ${tail}`
        : `${what}를 전달했습니다 — ${tail}`,
    );
  }, [delivery]);

  /*
   * 최초 조회가 끝나기 전에는 아무것도 그리지 않는다 — 안내 문구까지 포함해서다. 살아 있는
   * 토큰이 있는지에 따라 문구가 갈리므로, 먼저 그렸다가 바뀌면 운영자가 읽은 문장이 손 아래에서
   * 뒤집힌다(`ShareButton`이 버튼에 대해 내린 판단과 같다).
   */
  if (!ready) return null;

  /*
   * 건넬 것이 있는가. 보관된 행사에는 없고(발급 409 · 공개 상세도 404), 게시됐는데 오리진
   * 설정이 비어도 없다. 그때도 아래 '공유 중지'는 남는다.
   */
  const canDeliver = eventSttsCd === "DRAFT" || publicUrl !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[200px] flex-1 text-[13.5px] text-n500">
        {noticeOf(eventSttsCd, link !== null, publicUrl)}
      </div>
      {canDeliver && (
        <Button variant="ghost" size="sm" onClick={share} disabled={pending}>
          {publicUrl ? "공개 링크 공유" : link ? "링크 복사" : "공유하기"}
        </Button>
      )}
      {link && (
        <Button variant="ghost-danger" size="sm" onClick={revoke} disabled={pending}>
          공유 중지
        </Button>
      )}
    </div>
  );
}
