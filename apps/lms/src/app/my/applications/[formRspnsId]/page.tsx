import type { Metadata } from "next";
import { ProposalDetailPage } from "@/views/proposal-detail";

/**
 * /my/applications/{formRspnsId} — 기획안 상세·재제출 (#171).
 *
 * `app/`은 라우팅 전용이다 — 뷰(`views/proposal-detail`)를 얇게 감싼다. 응답 식별자만 경로에
 * 싣는다(폼 번호는 화면이 코드로 찾는다). 숫자가 아니거나 없으면 null로 넘겨 뷰가
 * "찾을 수 없음"을 그린다.
 *
 * 로그인 본인의 데이터라 캐시하지 않는다(`shared/api/client.ts`가 no-store).
 */
export const metadata: Metadata = {
  title: "기획안 상세",
};

function toId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function Page({
  params,
}: PageProps<"/my/applications/[formRspnsId]">) {
  const { formRspnsId } = await params;
  return <ProposalDetailPage formRspnsId={toId(formRspnsId)} />;
}
