"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sesnSttsTone } from "@/entities/academic-program";
import type { SessionCrossListItem } from "@/entities/academic-session";
import { useSessionHistory } from "@/features/academic-session";
import {
  SESN_STTS_CDS,
  SESN_STTS_NM,
  type SesnSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  SearchInput,
  flash,
  type GridColumn,
} from "@/shared/ui";

/*
 * 회차 이력 (#130 · ssccops-server #136 · GET /v1/academic-programs/sessions).
 *
 * 학술국장이 전체 활동의 회차 진행을 한눈에 보는 화면이다 — 활동 하나에 종속된 조회가
 * 아니라 활동 횡단 조회를 쓴다. 회차·출석 승인 화면(views/session-approvals)이
 * SUBMITTED 만 보여 주는 데 반해 여기는 전 상태를 보여 준다.
 *
 * ── 필터를 URL 쿼리스트링에 둔다 ──────────────────────────────
 * 활동 목록(views/academic-program-list)과 같은 판단이다 — 새로고침·뒤로가기로 필터가
 * 풀리지 않고 "제출된 회차 목록 좀 봐줘"를 링크로 넘길 수 있다.
 *
 * ── 회차를 누르면 회차 상세로 간다 ────────────────────────────
 * 이력 응답이 활동 번호와 회차 번호를 함께 주므로(SessionCrossListItem) 상세 조회 경로를
 * 만들 수 있다.
 */

const QUERY_STATUS = "status";
const QUERY_KEYWORD = "keyword";

/** URL 은 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseSttsCd(value: string | null): SesnSttsCd | null {
  return value && SESN_STTS_CDS.includes(value as SesnSttsCd)
    ? (value as SesnSttsCd)
    : null;
}

export function SessionHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sesnSttsCd = parseSttsCd(searchParams.get(QUERY_STATUS));
  const keyword = searchParams.get(QUERY_KEYWORD) || "";

  /*
   * 검색어는 타이핑마다 URL 을 바꾸면 히스토리가 지저분해지므로 로컬 입력을 두고 디바운스해
   * URL 에 반영한다. URL 이 정본이라 밖에서 keyword 가 바뀌면 입력도 따라간다 — 그 동기화를
   * 렌더 중 조정으로 한다(활동 목록과 같은 패턴).
   */
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [syncedKeyword, setSyncedKeyword] = useState(keyword);
  if (keyword !== syncedKeyword) {
    setSyncedKeyword(keyword);
    setKeywordInput(keyword);
  }

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(
      qs
        ? `${ROUTES.academicProgramSessions}?${qs}`
        : ROUTES.academicProgramSessions,
    );
  };

  useEffect(() => {
    const trimmed = keywordInput.trim();
    if (trimmed === keyword) return;
    const timer = setTimeout(
      () => setQuery({ [QUERY_KEYWORD]: trimmed || null }),
      400,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput, keyword]);

  const {
    sessions,
    status,
    errorMessage,
    totalCount,
    hasNext,
    loadingMore,
    loadMore,
    reload,
  } = useSessionHistory({ sesnSttsCd, keyword: keyword || null });

  const filtered = Boolean(sesnSttsCd || keyword.trim());

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  const openDetail = (item: SessionCrossListItem) => {
    router.push(
      ROUTES.academicProgramSessionDetail(item.academicProgramId, item.sessionId),
    );
  };

  const columns: GridColumn<SessionCrossListItem>[] = [
    {
      key: "actualYmd",
      header: "진행일",
      width: "110px",
      render: (item) => formatYmd(item.actualYmd) || "-",
    },
    {
      key: "program",
      header: "활동",
      width: "1.4fr",
      mobilePrimary: true,
      render: (item) => (
        <div className="min-w-0">
          <div className="truncate">{item.academicProgramTitle || "-"}</div>
          <div className="mt-[2px] text-[13px] text-n500 lg:hidden">
            {item.typeCd}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "유형",
      width: ".7fr",
      mobileHide: true,
      render: (item) => <Badge tone="grey">{item.typeCd}</Badge>,
    },
    {
      key: "curriculum",
      header: "회차·주제",
      width: "1.4fr",
      render: (item) => (
        <span className="min-w-0 truncate">
          {item.seqno != null ? `${item.seqno}회차 · ` : ""}
          {item.curriculumTitle || "-"}
        </span>
      ),
    },
    {
      key: "attendance",
      header: "출석",
      width: ".7fr",
      align: "right",
      render: (item) => `${item.presentCount}/${item.totalCount}`,
    },
    {
      key: "file",
      header: "사진",
      width: ".6fr",
      align: "right",
      render: (item) =>
        item.hasFileReference ? (
          <span title="출석 인증사진이 첨부돼 있습니다">있음</span>
        ) : (
          <span className="text-n500">-</span>
        ),
    },
    {
      key: "status",
      header: "상태",
      width: ".8fr",
      align: "right",
      render: (item) => (
        <Badge tone={sesnSttsTone(item.sesnSttsCd)}>
          {SESN_STTS_NM[item.sesnSttsCd]}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="회차 이력"
        subtitle="전체 활동의 회차 진행을 한눈에 봅니다"
      />
      <PageBody maxWidth={1180}>
        <div className="mb-4 flex flex-col gap-3">
          <SearchInput
            value={keywordInput}
            onChange={setKeywordInput}
            placeholder="활동 제목·회차 주제로 검색"
            className="max-w-[360px]"
          />
          <div className="flex flex-wrap gap-[7px]">
            <Chip
              active={!sesnSttsCd}
              onClick={() => setQuery({ [QUERY_STATUS]: null })}
            >
              전체 상태
            </Chip>
            {SESN_STTS_CDS.map((code) => (
              <Chip
                key={code}
                active={sesnSttsCd === code}
                onClick={() => setQuery({ [QUERY_STATUS]: code })}
              >
                {SESN_STTS_NM[code]}
              </Chip>
            ))}
          </div>
        </div>

        {status === "loading" && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[52px] animate-pulse rounded-xl bg-black/5"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "회차 이력을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" && (
          <>
            <GridTable
              columns={columns}
              rows={sessions}
              rowKey={(item) => String(item.sessionId)}
              onRowClick={openDetail}
              empty={
                <EmptyState
                  message={
                    filtered
                      ? "조건에 맞는 회차가 없습니다."
                      : "기록된 회차가 없습니다."
                  }
                  action={
                    filtered
                      ? {
                          label: "필터 초기화",
                          onClick: () =>
                            setQuery({
                              [QUERY_STATUS]: null,
                              [QUERY_KEYWORD]: null,
                            }),
                        }
                      : undefined
                  }
                />
              }
            />

            {hasNext && (
              <div className="mt-5 flex items-center gap-3">
                <Button
                  onClick={() => void runLoadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </Button>
                <div className="text-[13.5px] text-n500">
                  {sessions.length} / {totalCount}건
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
