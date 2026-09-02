import type { Metadata } from "next";
import { ProgramMembersPage } from "@/views/program-members";

/**
 * /studio/members — 팀원 관리 (#131).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/program-members`)를 얇게 감싼다. 대상 활동은
 * `?programId=`로 받는다(스터디장이 여러 활동을 맡을 수 있어 주소에 실린다). 숫자가 아니거나
 * 없으면 null로 넘겨 뷰가 대시보드 안내를 그린다.
 *
 * `searchParams`를 읽으므로 이 페이지는 요청 시점 렌더다 — 팀원 명단은 로그인한 본인의
 * 데이터라 어차피 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "팀원 관리",
};

function toProgramId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({ searchParams }: PageProps<"/studio/members">) {
  const params = await searchParams;
  return <ProgramMembersPage academicProgramId={toProgramId(params.programId)} />;
}
