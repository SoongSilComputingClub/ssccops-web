import type { Metadata } from "next";
import { AttendanceRosterPage } from "@/views/attendance-roster";

/**
 * /studio/roster — 출석부 (회차별 참석 현황 행렬 · #172).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/attendance-roster`)를 얇게 감싼다. 대상 활동은
 * `?programId=`로 받는다(스터디장이 여러 활동을 맡을 수 있어 주소에 실린다). 숫자가 아니거나
 * 없으면 null로 넘겨 뷰가 대시보드 안내를 그린다.
 *
 * `searchParams`를 읽으므로 요청 시점 렌더다 — 출석부는 로그인한 본인의 데이터라 어차피
 * 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "출석부",
};

function toProgramId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({ searchParams }: PageProps<"/studio/roster">) {
  const params = await searchParams;
  return <AttendanceRosterPage academicProgramId={toProgramId(params.programId)} />;
}
