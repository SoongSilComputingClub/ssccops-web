import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { ContentPage, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.operators;
const TITLE = "운영진";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

export default function Page() {
  return (
    <ContentPage
      slug={SLUG}
      fallbackTitle={TITLE}
      tabs={{ axis: "operators", pathname: ROUTES.operators }}
    />
  );
}
