"use client";

import { useEffect } from "react";
import type { ShareTargetType } from "@ssccops/share-meta";
import { Button, flash } from "@/shared/ui";
import { useShareLink } from "../model/use-share-link";

/*
 * 공유 버튼 (ssccops#200 · ssccops#250 · ADR-0016 · ADR-0017).
 *
 * **버튼이 말하는 것은 '지금 공유 중인가' 하나다.** 공유 전이면 [공유하기], 공유 중이면
 * [링크 복사]와 [공유 중지]다 — 만료가 없어(ADR-0016) '곧 죽는 링크' 같은 세 번째 상태가
 * 없고, 그래서 남은 시간을 보여줄 자리도 없다.
 *
 * **주소를 화면에 길게 늘어놓지 않는다.** 토큰이 43자라 좁은 화면에서 줄이 통째로 밀리고,
 * 사람이 그 문자열을 읽을 이유도 없다 — 필요한 것은 "손에 쥐어졌다"는 사실이며 그것은
 * 토스트가 전한다.
 *
 * **대상은 props로 받는다.** 하위 업무에 박혀 있던 것을 걷어낸 것이 ssccops#250이며, 대상별로
 * 갈리는 경로·문구·착지 앱은 전부 `@ssccops/share-meta`의 표가 갖는다 — 새 화면에 붙일 때
 * 하는 일은 대상 종류와 식별자를 건네는 것뿐이다.
 *
 * ── `@ssccops/ui`로 올리지 않은 이유 ────────────────────────
 * 올리려면 `Button`과 `flash`가 세 앱에 있어야 하는데 **둘 다 admin에만 있다** — `Button`은
 * 공유 패키지의 헤더가 이미 "admin에만 있다 — 중복이 아니다"로 적어 둔 것이고, 토스트도
 * admin의 `shared/ui/toast.tsx`(zustand 스토어 + 루트의 `ToastViewport`) 하나뿐이라
 * www·lms에는 전역 토스트라는 것 자체가 없다(그쪽은 화면마다 `useState` 문구를 쓴다).
 * 지금 올리면 이 버튼이 그 둘까지 함께 끌고 올라가 **admin의 버튼·토스트를 세 앱의 공용 규약으로
 * 만드는 결정**이 되는데, 그것은 공유 기능이 정할 일이 아니다. lms에 공유가 붙을 때
 * (`ssccops#253`) 두 앱이 실제로 같은 것을 쓰고 있는지 보고 그때 올린다 — 공유 패키지에
 * **둘 이상이 실제로 같은 것을 쓰고 있던 것만** 올린다는 규칙(ssccops#243)이 그것이다.
 */
export function ShareButton({
  targetType,
  targetId,
  title,
}: {
  targetType: ShareTargetType;
  targetId: number;
  title: string;
}) {
  const { link, ready, pending, error, delivery, share, revoke } = useShareLink(
    targetType,
    targetId,
    title,
  );

  useEffect(() => {
    if (error) flash(error);
  }, [error]);

  useEffect(() => {
    /*
     * 무엇으로 건넸는지에 따라 문구가 갈린다 — 복사인데 "공유했습니다"라고 하면 사용자는
     * 이미 보낸 줄 알고, 공유 시트를 띄웠는데 "복사했습니다"라고 하면 붙여넣을 곳을 찾는다.
     *
     * `delivery.target`은 여기서 보지 않는다 — 이 버튼이 건네는 것은 언제나 토큰 링크
     * 하나다. 건넬 것이 둘인 대상(행사)은 자기 버튼을 갖는다(`EventShareButton`).
     */
    if (delivery?.how === "copied") flash("공유 링크를 복사했습니다 — 메신저에 붙여 넣으세요");
    if (delivery?.how === "shared") flash("공유 링크를 전달했습니다");
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
