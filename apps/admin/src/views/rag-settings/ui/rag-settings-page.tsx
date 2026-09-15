"use client";

import { useEffect, useState } from "react";
import {
  RAG_APPLY_STATUS_NM,
  RAG_APPLY_STATUS_TONE,
  RAG_DOCUMENT_TYPE_NM,
  RAG_INDEX_STATUS_NM,
  RAG_INDEX_STATUS_TONE,
  formatFileSize,
  type RagDocument,
} from "@/entities/rag-document";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  NO_RAG_DOCUMENT_MANAGE,
  RagUploadDialog,
  useRagDocuments,
  useRagUpload,
} from "@/features/rag-document";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Card,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  SearchInput,
  StatBox,
  type GridColumn,
} from "@/shared/ui";
import { RagApplyConfirm, RagDeleteConfirm } from "./rag-confirm-sheets";

/*
 * RAG 설정 — 규정 도우미가 참조할 문서를 등록하고 색인 상태를 관리한다 (#432).
 *
 * ── 이 화면이 없으면 코퍼스를 바꾸는 길이 없다 ──────────────────
 * 서버는 문서를 **업로드로만** 받는다(레포 커밋도 Gradle 태스크도 없다). 그래서 규정 개정을
 * 반영하는 사람이 «권한을 가진 운영진»이 되는 것이 이 화면에 달려 있다.
 *
 * ── 상태가 두 축이다 ────────────────────────────────────────────
 * 색인 진행(대기·색인 중·색인 완료·실패)과 적용 여부(개정안·시행 중·옛 판본)를 **다른 열로**
 * 그린다. 한 열에 섞으면 「색인은 끝났지만 아직 시행 전인 개정안」을 표현할 수 없는데, 올린
 * 문서는 전부 그 상태로 들어온다 — 첫 업로드 대상이 바로 그것이다.
 *
 * ── 권한 (서버 클래스 레벨 @RequireAuthority) ──────────────────
 * 코퍼스 API는 **목록 조회까지 전부** RAG_DOCUMENT_MANAGE다. 그래서 사이드바에서는 이 메뉴를
 * 감추고(nav.ts), 주소를 직접 쳐서 들어온 경우 목록 조회 자체가 403이라 표 대신 그 사유가
 * 오류 자리에 뜬다 — 템플릿 관리와 같은 자리다.
 */

/** 검색 디바운스 — 서버 `q`를 부르므로 글자마다 보내지 않는다 (회의 안건 검색과 같은 값) */
const SEARCH_DEBOUNCE_MS = 300;

export function RagSettingsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /* 첫 렌더의 초기값이 빈 문자열이라 화면 진입 조회는 디바운스를 기다리지 않는다 */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const admin = useRagDocuments(debouncedQuery);
  const upload = useRagUpload();
  /* 업로드·재색인·삭제·적용 전환이 전부 같은 권한 하나다 — 서버가 그렇게 걸어 두었다 */
  const canManage = useCan(CAPABILITY.RAG_DOCUMENT_MANAGE);

  /** 확인 대화상자의 대상 — 열려 있는 동안에도 폴링이 돌므로 행이 아니라 번호로 되짚는다 */
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [applyTargetId, setApplyTargetId] = useState<number | null>(null);

  const find = (ragDocId: number | null) =>
    ragDocId === null
      ? null
      : (admin.documents.find((d) => d.ragDocId === ragDocId) ?? null);
  const deleteTarget = find(deleteTargetId);
  const applyTarget = find(applyTargetId);

  /*
   * 재색인은 **확인 없이 바로**다 — 되돌릴 것이 없고 결과가 같다(#432). 삭제·적용 전환만
   * 확인을 받는다: 삭제는 되살리는 길이 없고, 시행 전환은 되돌릴 수는 있지만 그 사이의
   * 답변이 바뀐다.
   */
  const lockReason = canManage ? undefined : NO_RAG_DOCUMENT_MANAGE;

  const columns: GridColumn<RagDocument>[] = [
    {
      key: "name",
      header: "문서명",
      width: "2.2fr",
      mobilePrimary: true,
      render: (d) => (
        <div className="min-w-0">
          <div className="truncate font-medium" title={d.originalFileName || d.name}>
            {d.name || d.originalFileName || "-"}
          </div>
          {/*
           * 판본 번호와 유형은 이름 아래에 붙인다. 같은 문서의 판본이 여러 줄로 서는 표라
           * 번호가 없으면 어느 줄이 최신인지 이름만으로는 갈리지 않는다.
           */}
          <div className="mt-[2px] truncate text-[12.5px] text-n500">
            {`v${d.version} · ${RAG_DOCUMENT_TYPE_NM[d.docType]}`}
            {d.documentCode ? ` · ${d.documentCode}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "fileSize",
      header: "크기",
      width: ".7fr",
      mobileHide: true,
      render: (d) => <span className="text-n400">{formatFileSize(d.fileSize)}</span>,
    },
    {
      key: "chunkCount",
      header: "청크",
      width: ".8fr",
      // 색인이 끝나야 채워진다 — 없는 값을 0으로 채우면 «청크가 0개인 문서»와 갈리지 않는다
      render: (d) => (
        <span className="text-n400">
          {d.chunkCount === null ? "—" : `${d.chunkCount}개 청크`}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "등록일",
      width: "1fr",
      mobileHide: true,
      render: (d) => <span className="text-n400">{formatYmd(d.createdAt)}</span>,
    },
    {
      key: "indexStatus",
      header: "상태",
      width: "1fr",
      render: (d) => (
        <Badge
          tone={RAG_INDEX_STATUS_TONE[d.indexStatus]}
          /*
           * 실패 사유는 툴팁에 싣는다 — 표 한 칸에 펼치면 행 높이가 사유 길이만큼 들쭉날쭉해지고,
           * 실패는 드문 상태라 늘 자리를 차지할 이유가 없다.
           */
          title={d.failureReason ?? undefined}
        >
          {RAG_INDEX_STATUS_NM[d.indexStatus]}
          {d.indexStatus === "FAILED" && d.failureReason ? " ⓘ" : ""}
        </Badge>
      ),
    },
    {
      key: "applyStatus",
      header: "적용",
      width: "1fr",
      render: (d) => (
        <Badge
          tone={RAG_APPLY_STATUS_TONE[d.applyStatus]}
          title={
            d.applyStatus === "EFFECTIVE" && d.effectiveFrom
              ? `${formatYmd(d.effectiveFrom)} 시행`
              : undefined
          }
        >
          {RAG_APPLY_STATUS_NM[d.applyStatus]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "조작",
      width: "200px",
      align: "right",
      render: (d) => {
        const busy = admin.isBusy(d.ragDocId);
        /*
         * «시행 중으로»는 색인 완료가 아니면 잠근다 — 서버가 409 RAG_DOCUMENT_NOT_INDEXED로
         * 막는 자리이고, 받고 나서 안내하는 것보다 미리 잠그고 이유를 붙이는 편이 낫다(#432).
         */
        const notIndexed = d.indexStatus !== "INDEXED";
        const applyLabel = d.applyStatus === "EFFECTIVE" ? "내리기" : "시행";
        const applyTitle = !canManage
          ? NO_RAG_DOCUMENT_MANAGE
          : d.applyStatus === "SUPERSEDED"
            ? "옛 판본은 되돌릴 수 없습니다 — 같은 파일을 새 판본으로 올려주세요"
            : notIndexed && d.applyStatus === "DRAFT"
              ? "색인이 끝난 판본만 시행 중으로 올릴 수 있습니다"
              : undefined;

        return (
          <div className="flex items-center justify-end gap-3 text-[14px]">
            {/* 권한이 없으면 감추지 않고 잠근다 — 근거는 features/auth/model/use-can.ts */}
            <button
              type="button"
              disabled={
                !canManage ||
                busy ||
                d.applyStatus === "SUPERSEDED" ||
                (d.applyStatus === "DRAFT" && notIndexed)
              }
              title={applyTitle}
              onClick={() => setApplyTargetId(d.ragDocId)}
              className="cursor-pointer whitespace-nowrap text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applyLabel}
            </button>
            <button
              type="button"
              disabled={!canManage || busy}
              title={lockReason}
              onClick={() => void admin.reindex(d)}
              className="cursor-pointer whitespace-nowrap text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              재색인
            </button>
            <button
              type="button"
              disabled={!canManage || busy}
              title={lockReason}
              onClick={() => setDeleteTargetId(d.ragDocId)}
              className="cursor-pointer whitespace-nowrap text-n400 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="RAG 설정"
        subtitle="규정 도우미가 참조할 문서를 등록하고 색인 상태를 관리합니다"
        action={{
          label: "+ 문서 업로드",
          onClick: upload.openDialog,
          disabled: !canManage,
          title: lockReason,
        }}
      />
      <PageBody maxWidth={1180}>
        {admin.status === "loading" && <EmptyState message="불러오는 중…" />}
        {admin.status === "error" && (
          <EmptyState
            message={admin.errorMessage || "규정 문서를 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: admin.reload }}
          />
        )}

        {admin.status === "ready" && (
          <>
            {/*
             * 카드 셋은 **목록 응답의 요약을 그대로 쓴다** — 별도 요청을 하지 않는다(#432).
             * 나누면 두 요청 사이에 색인이 끝나 카드와 표가 다른 시점을 가리킨다. 검색어로
             * 걸러도 이 값은 코퍼스 전체이므로 «표에 세 줄인데 등록 문서가 4»가 정상이다.
             */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatBox label="등록 문서" value={admin.summary.registeredCount} size="lg" />
              <StatBox
                label="색인 완료"
                value={admin.summary.indexedCount}
                tone="accent"
                size="lg"
              />
              <StatBox label="총 청크" value={admin.summary.totalChunkCount} size="lg" />
            </div>

            {admin.actionErrorMessage && (
              <div className="mt-3 text-[13.5px] text-danger">
                {admin.actionErrorMessage}
              </div>
            )}

            <Card className="mt-4 px-5 pt-4 pb-[6px]">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="text-[17px] font-medium">지식 문서</div>
                <div className="flex-1" />
                {/* 검색은 서버 q 파라미터다 — 클라이언트 필터가 아니라 (#432) */}
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="문서명 검색"
                  className="w-full lg:w-[260px]"
                />
              </div>

              <GridTable
                columns={columns}
                rows={admin.documents}
                rowKey={(d) => String(d.ragDocId)}
                empty={
                  <EmptyState
                    message={
                      debouncedQuery
                        ? "검색 결과가 없습니다."
                        : "등록된 문서가 없습니다."
                    }
                  />
                }
              />
            </Card>

            <div className="mt-3 text-[13px] leading-[1.8] text-n500">
              올린 문서는 «개정안»으로 들어와 색인이 끝나도 답변에 쓰이지 않습니다 — «시행»을
              눌러야 도우미가 그 판본을 근거로 답합니다. 같은 문서의 새 판본을 시행하면 이전
              판본은 «옛 판본»으로 내려갑니다.
              {/*
               * 폴링 중이라는 사실을 알린다 — 배지가 «대기»인 채로 멈춰 보이면 운영진이 새로고침을
               * 누르거나 재색인을 다시 누른다(그쪽은 400이다).
               */}
              {admin.polling && (
                <span className="text-n400">
                  {" "}
                  색인이 진행 중인 문서가 있어 잠시 뒤 자동으로 상태를 다시 확인합니다.
                </span>
              )}
            </div>
          </>
        )}
      </PageBody>

      <RagUploadDialog upload={upload} onUploaded={() => void admin.refresh()} />

      <RagDeleteConfirm
        target={deleteTarget}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={(doc) => {
          setDeleteTargetId(null);
          void admin.remove(doc);
        }}
      />
      <RagApplyConfirm
        target={applyTarget}
        onClose={() => setApplyTargetId(null)}
        onConfirm={(doc) => {
          setApplyTargetId(null);
          if (doc.applyStatus === "EFFECTIVE") void admin.supersede(doc);
          else void admin.makeEffective(doc);
        }}
      />
    </>
  );
}
