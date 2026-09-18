"use client";

import { useRouter } from "next/navigation";
import type { ContentPostSaveInput } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ContentPostForm, useSaveContentPost } from "@/features/content";
import { ROUTES } from "@/shared/config/routes";
import { PageBody, PageHeader, flash } from "@/shared/ui";

/*
 * 포스트 만들기 (#521 · POST /v1/content/posts). 저장하면 편집 화면으로 간다 — 갤러리·표지는 저장한
 * 포스트에만 붙일 수 있어(발급 경로에 postId) 만든 직후 그 화면에서 이어 작업하는 것이 흐름이다.
 * 행사에서 만드는 길은 행사 수정 화면의 «포스트 만들기»다(from-event).
 */
export function ContentPostNewPage() {
  const router = useRouter();
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);
  const save = useSaveContentPost();

  const submit = async (input: ContentPostSaveInput) => {
    const { value, message } = await save.create(input);
    if (!message) return;
    flash(message);
    if (value) router.replace(ROUTES.contentPostEdit(value.postId));
  };

  return (
    <>
      <PageHeader title="포스트 만들기" subtitle="저장하면 초안이 됩니다" showBack />
      <PageBody>
        <ContentPostForm
          initial={null}
          postId={null}
          busy={save.pending}
          canManage={canManage}
          submitLabel="초안으로 저장"
          onSubmit={(input) => void submit(input)}
        />
      </PageBody>
    </>
  );
}
