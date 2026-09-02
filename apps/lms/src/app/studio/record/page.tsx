import type { Metadata } from "next";
import { SessionRecordPage } from "@/views/session-record";

/**
 * /studio/record — 회차 기록 작성 (#128).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/session-record`)를 얇게 감싼다. 대상은 `?programId=`
 * (활동)와 `?curriculumItemId=`(그 활동의 커리큘럼 항목)로 받는다. 숫자가 아니거나 없으면 null로
 * 넘겨 뷰가 대시보드 안내를 그린다.
 *
 * `searchParams`를 읽으므로 요청 시점 렌더다 — 회차 정보는 로그인한 본인의 데이터라 어차피
 * 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "회차 기록",
};

function toId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({ searchParams }: PageProps<"/studio/record">) {
  const params = await searchParams;
  return (
    <SessionRecordPage
      academicProgramId={toId(params.programId)}
      curriculumItemId={toId(params.curriculumItemId)}
    />
  );
}
