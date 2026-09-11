import { Card } from "@ssccops/ui";

/*
 * 카드는 `@ssccops/ui`에서 온다 (ssccops#243).
 *
 * **`EmptyState`는 이 앱에 남는다.** 어드민에도 같은 이름이 있지만 그쪽은 `message`와 동작
 * 버튼(`action`)을 맨 div로 그리고, 이쪽은 `title`+`description`을 카드 안에 그린다 —
 * 이름만 같고 API도 모양도 다르다. 합치면 한쪽 화면이 바뀌므로 두 벌로 둔다.
 */
export { Card };

/** 값이 비었을 때의 안내 — 목록이 비었을 때와 조회가 실패했을 때 모두 이 모양으로 그린다 */
export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description?: string;
}>) {
  return (
    <Card className="flex flex-col items-center gap-[6px] px-[18px] py-[52px] text-center">
      <div className="text-[15px] text-n300">{title}</div>
      {description && <div className="text-[13.5px] text-n500">{description}</div>}
    </Card>
  );
}
