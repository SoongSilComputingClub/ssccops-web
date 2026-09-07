import type { Metadata } from "next";
import { FormResponsePage } from "@/views/form-response";

/**
 * 본인만 여는 화면이라 색인하지 않는다 — 공유할 것도 없고, 링크를 아는 사람이 열어도
 * 서버가 남의 응답을 404로 끊는다.
 */
export const metadata: Metadata = {
  title: "내가 낸 응답",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: PageProps<"/f/[formId]/responses/[formRspnsId]">) {
  const { formId, formRspnsId } = await params;
  return <FormResponsePage formId={Number(formId)} formRspnsId={Number(formRspnsId)} />;
}
