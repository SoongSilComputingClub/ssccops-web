import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ContactPage } from "@/views/contact";
import { contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.contact;
const TITLE = "문의";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

export default function Page() {
  return <ContactPage slug={SLUG} fallbackTitle={TITLE} />;
}
