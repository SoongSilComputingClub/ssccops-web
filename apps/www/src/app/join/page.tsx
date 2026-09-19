import type { Metadata } from "next";
import { CONTENT_SLUG } from "@/shared/config/content-slugs";
import { ROUTES } from "@/shared/config/routes";
import { ContentPage, contentPageMetadata } from "@/views/content-page";

const SLUG = CONTENT_SLUG.join;
const TITLE = "지원 안내";

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata(SLUG, TITLE);
}

export default function Page() {
  return (
    <ContentPage
      slug={SLUG}
      fallbackTitle={TITLE}
      tabs={{ axis: "join", pathname: ROUTES.join }}
      layout="steps"
    />
  );
}
