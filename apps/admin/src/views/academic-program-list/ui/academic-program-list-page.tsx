"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acdmActvSttsTone,
  acdmActvTypeNm,
  type AcademicProgramSummary,
} from "@/entities/academic-program";
import {
  useAcademicProgramList,
  useAcademicProgramTypes,
} from "@/features/academic-program";
import {
  ACDM_ACTV_STTS_CDS,
  ACDM_ACTV_STTS_NM,
  type AcdmActvSttsCd,
} from "@/shared/config/codes";
import { ROUTES } from "@/shared/config/routes";
import { formatYmd } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageBody,
  PageHeader,
  ProgressBar,
  SearchInput,
  flash,
} from "@/shared/ui";

/*
 * 활동 목록 (#125 · ssccops-server #131 · GET /v1/academic-programs).
 *
 * 학술국장이 승인된 활동 전체를 훑는 화면이다. 활동은 기획안 승인 시
 * 서버가 이관해 만들므로 '활동 등록' 버튼이 없다(#122·#125 — 프로토타입 헤더의 `+ 활동
 * 등록`은 그 결정 이전 시안이다).
 *
 * ── 필터를 URL 쿼리스트링에 둔다 ──────────────────────────────
 * 폼 목록(views/form-list)과 같은 판단이다 — 새로고침·뒤로가기로 필터가 풀리지 않고,
 * "진행 중인 스터디 목록 좀 봐줘"를 링크 하나로 넘길 수 있다. 값 이름을 서버 쿼리
 * 파라미터와 똑같이(status·keyword) 맞춰 URL과 요청이 1:1이 되게 했다.
 *
 * ── 유형 칩은 코드값을 문자열로 노출한다 ──────────────────────
 * 활동 유형(typeCd)은 런타임 코드테이블이고 표시명은 상세 응답에만 온다 — 목록 응답에는
 * typeCd 문자열뿐이다. 유형 목록 엔드포인트를 이 이슈에서 붙이지 않으므로(#125 범위 밖),
 * 유형 필터 칩은 목록에 실제로 나타난 typeCd 집합에서 뽑는다(행사 앱 toClassifications과
 * 같은 방식). 유형 이름이 필요하면 후속 이슈에서 코드테이블 조회를 붙인다.
 */

const QUERY_STATUS = "status";
const QUERY_TYPE = "typeCd";
const QUERY_KEYWORD = "keyword";

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseSttsCd(value: string | null): AcdmActvSttsCd | null {
  return value && ACDM_ACTV_STTS_CDS.includes(value as AcdmActvSttsCd)
    ? (value as AcdmActvSttsCd)
    : null;
}

function ProgramCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-[22px] w-[88px] rounded-full bg-fill" />
      <div className="mt-3 h-[24px] w-3/5 rounded bg-fill" />
      <div className="mt-2 h-[16px] w-2/5 rounded bg-fill" />
      <div className="mt-4 h-[8px] w-full rounded bg-fill" />
    </Card>
  );
}

function ProgramCard({
  program,
  onClick,
}: Readonly<{
  program: AcademicProgramSummary;
  onClick: () => void;
}>) {
  // 진행률은 서버가 계산한 값이다(#125) — 화면은 반올림해 보여 주기만 한다
  const ratio = Math.round(program.progressRatio);

  return (
    <Card onClick={onClick}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={acdmActvSttsTone(program.sttsCd)}>
          {ACDM_ACTV_STTS_NM[program.sttsCd]}
        </Badge>
        <Badge tone="grey">{acdmActvTypeNm(program.typeCd)}</Badge>
        <div className="flex-1" />
        {program.isLeader && (
          <span title="내가 스터디장/팀장인 프로그램입니다">
            <Badge tone="outline-accent">내 프로그램</Badge>
          </span>
        )}
      </div>
      <div className="mt-2 text-[18px] font-semibold">{program.title || "-"}</div>
      <div className="mt-1 text-[14px] text-n400">
        {/* 리더 미지정(이관 직후)이면 서버가 null로 내린다 */}
        스터디장 {program.leaderName || "-"}
      </div>
      <div className="mt-[2px] text-[13.5px] text-n500">
        {formatYmd(program.eventBeginAt) || "-"} ~{" "}
        {formatYmd(program.eventEndAt) || "-"}
      </div>
      <div className="mt-3 flex items-center gap-[10px]">
        <ProgressBar value={ratio} />
        <div className="w-[38px] text-right text-[14px] text-n500">{ratio}%</div>
      </div>
    </Card>
  );
}

export function AcademicProgramListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sttsCd = parseSttsCd(searchParams.get(QUERY_STATUS));
  const typeCd = searchParams.get(QUERY_TYPE) || null;
  const keyword = searchParams.get(QUERY_KEYWORD) || "";

  /*
   * 검색어는 타이핑마다 URL을 바꾸면 히스토리가 지저분해지므로 로컬 입력을 두고 디바운스해
   * URL에 반영한다. URL이 정본이라, 뒤로가기 등으로 URL의 keyword가 밖에서 바뀌면 입력도
   * 따라가야 한다 — 그 동기화를 useEffect + setState 대신 렌더 중 조정으로 한다(React
   * "Adjusting state when a prop changes"). 마지막으로 반영한 URL 값을 함께 들고 있다가
   * 그것과 달라졌을 때만 입력을 덮는다.
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
    router.replace(qs ? `${ROUTES.academicPrograms}?${qs}` : ROUTES.academicPrograms);
  };

  useEffect(() => {
    const trimmed = keywordInput.trim();
    if (trimmed === keyword) return;
    const timer = setTimeout(() => setQuery({ [QUERY_KEYWORD]: trimmed || null }), 400);
    return () => clearTimeout(timer);
    // setQuery는 매 렌더 새로 만들어지지만 searchParams 변화에만 반응하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput, keyword]);

  const {
    programs,
    status,
    errorMessage,
    totalCount,
    hasNext,
    loadingMore,
    loadMore,
    reload,
  } = useAcademicProgramList({ sttsCd, typeCd, keyword: keyword || null });

  const { types } = useAcademicProgramTypes();

  /*
   * 유형 칩은 **기준정보**(GET /v1/academic-program-types)에서 뽑는다 (#568).
   *
   * 원래는 받아 둔 목록의 `typeCd` 집합에서 뽑았는데(#125 — 유형 엔드포인트를 붙이지 않은 채
   * 행사 앱의 분류 칩을 따라했다), **필터를 거는 순간 나머지 칩이 사라졌다.** 서버가 이미
   * 걸러 준 목록에는 고른 유형만 있기 때문이다 — 스터디를 고르면 프로젝트 칩이 없어져
   * «전체 유형»을 한 번 거치지 않고는 다른 유형으로 옮겨갈 수 없었다.
   *
   * **비활성 유형(`useYn: false`)은 그 유형의 활동이 실제로 보일 때만 낸다.** 기준정보에는
   * 은퇴한 유형이 쌓이는데 전부 그리면 칩 줄이 계속 길어지고, 그렇다고 활성만 그리면 끈
   * 유형의 지난 활동을 필터로 찾을 수 없다 — 지금 목록에 있거나 이미 고른 것만 남긴다.
   *
   * 고른 값을 합집합으로 더하는 것은 그래서다. 덤으로 유형 조회가 실패해 칩 줄이 비었을 때도
   * 주소의 필터를 끌 칩 하나는 남는다(`useAcademicProgramTypes` 주석).
   *
   * **칩 라벨만 표시명이고 주소에 실리는 값은 `typeCd` 그대로다** — 서버 질의 파라미터라
   * 이름으로 바꾸면 필터가 통째로 빈다.
   */
  const visibleTypeCds = new Set(programs.map((p) => p.typeCd));
  const typeOptions = Array.from(
    new Set([
      ...types
        .filter((t) => t.useYn || visibleTypeCds.has(t.typeCd) || t.typeCd === typeCd)
        .map((t) => t.typeCd),
      ...(typeCd ? [typeCd] : []),
    ]),
  );

  /*
   * 칩 라벨은 **서버가 준 이름**을 먼저 쓴다 — 기준정보를 이미 받아 왔으므로, 운영진이 유형
   * 관리에서 이름을 바꾸면 칩이 곧바로 따라간다. 기준정보에 없는 코드(조회 실패 · 주소에 손으로
   * 넣은 값)만 화면 맵으로 떨어진다. 카드 배지가 맵을 그대로 쓰는 것과 갈리는 자리인데, 그쪽은
   * 목록 응답에 이름이 없어 물어볼 데가 없다.
   */
  const typeNameOf = (code: string) =>
    types.find((t) => t.typeCd === code)?.typeName || acdmActvTypeNm(code);

  const filtered = Boolean(sttsCd || typeCd || keyword.trim());

  const runLoadMore = async () => {
    const message = await loadMore();
    if (message) flash(message);
  };

  return (
    <>
      <PageHeader title="프로그램 목록" subtitle="승인된 학술 프로그램" />
      <PageBody>
        <div className="mb-4 flex flex-col gap-3">
          <SearchInput
            value={keywordInput}
            onChange={setKeywordInput}
            placeholder="프로그램 제목으로 검색"
            className="max-w-[360px]"
          />
          <div className="flex flex-wrap gap-[7px]">
            <Chip active={!sttsCd} onClick={() => setQuery({ [QUERY_STATUS]: null })}>
              전체 상태
            </Chip>
            {ACDM_ACTV_STTS_CDS.map((code) => (
              <Chip
                key={code}
                active={sttsCd === code}
                onClick={() => setQuery({ [QUERY_STATUS]: code })}
              >
                {ACDM_ACTV_STTS_NM[code]}
              </Chip>
            ))}
          </div>
          {typeOptions.length > 0 && (
            <div className="flex flex-wrap gap-[7px]">
              <Chip active={!typeCd} onClick={() => setQuery({ [QUERY_TYPE]: null })}>
                전체 유형
              </Chip>
              {typeOptions.map((code) => (
                <Chip
                  key={code}
                  active={typeCd === code}
                  onClick={() => setQuery({ [QUERY_TYPE]: code })}
                >
                  {typeNameOf(code)}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "프로그램 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {status === "ready" &&
          (programs.length === 0 ? (
            <EmptyState
              message={
                filtered
                  ? "조건에 맞는 프로그램이 없습니다."
                  : "승인된 프로그램이 없습니다."
              }
              action={
                filtered
                  ? {
                      label: "필터 초기화",
                      onClick: () =>
                        setQuery({
                          [QUERY_STATUS]: null,
                          [QUERY_TYPE]: null,
                          [QUERY_KEYWORD]: null,
                        }),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                {programs.map((p) => (
                  <ProgramCard
                    key={p.academicProgramId}
                    program={p}
                    onClick={() =>
                      router.push(
                        ROUTES.academicProgramDetail(p.academicProgramId),
                      )
                    }
                  />
                ))}
              </div>

              {/*
                커서 페이징이라 한 번에 20건까지만 온다. 받아 둔 건수와 전체 건수를 함께
                보여 주는 것은 '더 보기'가 몇 번 더 남았는지 짐작할 수 있게 하기 위해서다.
              */}
              {hasNext && (
                <div className="mt-5 flex items-center gap-3">
                  <Button
                    onClick={() => void runLoadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </Button>
                  <div className="text-[13.5px] text-n500">
                    {programs.length} / {totalCount}건
                  </div>
                </div>
              )}
            </>
          ))}
      </PageBody>
    </>
  );
}
