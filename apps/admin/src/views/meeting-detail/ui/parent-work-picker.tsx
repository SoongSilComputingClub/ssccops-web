"use client";

import { useEffect, useState } from "react";
import { useWorkList } from "@/features/work";
import { WORK_STTS_NM, WORK_TYPE_NM } from "@/shared/config/codes";
import { SearchInput, flash } from "@/shared/ui";

/** 고른 상위 업무 — 상세 경로 값(work_id)과 «선택됨» 줄에 쓸 제목 */
export interface PickedParentWork {
  workId: number;
  title: string;
}

/** 타이핑 도중 매 글자마다 조회하지 않는다 — 회의 상세 «안건 추가» 검색과 같은 값 */
const SEARCH_DEBOUNCE_MS = 300;

/*
 * 하위 업무 승격의 «상위 업무» 고르기 (#775 · ssccops#580).
 *
 * 하위 업무 등록 화면은 상위 업무를 고르지 않는다 — 업무 상세의 «+ 하위 업무»로만 들어와 상위
 * 업무가 주소로 고정된다. 회의 안건은 어느 업무에 붙일지 정해지지 않은 채 오므로 여기서 고른다.
 * 목록은 회의 상세 «안건 추가»의 대상 검색과 같은 `useWorkList`(제목 부분 일치 · 커서 «더 보기»)다.
 *
 * 칩은 «미완료»로 둔다 — 새 하위 업무를 완료된 업무에 붙이는 일은 드물고, 완료 업무까지 섞이면
 * 목록이 길어진다. 시트를 열어 하위 업무를 고를 때만 마운트되므로 업무로 만들 때는 조회하지 않는다.
 */
export function ParentWorkPicker({
  value,
  onChange,
}: Readonly<{
  value: PickedParentWork | null;
  onChange: (work: PickedParentWork) => void;
}>) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const workList = useWorkList(debouncedQuery, false, "미완료");

  const loadMore = async () => {
    const message = await workList.loadMore();
    if (message) flash(message);
  };

  return (
    <div>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="업무 제목으로 찾기"
        label="상위 업무 찾기"
      />
      <div className="mt-2 flex max-h-[200px] flex-col gap-2 overflow-y-auto">
        {workList.status === "loading" && (
          <div className="p-2 text-[13.5px] text-n500">불러오는 중입니다</div>
        )}
        {workList.status === "error" && (
          <div className="p-2 text-[13.5px] text-danger">
            {workList.errorMessage || "업무 목록을 불러오지 못했습니다."}{" "}
            <button type="button" onClick={workList.reload} className="cursor-pointer underline">
              다시 시도
            </button>
          </div>
        )}
        {workList.status === "ready" && workList.works.length === 0 && (
          <div className="p-2 text-[13.5px] text-n500">
            {query.trim() ? "검색 결과가 없습니다." : "완료되지 않은 업무가 없습니다."}
          </div>
        )}
        {workList.works.map((w) => {
          const picked = value?.workId === w.workId;
          return (
            /* 키보드 접근(#403) */
            <button
              type="button"
              key={w.workId}
              aria-pressed={picked}
              onClick={() => onChange({ workId: w.workId, title: w.title })}
              className={
                picked
                  ? "w-full cursor-pointer rounded-[10px] bg-accent/8 p-[10px] text-left shadow-[inset_0_0_0_1px_var(--color-accent)]"
                  : "w-full cursor-pointer rounded-[10px] border border-line p-[10px] text-left hover:border-accent"
              }
            >
              <div className="text-[14.5px] font-semibold">{w.title}</div>
              <div className="mt-[2px] text-[12.5px] text-n500">
                {WORK_TYPE_NM[w.workType]} · {WORK_STTS_NM[w.workStatus]}
              </div>
            </button>
          );
        })}
        {workList.hasNext && (
          <button
            type="button"
            disabled={workList.loadingMore}
            onClick={() => void loadMore()}
            className="cursor-pointer py-1 text-[13.5px] text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workList.loadingMore ? "업무 불러오는 중…" : "업무 더 보기"}
          </button>
        )}
      </div>
      <div className={value ? "mt-2 text-[13.5px] text-accent" : "mt-2 text-[13.5px] text-n500"}>
        {value ? `선택됨 · ${value.title}` : "완료되지 않은 업무만 보입니다."}
      </div>
    </div>
  );
}
