import eventsSeed from "./api/get-dashboard-events.json";
import type { CalEvent } from "./model/types";

export type { CalEvent } from "./model/types";

/** 캘린더 이벤트 — 읽기 전용 시드 */
export const CAL_EVENTS: CalEvent[] = eventsSeed.data as CalEvent[];
