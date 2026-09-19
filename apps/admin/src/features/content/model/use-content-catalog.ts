"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONTENT_PAGES,
  CONTENT_PAGE_GROUP_LABEL,
  parseOperatorsCohort,
  type ContentPageEntry,
  type ContentPageGroup,
} from "@ssccops/content";
import { fetchAllContentPages, type ContentPageSummary } from "@/entities/content";
import { toContentErrorMessage } from "./content-error";

/*
 * 페이지 카탈로그 (#534 · ssccops#392) — www 라우트 표(`@ssccops/content`)에 서버 페이지를 슬러그로
 * 짝지운다. 카탈로그 줄마다 «없음 / 초안 / 게시»이고, 서버에 있지만 표에 없는 페이지는 `extras`로
 * 따로 낸다 — 숨기면 예전에 만든 글이 있는지 아무도 모른다.
 *
 * 서버 목록을 통째로 읽는 이유는 이 화면이 «서버에 무엇이 있나»가 아니라 «표의 각 자리에 무엇이
 * 있나»를 답해야 해서다 — 필터·커서 목록으로는 «없음»을 그릴 수 없다.
 */

export interface CatalogRow {
  entry: ContentPageEntry;
  /** 서버에 있는 페이지 — 없으면 null(«없음» · 열면 첫 저장이 생성) */
  page: ContentPageSummary | null;
}

export interface CatalogGroup {
  group: ContentPageGroup;
  label: string;
  rows: CatalogRow[];
}

export interface CohortRow {
  cohort: number;
  page: ContentPageSummary;
}

export interface ContentCatalog {
  groups: CatalogGroup[];
  /** 기수 운영진 `operators-{n}` — 서버에 있는 것만, 최신 기수 먼저 */
  cohorts: CohortRow[];
  /** 표에도 기수 패턴에도 없는 페이지 — 공개 사이트 어디에도 나타나지 않는다 */
  extras: ContentPageSummary[];
}

export type CatalogStatus = "loading" | "ready" | "error";

const GROUP_ORDER: readonly ContentPageGroup[] = ["home", "about", "operators", "join", "legal", "contact"];

export function buildCatalog(pages: ContentPageSummary[]): ContentCatalog {
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const known = new Set<string>();

  const groups = GROUP_ORDER.map((group) => ({
    group,
    label: CONTENT_PAGE_GROUP_LABEL[group],
    rows: CONTENT_PAGES.filter((entry) => entry.group === group).map((entry) => {
      known.add(entry.slug);
      return { entry, page: bySlug.get(entry.slug) ?? null };
    }),
  })).filter((g) => g.rows.length > 0);

  const cohorts: CohortRow[] = [];
  const extras: ContentPageSummary[] = [];
  for (const page of pages) {
    if (known.has(page.slug)) continue;
    const cohort = parseOperatorsCohort(page.slug);
    if (cohort != null) cohorts.push({ cohort, page });
    else extras.push(page);
  }
  cohorts.sort((a, b) => b.cohort - a.cohort);

  return { groups, cohorts, extras };
}

/** 조회 결과 — 어느 요청(`tick`)의 것인지 함께 둔다. 새 요청이 시작되면 옛 결과는 «로딩»으로 읽힌다(use-content-detail과 같은 방식) */
interface Loaded {
  tick: number;
  catalog: ContentCatalog | null;
  outcome: Exclude<CatalogStatus, "loading">;
  errorMessage: string;
}

export function useContentCatalog(): {
  catalog: ContentCatalog | null;
  status: CatalogStatus;
  errorMessage: string;
  reload: () => void;
} {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchAllContentPages()
      .then((pages) => {
        if (!cancelled) setLoaded({ tick, catalog: buildCatalog(pages), outcome: "ready", errorMessage: "" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded({ tick, catalog: null, outcome: "error", errorMessage: toContentErrorMessage(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const current = loaded && loaded.tick === tick ? loaded : null;
  return {
    catalog: current?.catalog ?? null,
    status: current ? current.outcome : "loading",
    errorMessage: current?.errorMessage ?? "",
    reload,
  };
}
