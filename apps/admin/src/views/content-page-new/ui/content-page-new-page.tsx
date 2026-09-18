"use client";

import { useRouter } from "next/navigation";
import type { ContentPageSaveInput } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ContentPageForm, useSaveContentPage } from "@/features/content";
import { ROUTES } from "@/shared/config/routes";
import { PageBody, PageHeader, flash } from "@/shared/ui";

/*
 * 페이지 만들기 (#521 · POST /v1/content/pages). 저장하면 **편집 화면으로** 간다 — 생성은 늘 초안이고
 * 게시는 그 화면의 전이 버튼이라, 목록으로 보내면 방금 만든 것을 다시 찾아 들어가야 한다.
 */
export function ContentPageNewPage() {
  const router = useRouter();
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);
  const save = useSaveContentPage();

  const submit = async (input: ContentPageSaveInput) => {
    const { value, message } = await save.create(input);
    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (value) router.replace(ROUTES.contentPageEdit(value.pageId));
  };

  return (
    <>
      <PageHeader title="페이지 만들기" subtitle="저장하면 초안이 됩니다" showBack />
      <PageBody>
        <ContentPageForm
          initial={null}
          busy={save.pending}
          canManage={canManage}
          submitLabel="초안으로 저장"
          onSubmit={(input) => void submit(input)}
        />
      </PageBody>
    </>
  );
}
