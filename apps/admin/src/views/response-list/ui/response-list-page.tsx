"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  answerColumns,
  type FormResponseItem,
} from "@/entities/response";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useFormDetail } from "@/features/form";
import {
  useResponseAnswers,
  useResponseCsvExport,
  useResponseList,
} from "@/features/response";
import {
  RSPNS_RVW_STTS_CDS,
  RSPNS_STTS_CDS,
  type RspnsSttsCd,
} from "@/shared/config/codes";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  Segmented,
  type GridColumn,
} from "@/shared/ui";
import { ResponseAnswerTable } from "./response-answer-table";

const ALL = "전체";

const VIEWS = ["목록", "표"] as const;
type ViewMode = (typeof VIEWS)[number];

/** 잠긴 조작에 붙는 사유 — 요구 권한을 이름으로 밝힌다 (#117) */
const NO_REVIEW =
  "응답을 심사할 권한이 없습니다 — 응답 심사(RESPONSE_REVIEW) 권한이 필요합니다";

/*
 * 상태 필터를 컴포넌트 state가 아니라 URL 쿼리스트링에 둔다 (#7의 폼 목록과 같은 방식).
 *
 * 새로고침·뒤로가기로 필터가 풀리지 않고, 링크를 그대로 공유할 수 있다("이 폼 승인된 응답
 * 좀 봐줘"). state로 들고 있으면 목록에서 응답 상세로 들어갔다 돌아올 때마다 전체로 리셋되는데,
 * 심사는 목록↔상세를 수십 번 오가는 작업이라 특히 아프다.
 *
 * 파라미터 이름을 서버 쿼리와 똑같이 맞춘 것도 의도한 것이다 — URL과 요청이 1:1이면 어떤
 * 조회가 나갔는지 주소창만 보고 알 수 있다.
 */
const QUERY_STATUS = "statusCode";

/*
 * 보기(목록·표)도 URL에 둔다 — 상태 필터와 같은 이유이며 운영 통합 달력(`?view=`)과도 같은 방식이다.
 * "이 폼 응답 표로 좀 봐줘"를 링크 하나로 건넬 수 있다.
 *
 * **열을 끄고 켠 선택은 URL에 담지 않는다.** 문항이 열둘인 폼에서 셋만 남기면 주소가 그만큼
 * 길어지고, 그 값은 보는 사람마다 다른 개인 취향이라 링크로 건넬 값이 아니다. 화면을 벗어나면
 * 전부 켜진 기본값으로 돌아간다 — 기억해 두는 것보다 "언제나 전부 보인다"가 덜 놀랍다.
 */
const QUERY_VIEW = "view";

/** URL은 사용자가 손으로 고칠 수 있다 — 모르는 값은 필터 없음으로 떨어뜨린다 */
function parseRspnsSttsCd(value: string | null): RspnsSttsCd | null {
  return value && RSPNS_STTS_CDS.includes(value as RspnsSttsCd)
    ? (value as RspnsSttsCd)
    : null;
}

export function ResponseListPage({ formId }: { formId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * 폼 제목은 응답 API가 주지 않으므로 폼 상세를 함께 부른다. `폼 #12`만 띄우면 응답을
   * 심사하는 사람이 지금 어느 모집을 보고 있는지 화면에서 알 수 없다.
   */
  const { form } = useFormDetail(formId);

  const rspnsSttsCd = parseRspnsSttsCd(searchParams.get(QUERY_STATUS));
  const { responses, status, errorMessage, reload } = useResponseList(
    formId,
    rspnsSttsCd,
  );

  const canReview = useCan(CAPABILITY.RESPONSE_REVIEW);

  const view: ViewMode = searchParams.get(QUERY_VIEW) === "표" ? "표" : "목록";
  const setView = (next: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "목록") params.delete(QUERY_VIEW);
    else params.set(QUERY_VIEW, next);
    const qs = params.toString();
    const base = ROUTES.responses(formId);
    // replace인 것은 보기 전환이 뒤로가기 기록을 쌓을 만한 이동이 아니기 때문이다
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  /*
   * 문항 열은 폼 상세의 문항 구성에서 온다 — 응답 API는 문항 라벨을 주지 않는다
   * (FormResponseDetail 주석: "문항 라벨은 여기 없다"). 순서도 폼이 정한 그대로 쓴다.
   */
  const allColumns = useMemo(() => answerColumns(form?.qitemCpstCn), [form?.qitemCpstCn]);

  /*
   * 끈 열만 기억한다(켠 열이 아니라). 기본이 "전부 켜짐"이라, 폼에 문항이 추가되면 그 열은
   * 자동으로 보인다 — 켠 목록을 들고 있으면 새 문항이 조용히 빠진다.
   */
  const [hiddenQitemIds, setHiddenQitemIds] = useState<string[]>([]);
  const visibleColumns = allColumns.filter((c) => !hiddenQitemIds.includes(c.qitemId));

  const toggleColumn = (qitemId: string) =>
    setHiddenQitemIds((prev) =>
      prev.includes(qitemId)
        ? prev.filter((id) => id !== qitemId)
        : [...prev, qitemId],
    );

  /*
   * 답은 표를 열 때만 불러온다 — 목록 보기에서는 쓰지 않는 값이라 미리 받을 이유가 없다.
   * 왜 상세를 여러 번 부르는지는 useResponseAnswers 머리말에 있다.
   */
  const answerIds = useMemo(
    () => responses.map((r) => r.formRspnsId),
    [responses],
  );
  const {
    answers,
    status: answersStatus,
    loadedCount,
    total: answersTotal,
    errorMessage: answersError,
    reload: reloadAnswers,
  } = useResponseAnswers(formId, answerIds, view === "표" && status === "ready");

  /*
   * 순번을 언제 보여줄 것인가 (ssccops-server #143).
   *
   * 1건 폼에서는 모든 행의 순번이 1이라, 늘 그리면 어느 줄도 구별해 주지 못하는 "1번째"가
   * 이름마다 붙는다. 그래서 **여러 건을 받는 폼이거나 실제로 2번째 이후 응답이 섞여 있을 때만**
   * 그린다 — 뒤쪽 조건이 따로 필요한 것은, 다중 응답을 켜서 받아 둔 뒤 다시 끈 폼에도 같은
   * 회원의 여러 행이 그대로 남아 있기 때문이다(끄는 것은 지난 응답을 무르지 않는다).
   */
  const showRspnsSeq =
    form?.mltplRspnsYn === true ||
    responses.some((r) => r.rspnsSeq !== null && r.rspnsSeq > 1);

  /*
   * CSV 내보내기 (ssccops#223).
   *
   * **지금 보고 있는 범위를 그대로 내보낸다** — 상태 필터가 걸려 있으면 그 결과가 파일이 된다.
   * 언제나 전량을 내보내면 "승인된 것만 뽑아 달라"는 흔한 요구에 화면이 답하지 못하고, 운영진은
   * 엑셀에서 다시 걸러야 한다. 필터가 URL에 있으므로 그 링크를 받은 사람이 내려받은 파일도 같다.
   *
   * 연락처 열은 `MEMBER_MANAGE`로 가른다. ⚠️ 이것은 **표시 경계이지 보안 경계가 아니다** —
   * 응답 상세는 `RESPONSE_REVIEW` 하나로 막혀 있고 `telno`는 권한과 무관하게 실려 온다.
   * 근거와 남은 일은 `features/response/model/response-csv.ts`에 적어 두었다.
   */
  const canSeeTelno = useCan(CAPABILITY.MEMBER_MANAGE);

  /*
   * **끈 열도 파일에는 들어간다**(`visibleColumns`가 아니라 `allColumns`다).
   *
   * 열을 끄는 것은 화면을 훑기 편하려는 개인 취향이라 URL에도 담지 않는 값인데, 그 취향이
   * 파일의 내용까지 정하면 내려받은 사람은 **문항이 빠진 줄도 모른다.** 화면은 다시 켜면
   * 되지만 파일은 그 자리에서 끝이고, 엑셀에서 열을 지우는 것이 없는 열을 되살리는 것보다
   * 언제나 쉽다.
   */
  const {
    exportCsv,
    status: exportStatus,
    loadedCount: exportLoaded,
    total: exportTotal,
    errorMessage: exportError,
  } = useResponseCsvExport({
    formId,
    formTtlNm: form?.formTtlNm,
    responses,
    columns: allColumns,
    includeTelno: canSeeTelno,
    includeRspnsSeq: showRspnsSeq,
  });

  const applyFilter = (value: RspnsSttsCd | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(QUERY_STATUS);
    else params.set(QUERY_STATUS, value);

    const qs = params.toString();
    const base = ROUTES.responses(formId);
    // push라서 뒤로가기로 직전 필터가 되살아난다. scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게
    router.push(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  const columns: GridColumn<FormResponseItem>[] = [
    {
      key: "mbrNm",
      header: FIELD_LABEL.memberName,
      width: "1fr",
      render: (r) => (
        <span
          onClick={() => router.push(ROUTES.responseDetail(formId, r.formRspnsId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {/* 응답자는 전원 회원이다 — 서버가 조인해 준 mbr_nm을 그대로 쓴다 */}
          {r.member.mbrNm || "-"}
          {/*
            순번은 열을 새로 만들지 않고 이름 옆에 붙인다. 열을 더하면 좁은 화면(375px)의
            카드에 줄이 하나 늘어 다섯 줄이 되는데, 정작 이름이 반복돼 구별이 필요한 곳은
            카드의 제목 줄이다 — 제목 옆에 두면 표에서도 카드에서도 같은 자리에 선다.
          */}
          {showRspnsSeq && r.rspnsSeq !== null && (
            <span className="ml-[6px] text-[13px] font-normal text-n500">
              {r.rspnsSeq}번째
            </span>
          )}
        </span>
      ),
    },
    {
      key: "stdntNo",
      header: FIELD_LABEL.studentNumber,
      width: ".9fr",
      render: (r) => r.member.stdntNo || "-",
    },
    {
      key: "meta",
      header: "학과 · 등급 · 상태",
      width: "1.6fr",
      render: (r) =>
        `${r.member.scsbjtNm ?? "-"} · ${mbrGrdNm(r.member.mbrGrdCd)} · ${mbrSttsNm(r.member.mbrSttsCd)}`,
    },
    {
      key: "sbmsnDt",
      header: FIELD_LABEL.submittedAt,
      width: "1fr",
      // 작성 중 응답은 제출 일시가 없다
      render: (r) => formatDt(r.sbmsnDt) || "-",
    },
    {
      key: "rspnsSttsCd",
      header: FIELD_LABEL.responseStatus,
      width: "150px",
      /*
       * 배지를 눌러 바로 심사하던 경로는 없앴다 (#133).
       *
       * 검토는 결론과 **검토 의견**을 함께 남기는 한 번의 조작이 됐는데(서버 #141), 목록에는
       * 응답 내용이 실려 있지 않다 — 무엇을 고치라고 적을지 볼 수 없는 자리에서 사유를 쓰게
       * 하면 "확인 바랍니다" 같은 빈 문장이 이력에 남는다. 상세로 들어가면 응답 내용 옆에
       * 검토 처리 패널이 있고, 이름 열이 이미 그 화면으로 데려간다.
       */
      render: (r) => {
        const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="응답 목록"
        subtitle={form?.formTtlNm ?? `폼 #${formId}`}
        showBack
      />
      <PageBody>
        {/* 상태가 넷으로 늘어 375px에서는 한 줄에 서지 않는다 — 접히게 두고 건수는 끝에 붙인다 */}
        <div className="mb-[6px] flex flex-wrap items-center gap-[7px]">
          <Chip active={rspnsSttsCd === null} onClick={() => applyFilter(null)}>
            {ALL}
          </Chip>
          {RSPNS_RVW_STTS_CDS.map((cd) => (
            <Chip
              key={cd}
              active={rspnsSttsCd === cd}
              onClick={() => applyFilter(cd)}
            >
              {RSPNS_STTS_BADGE[cd].label}
            </Chip>
          ))}
          {/*
           * 작성 중은 심사 대상이 아니라 별개의 축이라 구분선 뒤로 뺐다. 서버 기본 조회에서
           * 빠지므로 이 칩을 눌렀을 때만 나온다 — "전체"에도 포함되지 않는다.
           */}
          <div className="mx-2 h-5 w-px bg-line" />
          <Chip
            active={rspnsSttsCd === "DRAFT"}
            onClick={() => applyFilter("DRAFT")}
          >
            {RSPNS_STTS_BADGE.DRAFT.label}
          </Chip>
          <div className="flex-1" />
          {/* 건수는 서버가 걸러 준 결과 그대로 — 화면에서 다시 세지 않는다 */}
          <div className="text-[14px] text-n500">
            {status === "ready" ? `${responses.length}건` : ""}
          </div>
          {/*
            내보내기는 좁은 화면에서도 둔다 — 표 보기와 달리 파일을 받는 일이라 화면 폭과
            무관하고, 모바일에서 명단을 넘겨야 하는 상황이 실제로 있다.

            불러오는 중에는 몇 건까지 왔는지 버튼이 직접 말한다. 별도 안내 줄을 띄우면 응답이
            적을 때(대부분) 나타났다 사라지는 줄이 목록을 밀어 올린다.
          */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCsv}
            disabled={status !== "ready" || responses.length === 0 || exportStatus === "loading"}
            title={
              responses.length === 0
                ? "내보낼 응답이 없습니다"
                : canSeeTelno
                  ? undefined
                  : "연락처는 회원 관리(MEMBER_MANAGE) 권한이 있어야 파일에 들어갑니다"
            }
          >
            {exportStatus === "loading"
              ? `내보내는 중… (${exportLoaded}/${exportTotal})`
              : "CSV 내보내기"}
          </Button>
          {/*
            보기 전환은 좁은 화면에서 감춘다 — 표가 데스크톱 전용이라(GridTable이 lg 미만에서
            카드로 바뀌는 규칙과 부딪힌다) 누를 수 있는데 아무것도 안 바뀌는 버튼을 두지 않는다.
          */}
          <Segmented
            options={VIEWS}
            value={view}
            onChange={setView}
            className="hidden w-[120px] lg:flex"
          />
        </div>

        {/* 열 끄고 켜기 — 표를 볼 때만, 그리고 끌 문항이 있을 때만 */}
        {view === "표" && allColumns.length > 0 && (
          <div className="mb-[10px] hidden flex-wrap items-center gap-[6px] lg:flex">
            <span className="text-[13px] text-n500">열</span>
            {allColumns.map((c) => (
              <Chip
                key={c.qitemId}
                active={!hiddenQitemIds.includes(c.qitemId)}
                onClick={() => toggleColumn(c.qitemId)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        )}

        <div className="mb-[14px] text-[13px] leading-[1.7] text-n500">
          {/* 권한 없음이 먼저다 — 그 경우 어느 응답도 심사할 수 없다 */}
          {!canReview
            ? `${NO_REVIEW}. 조회만 할 수 있습니다.`
            : rspnsSttsCd === "DRAFT"
              ? "아직 제출되지 않은 응답입니다. 심사할 수 없습니다."
              : "심사는 응답 상세에서 합니다. 작성 중(미제출) 응답은 전체에 포함되지 않습니다."}
          {/*
            폼이 아니라 목록이 실제로 어떤지를 말한다 — 다중 응답을 켰다 끈 폼에도 같은 회원의
            여러 행이 남아 있어서, "여러 건을 받는 폼입니다"라고 쓰면 그 목록에서 틀린 말이 된다.
          */}
          {showRspnsSeq && (
            <div>
              같은 회원의 응답은 별도 행으로 나옵니다. 이름 옆 번호는 그 회원의 몇 번째
              응답인지를 뜻합니다.
            </div>
          )}
          {/*
            내보내기 실패는 눌렀을 때만 생기는 일이라 여기서만 말한다 — 한 건이라도 못 받으면
            파일을 만들지 않는다(빈 칸이 "비워 뒀다"로 읽힌다).
          */}
          {exportError && <div className="text-danger">{exportError}</div>}
        </div>

        {status === "error" ? (
          <EmptyState
            message={errorMessage || "응답 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        ) : (
          <Card className="px-5 pt-4 pb-[6px]">
            {/*
              두 보기를 함께 렌더하고 한쪽을 감춘다 — GridTable이 카드 전환을 그렇게 하는 것과
              같은 이유다. 화면 폭을 자바스크립트로 재어 한쪽만 그리면 서버 렌더 결과와 어긋나
              첫 페인트에서 잘못된 쪽이 보인다. 좁은 화면에서는 언제나 목록이다.
            */}
            <div className={view === "표" ? "lg:hidden" : undefined}>
              <GridTable
                columns={columns}
                rows={status === "ready" ? responses : []}
                rowKey={(r) => String(r.formRspnsId)}
                dense
                empty={
                  <EmptyState
                    padding="sm"
                    message={
                      status === "loading"
                        ? "불러오는 중…"
                        : rspnsSttsCd
                          ? "해당 상태의 응답이 없습니다."
                          : "아직 제출된 응답이 없습니다."
                    }
                  />
                }
              />
            </div>

            {view === "표" && (
              <div className="hidden lg:block">
                {answersStatus === "error" ? (
                  <EmptyState
                    padding="sm"
                    message={answersError || "응답 내용을 불러오지 못했습니다."}
                    action={{ label: "다시 시도", onClick: reloadAnswers }}
                  />
                ) : responses.length === 0 ? (
                  <EmptyState
                    padding="sm"
                    message={
                      status === "loading"
                        ? "불러오는 중…"
                        : rspnsSttsCd
                          ? "해당 상태의 응답이 없습니다."
                          : "아직 제출된 응답이 없습니다."
                    }
                  />
                ) : answersStatus === "loading" ? (
                  /* 수십 건이면 눈에 띄게 걸린다 — 몇 건까지 왔는지 보여 준다 */
                  <EmptyState
                    padding="sm"
                    message={`응답 내용을 불러오는 중… (${loadedCount}/${answersTotal})`}
                  />
                ) : (
                  <>
                    {/* 일부만 실패했으면 표는 그리되 무엇이 빠졌는지 말한다 */}
                    {answersError && (
                      <div className="mb-2 text-[13px] text-n500">{answersError}</div>
                    )}
                    <ResponseAnswerTable
                      rows={responses}
                      columns={visibleColumns}
                      answers={answers}
                      onRowClick={(id) =>
                        router.push(ROUTES.responseDetail(formId, id))
                      }
                    />
                  </>
                )}
              </div>
            )}
          </Card>
        )}
      </PageBody>
    </>
  );
}
