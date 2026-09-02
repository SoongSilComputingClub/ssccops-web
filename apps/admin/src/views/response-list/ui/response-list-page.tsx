"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import { RSPNS_STTS_BADGE, type FormResponseItem } from "@/entities/response";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useFormDetail } from "@/features/form";
import { useResponseList } from "@/features/response";
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
  Card,
  Chip,
  EmptyState,
  GridTable,
  PageBody,
  PageHeader,
  type GridColumn,
} from "@/shared/ui";

const ALL = "전체";

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
        </div>

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
        </div>

        {status === "error" ? (
          <EmptyState
            message={errorMessage || "응답 목록을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        ) : (
          <Card className="px-5 pt-4 pb-[6px]">
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
          </Card>
        )}
      </PageBody>
    </>
  );
}
