"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import { RSPNS_STTS_BADGE, type FormResponseItem } from "@/entities/response";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useFormDetail } from "@/features/form";
import { ResponseStatusSheet, useResponseList } from "@/features/response";
import {
  RSPNS_RVW_STTS_CDS,
  RSPNS_STTS_CDS,
  type RspnsSttsCd,
} from "@/shared/config/codes";
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

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_REVIEW = "응답을 심사할 권한이 없습니다";

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

  const [sheetTarget, setSheetTarget] = useState<FormResponseItem | null>(null);
  const canReview = useCan(CAPABILITY.RESPONSE_REVIEW);

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
      header: "회원_명",
      width: "1fr",
      render: (r) => (
        <span
          onClick={() => router.push(ROUTES.responseDetail(formId, r.formRspnsId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {/* 응답자는 전원 회원이다 — 서버가 조인해 준 mbr_nm을 그대로 쓴다 */}
          {r.member.mbrNm || "-"}
        </span>
      ),
    },
    {
      key: "stdntNo",
      header: "학생_번호",
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
      header: "제출_일시",
      width: "1fr",
      // 작성 중 응답은 제출 일시가 없다
      render: (r) => formatDt(r.sbmsnDt) || "-",
    },
    {
      key: "rspnsSttsCd",
      header: "응답_상태",
      width: "150px",
      render: (r) => {
        const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
        /*
         * 작성 중(미제출) 응답은 배지를 눌러도 시트가 열리지 않는다. 제출 전 답안을 운영자가
         * 승인하면 응답자가 아직 쓰고 있던 내용이 그대로 확정돼 버린다 — 심사 대상이 아니다.
         */
        /*
         * 권한이 없으면 배지를 눌러도 시트가 열리지 않는다 (#29). 여기서는 버튼이 아니라
         * 배지라 잠금 표시를 붙일 자리가 없으므로 사유를 title로 단다 — 표 위의 안내 한
         * 줄이 같은 말을 다시 해 준다.
         */
        const reviewable = r.rspnsSttsCd !== "DRAFT" && canReview;
        return (
          <span
            onClick={reviewable ? () => setSheetTarget(r) : undefined}
            title={canReview ? undefined : NO_REVIEW}
            className={reviewable ? "cursor-pointer" : undefined}
          >
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
        );
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
        <div className="mb-[6px] flex items-center gap-[7px]">
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

        <div className="mb-[14px] text-[13px] text-n500">
          {/* 권한 없음이 먼저다 — 그 경우 어느 필터에서도 상태를 바꿀 수 없다 */}
          {!canReview
            ? `${NO_REVIEW} — 조회만 할 수 있습니다.`
            : rspnsSttsCd === "DRAFT"
              ? "아직 제출되지 않은 응답입니다. 상태를 변경할 수 없습니다."
              : "작성 중(미제출) 응답은 전체에 포함되지 않습니다."}
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

        <ResponseStatusSheet
          formId={formId}
          formRspnsId={sheetTarget?.formRspnsId ?? null}
          current={sheetTarget?.rspnsSttsCd}
          onClose={() => setSheetTarget(null)}
          onChanged={reload}
        />
      </PageBody>
    </>
  );
}
