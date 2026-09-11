import type { Metadata } from "next";
import { PublicFormDonePage } from "@/views/public-form";

/**
 * 제출을 마친 사람만 오는 화면이라 색인하지 않는다 — 공유할 것도 없다.
 * 카드가 필요한 것은 폼 자체(`/f/{formId}`)뿐이다.
 */
export const metadata: Metadata = {
  title: "제출 완료",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: Readonly<PageProps<"/f/[formId]/done">>) {
  const { formId } = await params;
  return <PublicFormDonePage formId={Number(formId)} />;
}
