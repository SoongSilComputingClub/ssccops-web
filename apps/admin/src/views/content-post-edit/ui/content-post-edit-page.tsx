"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentPost, ContentPostSaveInput } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  ContentHistoryList,
  ContentPostForm,
  ContentPublishCard,
  useContentPost,
  useContentPostHistory,
  useContentPublish,
  useSaveContentPost,
} from "@/features/content";
import { contentListUrl } from "@/shared/config/routes";
import { Card, EmptyState, PageBody, PageHeader, Segmented, flash } from "@/shared/ui";

/*
 * 포스트 편집 (#521 · PATCH /v1/content/posts/{postId}). 구조는 페이지 편집과 같다 — 게시 카드 ·
 * «편집»/«이력» 탭 · 저장·전이 응답으로 갈아 끼우기(`replace`) · 409면 재조회.
 *
 * 갤러리·표지는 폼 안의 상태다(ContentPostForm 주석) — 올리기·지우기가 이 화면을 다시 부르지 않는다.
 * 저장 응답(`replace`)에 갤러리가 실려 오므로 저장 뒤 폼이 새로 마운트되어도 갤러리는 최신이다.
 */

const TABS = ["편집", "이력"] as const;
type Tab = (typeof TABS)[number];

function EditSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-2/5 rounded bg-fill" />
      <div className="mt-4 h-[200px] w-full rounded bg-fill" />
    </Card>
  );
}

export function ContentPostEditPage({ postId }: Readonly<{ postId: number }>) {
  const router = useRouter();
  const { item: post, status, errorMessage, reload, replace } = useContentPost(postId);
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);

  if (status !== "ready" || !post) {
    return (
      <>
        <PageHeader title="포스트 편집" showBack />
        <PageBody>
          {status === "loading" && <EditSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="없는 포스트입니다. 목록으로 돌아가주세요."
              action={{
                label: "콘텐츠 목록",
                onClick: () => router.replace(contentListUrl("posts")),
              }}
            />
          )}
          {status === "error" && (
            <EmptyState message={errorMessage} action={{ label: "다시 시도", onClick: reload }} />
          )}
        </PageBody>
      </>
    );
  }

  return (
    <ContentPostEditView post={post} canManage={canManage} reload={reload} replace={replace} />
  );
}

function ContentPostEditView({
  post,
  canManage,
  reload,
  replace,
}: Readonly<{
  post: ContentPost;
  canManage: boolean;
  reload: () => void;
  replace: (post: ContentPost) => void;
}>) {
  const [tab, setTab] = useState<Tab>("편집");
  /* 저장이 성공할 때마다 오른다 — 폼을 새로 마운트해 방금 저장한 값을 초깃값으로 삼는다 */
  const [formKey, setFormKey] = useState(0);
  const save = useSaveContentPost();
  const publish = useContentPublish();
  const history = useContentPostHistory();
  const busy = save.pending || publish.pending;

  const submit = async (input: ContentPostSaveInput) => {
    const { value, message } = await save.update(post.postId, input);
    if (!message) return; // 진행 중 중복 클릭
    flash(message);
    if (value) {
      replace(value);
      setFormKey((k) => k + 1);
    }
  };

  const transition = async (next: boolean) => {
    const { outcome, value, message } = await publish.post(post.postId, next);
    if (message) flash(message);
    if (outcome === "changed" && value) replace(value);
    if (outcome === "stale") reload();
  };

  return (
    <>
      <PageHeader title="포스트 편집" subtitle={post.ttl} showBack />
      <PageBody>
        <ContentPublishCard
          pubSttsCd={post.pubSttsCd}
          pubDt={post.pubDt}
          busy={busy}
          canManage={canManage}
          onTransition={(next) => void transition(next)}
        />
        <Segmented
          label="포스트 보기"
          options={TABS}
          value={tab}
          onChange={setTab}
          className="mb-4 w-[180px]"
        />
        {/* 편집 폼은 이력 탭에서도 접어 둘 뿐 언마운트하지 않는다 — 쓰던 본문·갤러리 상태를 지킨다 */}
        <div hidden={tab !== "편집"}>
          <ContentPostForm
            key={formKey}
            initial={post}
            postId={post.postId}
            busy={busy}
            canManage={canManage}
            submitLabel="저장"
            onSubmit={(input) => void submit(input)}
          />
        </div>
        {tab === "이력" && (
          <ContentHistoryList
            id={post.postId}
            status={history.status}
            items={history.items}
            errorMessage={history.errorMessage}
            load={history.load}
          />
        )}
        {post.mdfcnMbrNm && (
          <div className="mt-4 text-[12.5px] text-n500">마지막 수정 {post.mdfcnMbrNm}</div>
        )}
      </PageBody>
    </>
  );
}
