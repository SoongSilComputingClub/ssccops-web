"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { findContentPage, operatorsCohortPath, parseOperatorsCohort } from "@ssccops/content";
import type { ContentPageSaveInput } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ContentPageForm, useSaveContentPage } from "@/features/content";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState, PageBody, PageHeader, flash } from "@/shared/ui";

/*
 * 페이지 만들기 (#521 · POST /v1/content/pages) — **카탈로그의 자리 하나**로만 연다(#534 · ssccops#392).
 * `?slug=`가 카탈로그 항목이거나 기수 패턴(`operators-{n}`)일 때만 폼이 뜨고, 그 밖의 슬러그(없음 ·
 * 표에 없는 이름)는 목록으로 안내한다. 저장하면 **편집 화면으로** 간다 — 생성은 늘 초안이고 게시는
 * 그 화면의 전이 버튼이라, 목록으로 보내면 방금 만든 것을 다시 찾아 들어가야 한다.
 */
export function ContentPageNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);
  const save = useSaveContentPage();

  const slug = searchParams.get("slug") ?? "";
  const entry = findContentPage(slug);
  const cohort = entry ? null : parseOperatorsCohort(slug);
  const seat = entry
    ? { title: entry.title, path: entry.path }
    : cohort != null
      ? { title: `${cohort}기 운영진`, path: operatorsCohortPath(cohort) }
      : null;

  const submit = async (input: ContentPageSaveInput) => {
    const { value, message } = await save.create(input);
    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (value) router.replace(ROUTES.contentPageEdit(value.pageId));
  };

  if (!seat) {
    return (
      <>
        <PageHeader title="페이지 만들기" showBack />
        <PageBody>
          <EmptyState
            message="페이지는 목록의 자리에서 엽니다."
            action={{ label: "콘텐츠 목록", onClick: () => router.replace(ROUTES.content) }}
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`${seat.title} 만들기`} subtitle="저장하면 초안이 됩니다" showBack />
      <PageBody>
        <ContentPageForm
          initial={null}
          slug={slug}
          path={seat.path}
          defaultTitle={seat.title}
          busy={save.pending}
          canManage={canManage}
          submitLabel="초안으로 저장"
          onSubmit={(input) => void submit(input)}
        />
      </PageBody>
    </>
  );
}
