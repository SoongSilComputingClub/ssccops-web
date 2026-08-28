import type { Metadata } from "next";
import { MyProgramsPage } from "@/views/my-programs";

/**
 * /studio/programs — 내 활동 (#188 · #192).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/my-programs`)를 얇게 감싼다. 상단 드롭다운으로 활동을
 * 고르므로 `?programId=`를 읽어 넘긴다(없으면 목록 맨 위). `/studio/programs/{id}`(직접 링크)는
 * 별도 라우트로 유지된다.
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "내 활동",
};

function toId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  searchParams,
}: PageProps<"/studio/programs">) {
  const params = await searchParams;
  return <MyProgramsPage academicProgramId={toId(params.programId)} />;
}
