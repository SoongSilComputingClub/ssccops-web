"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentPage, ContentPageSaveInput } from "@/entities/content";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  ContentHistoryList,
  ContentPageForm,
  ContentPublishCard,
  useContentPage,
  useContentPageHistory,
  useContentPublish,
  useSaveContentPage,
} from "@/features/content";
import { ROUTES } from "@/shared/config/routes";
import { Card, EmptyState, PageBody, PageHeader, Segmented, flash } from "@/shared/ui";

/*
 * 페이지 편집 (#521 · PATCH /v1/content/pages/{pageId}).
 *
 * 게시·게시 취소도 이 화면에 있다(상세 화면이 따로 없다 — 행사와 같은 판단). 탭은 «편집»·«이력» —
 * 이력은 탭을 열 때만 부른다(useContentHistory 주석).
 *
 * 상세 조회가 ready가 되기 전에는 폼을 마운트하지 않는다(useState 초깃값 = 폼 초깃값). 저장·전이의
 * 응답은 상세 전체라 **재조회 없이 갈아 끼운다**(`replace`) — 저장 뒤 폼이 다시 마운트되므로 방금
 * 저장한 값이 곧 초깃값이 된다. 같은 상태로의 재전이(409 · 낡은 화면)만 다시 부른다.
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

export function ContentPageEditPage({ pageId }: Readonly<{ pageId: number }>) {
  const router = useRouter();
  const { item: page, status, errorMessage, reload, replace } = useContentPage(pageId);
  const canManage = useCan(CAPABILITY.CONTENT_MANAGE);

  if (status !== "ready" || !page) {
    return (
      <>
        <PageHeader title="페이지 편집" showBack />
        <PageBody>
          {status === "loading" && <EditSkeleton />}
          {status === "not-found" && (
            <EmptyState
              message="없는 페이지입니다. 목록으로 돌아가주세요."
              action={{ label: "콘텐츠 목록", onClick: () => router.replace(ROUTES.content) }}
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
    <ContentPageEditView page={page} canManage={canManage} reload={reload} replace={replace} />
  );
}

function ContentPageEditView({
  page,
  canManage,
  reload,
  replace,
}: Readonly<{
  page: ContentPage;
  canManage: boolean;
  reload: () => void;
  replace: (page: ContentPage) => void;
}>) {
  const [tab, setTab] = useState<Tab>("편집");
  /* 저장이 성공할 때마다 오른다 — 폼을 새로 마운트해 방금 저장한 값을 초깃값으로 삼는다 */
  const [formKey, setFormKey] = useState(0);
  const save = useSaveContentPage();
  const publish = useContentPublish();
  const history = useContentPageHistory();
  const busy = save.pending || publish.pending;

  const submit = async (input: ContentPageSaveInput) => {
    const { value, message } = await save.update(page.pageId, input);
    if (!message) return; // 진행 중 중복 클릭
    flash(message);
    if (value) {
      replace(value);
      setFormKey((k) => k + 1);
    }
  };

  const transition = async (next: boolean) => {
    const { outcome, value, message } = await publish.page(page.pageId, next);
    if (message) flash(message);
    if (outcome === "changed" && value) replace(value);
    if (outcome === "stale") reload();
  };

  return (
    <>
      <PageHeader title="페이지 편집" subtitle={page.ttl} showBack />
      <PageBody>
        <ContentPublishCard
          pubSttsCd={page.pubSttsCd}
          pubDt={page.pubDt}
          busy={busy}
          canManage={canManage}
          onTransition={(next) => void transition(next)}
        />
        <Segmented options={TABS} value={tab} onChange={setTab} className="mb-4 w-[180px]" />
        {/*
          편집 폼은 이력 탭에서도 언마운트하지 않고 접는다 — 탭을 오가는 사이 쓰던 본문이 사라지면
          안 된다. 이력은 탭을 열 때 마운트되어 그때 부른다.
        */}
        <div hidden={tab !== "편집"}>
          <ContentPageForm
            key={formKey}
            initial={page}
            busy={busy}
            canManage={canManage}
            submitLabel="저장"
            onSubmit={(input) => void submit(input)}
          />
        </div>
        {tab === "이력" && (
          <ContentHistoryList
            id={page.pageId}
            status={history.status}
            items={history.items}
            errorMessage={history.errorMessage}
            load={history.load}
          />
        )}
        {page.mdfcnMbrNm && (
          <div className="mt-4 text-[12.5px] text-n500">마지막 수정 {page.mdfcnMbrNm}</div>
        )}
      </PageBody>
    </>
  );
}
