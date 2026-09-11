"use client";

import type { LmsShareTargetType } from "@/entities/share";
import { useShareLink } from "../model/use-share-link";

/*
 * 공유 버튼 (ssccops#253 · ADR-0016 · ADR-0017).
 *
 * **버튼이 말하는 것은 '지금 공유 중인가' 하나다.** 공유 전이면 [공유하기], 공유 중이면
 * [링크 복사]와 [공유 중지]다 — 만료가 없어(ADR-0016) '곧 죽는 링크' 같은 세 번째 상태가
 * 없고, 그래서 남은 시간을 보여줄 자리도 없다.
 *
 * **주소를 화면에 길게 늘어놓지 않는다.** 토큰이 43자라 좁은 화면에서 줄이 통째로 밀리고,
 * 사람이 그 문자열을 읽을 이유도 없다 — 필요한 것은 "손에 쥐어졌다"는 사실이며 그것은
 * 버튼 아래 한 줄이 전한다.
 *
 * ── `@ssccops/ui`로 올리지 않은 이유 (ssccops-web#322가 미뤄 둔 판단) ──
 * #322는 *"lms에 공유가 붙을 때(#253) 두 앱이 실제로 같은 것을 쓰고 있는지 보고 그때 올린다"*로
 * 남겼다. **보았고, 같은 것을 쓰고 있지 않았다.**
 *
 *   | | admin | lms |
 *   |---|---|---|
 *   | 버튼 | `shared/ui/button.tsx`(variant·size) | **없다** — 링크·버튼을 화면마다 tailwind로 적는다 |
 *   | 알림 | 전역 토스트 `flash`(zustand + `ToastViewport`) | **없다** — `Notice`나 화면 안의 문구 |
 *   | 공용 UI | 자기 것 한 벌 | `@ssccops/ui`(badge·card·field·markdown·notice)를 www와 공유 |
 *
 * `ShareButton`을 올리려면 `Button`과 `flash`를 함께 올려야 하고, 그것은 **admin의 버튼·토스트를
 * 세 앱의 공용 규약으로 만드는 결정**이다. 공유 기능이 정할 일이 아니라는 #322의 판단이 그대로
 * 유효하며, 오히려 근거가 하나 더 늘었다 — 지금 올리면 www·lms의 `@ssccops/ui`(둘이 실제로
 * 같은 것을 쓰고 있어서 올라간 것들 · ssccops#243)에 **아무도 쓰지 않는 admin 규약**이 섞인다.
 *
 * 그래서 이 파일은 lms의 것이다. **훅과 API는 형판을 그대로 옮겼고**(상태 기계·조사 처리·
 * `navigator.share` 분기까지) 갈린 것은 UI와 알림 통로뿐이다 — 다음에 세 번째 앱이 붙을 때
 * 올릴 것이 무엇인지가 이 파일들의 차이로 남는다.
 */
export function ShareButton({
  targetType,
  targetId,
  title,
}: Readonly<{
  targetType: LmsShareTargetType;
  targetId: number;
  title: string;
}>) {
  const { link, ready, pending, error, notice, share, revoke } = useShareLink(
    targetType,
    targetId,
    title,
  );

  /*
   * 최초 조회가 끝나기 전에는 아무 버튼도 그리지 않는다. [공유하기]를 먼저 그렸다가 조회 결과가
   * 도착하며 [공유 중지]로 바뀌면, 그 사이 누른 사람은 자기가 무엇을 눌렀는지 알 수 없다.
   */
  if (!ready) return null;

  return (
    <div className="flex flex-col items-end gap-[6px]">
      <div className="flex flex-wrap gap-[6px]">
        <button
          type="button"
          onClick={share}
          disabled={pending}
          className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {link ? "링크 복사" : "공유하기"}
        </button>
        {link && (
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className="whitespace-nowrap rounded-[12px] border border-line px-[12px] py-[6px] text-[13.5px] text-n400 hover:border-danger hover:text-danger disabled:opacity-50"
          >
            공유 중지
          </button>
        )}
      </div>
      {/*
       * 안내는 버튼 바로 아래에 둔다. 화면 어딘가로 띄우는 토스트가 이 앱에는 없고, 만들면
       * 공유 기능이 앱 전체의 알림 규약을 정하는 것이 된다 — 그 판단은 위 주석에 있다.
       */}
      {(error || notice) && (
        <output className={`block text-right text-[12.5px] ${error ? "text-danger" : "text-n500"}`}>
          {error ?? notice}
        </output>
      )}
    </div>
  );
}
