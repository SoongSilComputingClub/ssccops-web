"use client";

import { useEffect } from "react";
import { Button, flash } from "@/shared/ui";
import { useShareLink } from "../model/use-share-link";

/*
 * 하위 업무 공유 버튼 (ssccops#200 · ADR-0016).
 *
 * **버튼이 말하는 것은 '지금 공유 중인가' 하나다.** 공유 전이면 [공유하기], 공유 중이면
 * [링크 복사]와 [공유 중지]다 — 만료가 없어(ADR-0016) '곧 죽는 링크' 같은 세 번째 상태가
 * 없고, 그래서 남은 시간을 보여줄 자리도 없다.
 *
 * **주소를 화면에 길게 늘어놓지 않는다.** 토큰이 43자라 좁은 화면에서 줄이 통째로 밀리고,
 * 사람이 그 문자열을 읽을 이유도 없다 — 필요한 것은 "손에 쥐어졌다"는 사실이며 그것은
 * 토스트가 전한다.
 */
export function ShareButton({ subWorkId, title }: { subWorkId: number; title: string }) {
  const { link, ready, pending, error, delivery, share, revoke } = useShareLink(subWorkId, title);

  useEffect(() => {
    if (error) flash(error);
  }, [error]);

  useEffect(() => {
    /*
     * 무엇으로 건넸는지에 따라 문구가 갈린다 — 복사인데 "공유했습니다"라고 하면 사용자는
     * 이미 보낸 줄 알고, 공유 시트를 띄웠는데 "복사했습니다"라고 하면 붙여넣을 곳을 찾는다.
     */
    if (delivery === "copied") flash("공유 링크를 복사했습니다 — 메신저에 붙여 넣으세요");
    if (delivery === "shared") flash("공유 링크를 전달했습니다");
  }, [delivery]);

  /*
   * 최초 조회가 끝나기 전에는 아무 버튼도 그리지 않는다. [공유하기]를 먼저 그렸다가 조회 결과가
   * 도착하며 [공유 중지]로 바뀌면, 그 사이 누른 사람은 자기가 무엇을 눌렀는지 알 수 없다.
   */
  if (!ready) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" onClick={share} disabled={pending}>
        {link ? "링크 복사" : "공유하기"}
      </Button>
      {link && (
        <Button variant="ghost-danger" size="sm" onClick={revoke} disabled={pending}>
          공유 중지
        </Button>
      )}
    </div>
  );
}
