import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ContentPage, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.joinHistory;
const TITLE = "지난 모집";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

export default function Page() {
  return <ContentPage slug={SLUG} fallbackTitle={TITLE} />;
}
