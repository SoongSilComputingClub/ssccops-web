"use client";

import type { NotificationApp } from "@/entities/notification-type";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  useNotificationTypeRoutes,
  type NotificationTypeRouteRow,
} from "@/features/notification-type";
import { Card, EmptyState, PageBody, PageHeader, flash } from "@/shared/ui";
import { NotificationTypeRow } from "./notification-type-row";

/*
 * 알림 유형 (ssccops#465 · ADR-0047 · 서버 #535).
 *
 * 유형마다 «그 알림이 어느 앱에 보이는가»를 정한다. 조회·저장은 features/notification-type
 * (useNotificationTypeRoutes)이 전담하고 이 파일은 줄을 세우고 토스트를 띄우는 일만 한다.
 *
 * ── 왜 줄마다 저장인가 ─────────────────────────────────────────
 * 서버 계약이 유형 하나씩 전체 교체(PUT /v1/notifications/types/{type})라, 화면 전체를 한 번에
 * 저장하면 요청 열두 개가 나가고 그중 몇 개만 성공한 상태가 생긴다 — 그때 화면이 «무엇이
 * 저장됐나»를 말할 방법이 없다. 줄마다 누르면 성공·실패가 그 줄의 일로 끝난다.
 *
 * 그 대신 **고쳐 두고 저장하지 않은 줄**이 생기므로 그 상태를 눈에 보이게 한다 — «저장하지 않음»
 * 배지와 «되돌리기», 그리고 저장 버튼이 바뀐 줄에서만 켜진다.
 *
 * ── 권한 (ADR-0047 · 서버 컨트롤러) ────────────────────────────
 * 조회·저장 모두 SUPER다. 조회부터 막히므로 목차에서는 감추고(nav.ts), 주소를 직접 친 경우는
 * 첫 조회의 403 문구가 받는다. 화면 안의 조작을 useCan으로 한 번 더 잠그는 것은 권한이 화면을
 * 열어 둔 사이에 회수될 수 있기 때문이다 — 그 요청은 서버가 403으로 거절하고, 훅이
 * syncSessionOnForbidden으로 세션을 다시 받아 화면이 스스로 잠긴다.
 */

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE =
  "수신 앱을 바꿀 권한이 없습니다 — 최고 관리자(SUPER) 권한이 필요합니다";

export function NotificationTypeListPage() {
  const admin = useNotificationTypeRoutes();
  const canManage = useCan(CAPABILITY.SUPER);

  const save = async (row: NotificationTypeRouteRow) => {
    const message = await admin.save(row.type);
    if (message) {
      flash(message);
      return;
    }
    flash(`${row.label} 수신 앱을 저장했습니다`);
  };

  /*
   * 되돌리기 (#647 · DELETE). 확인 창을 두지 않는다 — 지우는 것은 기준표의 행이고 되돌아가는
   * 곳은 «보낸 앱에 보인다»라, 알림이 사라지지 않고 다시 체크해 저장하면 그만이다.
   */
  const clear = async (row: NotificationTypeRouteRow) => {
    const message = await admin.clear(row.type);
    if (message) {
      flash(message);
      return;
    }
    flash(`${row.label} 수신 앱을 보낸 앱 따름으로 되돌렸습니다`);
  };

  return (
    <>
      <PageHeader title="알림 유형" subtitle="알림이 보일 앱" />
      <PageBody>
        {/*
          안내 문단 — 대시 없이 문장으로, 한 문장에 한 가지. 정하지 않은 유형의 동작을 여기서
          한 번 말해 두면 줄마다 붙는 «보낸 앱을 따릅니다»가 무슨 뜻인지 읽힌다.
        */}
        <div className="mb-4 max-w-[720px] text-[14px] leading-[1.7] text-n400">
          유형마다 알림이 보일 앱을 정합니다. 정하지 않은 유형은 그 알림을 보낸 앱에만 보입니다.
          바꾼 내용은 줄마다 저장하며, 저장하면 목록과 푸시에 바로 반영됩니다. 한 번 정한 유형은
          «보낸 앱 따름으로»를 눌러 정하지 않은 상태로 되돌립니다.
        </div>
        {!canManage && <div className="mb-4 text-[13px] text-n500">{NO_MANAGE}</div>}

        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "알림 유형을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" &&
          (admin.rows.length === 0 ? (
            <EmptyState message="알림 유형이 없습니다." />
          ) : (
            <Card className="max-w-[720px] px-5 pt-1 pb-[6px]">
              {admin.rows.map((row) => (
                <NotificationTypeRow
                  key={row.type}
                  row={row}
                  canManage={canManage}
                  noManage={canManage ? "" : NO_MANAGE}
                  onToggle={(app: NotificationApp) => admin.toggleApp(row.type, app)}
                  onReset={() => admin.reset(row.type)}
                  onSave={() => void save(row)}
                  onClear={() => void clear(row)}
                />
              ))}
            </Card>
          ))}
      </PageBody>
    </>
  );
}
