"use client";

import {
  NOTIFICATION_APPS,
  NOTIFICATION_APP_LABEL,
  type NotificationApp,
} from "@/entities/notification-type";
import type { NotificationTypeRouteRow } from "@/features/notification-type";
import { Badge, Button } from "@/shared/ui";

/*
 * «설정 › 알림 유형»의 한 줄 — 유형 이름 · 앱 체크박스 셋 · 저장 (서버 #535 · ADR-0047).
 *
 * 페이지에서 떼어 둔 것은 한 줄이 쥔 갈래가 넷이기 때문이다(고쳤나 · 앱이 비었나 · 저장 중인가 ·
 * 권한이 있나). 페이지 안에 두면 map 콜백 하나가 그 넷을 모두 그려 인지 복잡도 한도를 넘는다.
 */

/** 저장을 막는 사유 — 없으면 빈 문자열. 버튼의 `title`이자 잠금 조건이다 */
function blockReason(row: NotificationTypeRouteRow, noManage: string): string {
  if (noManage) return noManage;
  if (row.apps.length === 0) return "앱을 최소 한 곳 선택해야 저장됩니다";
  if (!row.dirty) return "바뀐 것이 없습니다";
  return "";
}

export function NotificationTypeRow({
  row,
  canManage,
  noManage,
  onToggle,
  onReset,
  onSave,
  onClear,
}: Readonly<{
  row: NotificationTypeRouteRow;
  canManage: boolean;
  /** 권한이 없을 때 붙일 사유. 권한이 있으면 빈 문자열 */
  noManage: string;
  onToggle: (app: NotificationApp) => void;
  onReset: () => void;
  onSave: () => void;
  /** 기준표에서 빼 «보낸 앱 따름»으로 되돌린다 (#647) */
  onClear: () => void;
}>) {
  const reason = blockReason(row, noManage);
  const needsApp = row.apps.length === 0 && row.dirty;

  return (
    <div className="border-t border-hairline py-[14px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-[10px]">
        <div className="flex min-w-0 flex-[1_1_180px] flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium">{row.label}</span>
          {/*
            기준표에 행이 없는 유형 (ADR-0047). 체크를 하나라도 켜면 사라진다 — 그때 화면이
            말하는 것은 지금의 동작이 아니라 저장했을 때의 동작이다.
          */}
          {row.followsSendingApp && (
            <Badge tone="outline" title="이 유형의 알림은 그 알림을 보낸 앱에만 보입니다">
              보낸 앱을 따릅니다
            </Badge>
          )}
          {row.dirty && <Badge tone="amber">저장하지 않음</Badge>}
        </div>

        <div className="flex flex-none flex-wrap items-center gap-x-[14px] gap-y-2">
          {NOTIFICATION_APPS.map((app) => (
            <label
              key={app}
              className={
                canManage
                  ? "flex cursor-pointer items-center gap-[6px] text-[14.5px]"
                  : "flex cursor-default items-center gap-[6px] text-[14.5px] text-n400"
              }
              title={noManage || undefined}
            >
              <input
                type="checkbox"
                className="size-[17px] flex-none accent-accent disabled:cursor-not-allowed disabled:opacity-60"
                checked={row.apps.includes(app)}
                disabled={!canManage || row.saving}
                onChange={() => onToggle(app)}
              />
              {NOTIFICATION_APP_LABEL[app]}
            </label>
          ))}
        </div>

        <div className="flex flex-none items-center gap-3">
          {/*
            기준표에 행이 있는 줄에만 둔다 (#647 · 서버 #537). 이미 보낸 앱을 따르는 줄에서는
            누를 것이 없고, 서버가 멱등이라 200이 와서 «되돌렸습니다»만 뜬다.

            고친 값(`row.dirty`)과 무관하게 **저장된 값**을 따라 나타난다 — 이 버튼이 지우는
            것은 서버에 있는 행이고, 옆의 «되돌리기»가 버리는 것은 아직 보내지 않은 체크다.
          */}
          {row.registered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={!canManage || row.saving}
              title={noManage || "이 유형의 알림을 보낸 앱에만 보이게 되돌립니다"}
            >
              보낸 앱 따름으로
            </Button>
          )}
          {row.dirty && !row.saving && (
            <Button variant="link" onClick={onReset}>
              되돌리기
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={Boolean(reason) || row.saving}
            title={reason || undefined}
          >
            {row.saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </div>

      {/* 잠긴 버튼의 사유가 툴팁에만 있으면 터치에서는 아예 보이지 않는다 */}
      {needsApp && (
        <div className="mt-[6px] text-[13px] text-danger">
          앱을 최소 한 곳 선택해야 저장됩니다.
        </div>
      )}
    </div>
  );
}
