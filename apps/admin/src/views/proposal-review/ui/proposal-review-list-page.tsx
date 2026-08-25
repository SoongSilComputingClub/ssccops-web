"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { mbrGrdNm } from "@/entities/member";
import { RSPNS_STTS_BADGE, type FormResponseItem } from "@/entities/response";
import { useProposalForm } from "@/features/form";
import { useResponseList } from "@/features/response";
import { RSPNS_RVW_STTS_CDS, type RspnsSttsCd } from "@/shared/config/codes";
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
import { ProposalFormGate } from "./proposal-form-gate";

const TITLE = "기획안 검토";

const ALL = "전체";

/*
 * 상태 필터를 URL에 둔다 — 응답 목록(#7 · #13)과 같은 방식이고 이름도 서버 쿼리와 같다.
 * 새로고침·뒤로가기로 필터가 풀리지 않고, "이번에 승인된 기획안 좀 봐줘"를 링크로 넘길 수 있다.
 */
const QUERY_STATUS = "statusCode";

/**
 * 기본 필터는 **검토 대기**다.
 *
 * 응답 목록이 필터 없이 시작하는 것과 갈리는 자리다. 저쪽은 한 폼에 들어온 응답 전부를 훑는
 * 화면이지만 이쪽은 처리할 일이 쌓이는 곳이라, 이미 결론이 난 기획안이 섞여 있으면 지금 봐야
 * 할 것이 몇 건인지가 목록에서 사라진다.
 */
const DEFAULT_STATUS: RspnsSttsCd = "SUBMITTED";

/**
 * URL의 상태값 → 조회 필터.
 *
 * 값이 **없으면**(처음 들어왔다) 기본값이고, **빈 문자열이면**(전체 칩을 눌렀다) 필터 없음이다.
 * 둘을 가르는 것은 "아직 안 골랐다"와 "전부를 골랐다"가 다른 뜻이기 때문이다. 사용자가 손으로
 * 고친 모르는 값은 기본값으로 떨어뜨린다 — 주소를 잘못 친 사람에게 빈 화면 대신 할 일을 보여준다.
 */
function parseRspnsSttsCd(value: string | null): RspnsSttsCd | null {
  if (value === null) return DEFAULT_STATUS;
  if (value === "") return null;
  /*
   * 고를 수 있는 것은 심사 대상 넷뿐이다 — 작성 중(DRAFT)은 제출 전 답안이라 남의 것을 검토
   * 목록에서 볼 이유가 없고, 서버도 기본 조회에서 뺀다.
   */
  return RSPNS_RVW_STTS_CDS.find((cd) => cd === value) ?? DEFAULT_STATUS;
}

/**
 * 기획안 검토 목록 (#164).
 *
 * ── 기획안 전용 API는 없다 ────────────────────────────────────
 * 기획안은 시스템 폼(`sys_form_cd = 'PROPOSAL'`) 한 벌의 응답이라 목록도 응답 목록 API를 그대로
 * 쓴다. 이 화면이 특화하는 것은 **어느 폼을 여는가**와 **무엇을 보여주는가**뿐이다.
 *
 * ── 폼 번호를 화면에 적지 않는다 ──────────────────────────────
 * `form_id`는 IDENTITY라 환경마다 다르다. 번호를 적어 두면 한 환경에서만 맞고, 그 번호에 다른
 * 폼이 들어 있는 환경에서는 아무 경고 없이 **남의 폼 응답이 검토 목록에 뜬다.** 그래서 코드가
 * 폼을 가리키는 값은 `sys_form_cd`뿐이고 번호는 진입할 때 찾는다(#163의 `useProposalForm`).
 */
function ProposalReviewList({ formId }: { formId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rspnsSttsCd = parseRspnsSttsCd(searchParams.get(QUERY_STATUS));
  const { responses, status, errorMessage, reload } = useResponseList(
    formId,
    rspnsSttsCd,
  );

  const applyFilter = (value: RspnsSttsCd | null) => {
    const params = new URLSearchParams(searchParams.toString());
    // 전체는 "필터 없음"을 값으로 적는다 — 지우면 기본값(검토 대기)으로 되돌아간다
    params.set(QUERY_STATUS, value ?? "");

    // push라서 뒤로가기로 직전 필터가 되살아난다. scroll:false — 칩만 눌렀는데 맨 위로 튀지 않게
    router.push(`${ROUTES.proposalReviews}?${params.toString()}`, { scroll: false });
  };

  const columns: GridColumn<FormResponseItem>[] = [
    {
      key: "mbrNm",
      header: FIELD_LABEL.memberName,
      width: "1fr",
      render: (r) => (
        <span
          onClick={() => router.push(ROUTES.proposalReviewDetail(r.formRspnsId))}
          className="cursor-pointer font-semibold hover:text-accent"
        >
          {r.member.mbrNm || "-"}
          {/*
            기획안 폼은 한 사람이 여러 건을 낼 수 있다(`mltpl_rspns_yn`). 순번이 없으면 같은
            이름 두 줄이 어느 것이 어느 기획안인지 알려주지 못한다 — 열을 늘리는 대신 이름
            옆에 붙여 좁은 화면의 카드에서도 제목 줄에 함께 선다.
          */}
          {r.rspnsSeq !== null && (
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
      header: "학과 · 등급",
      width: "1.4fr",
      render: (r) => `${r.member.scsbjtNm ?? "-"} · ${mbrGrdNm(r.member.mbrGrdCd)}`,
    },
    {
      key: "sbmsnDt",
      header: FIELD_LABEL.submittedAt,
      width: "1fr",
      render: (r) => formatDt(r.sbmsnDt) || "-",
    },
    {
      key: "rspnsSttsCd",
      header: FIELD_LABEL.responseStatus,
      width: "150px",
      render: (r) => {
        const badge = RSPNS_STTS_BADGE[r.rspnsSttsCd];
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader title={TITLE} subtitle="제출된 기획안을 확인하고 처리합니다" />
      <PageBody>
        {/* 상태가 넷이라 375px에서는 한 줄에 서지 않는다 — 접히게 두고 건수는 끝에 붙인다 */}
        <div className="mb-[6px] flex flex-wrap items-center gap-[7px]">
          <Chip active={rspnsSttsCd === null} onClick={() => applyFilter(null)}>
            {ALL}
          </Chip>
          {RSPNS_RVW_STTS_CDS.map((cd) => (
            <Chip key={cd} active={rspnsSttsCd === cd} onClick={() => applyFilter(cd)}>
              {RSPNS_STTS_BADGE[cd].label}
            </Chip>
          ))}
          <div className="flex-1" />
          {/* 건수는 서버가 걸러 준 결과 그대로 — 화면에서 다시 세지 않는다 */}
          <div className="text-[14px] text-n500">
            {status === "ready" ? `${responses.length}건` : ""}
          </div>
        </div>

        <div className="mb-[14px] text-[13px] leading-[1.7] text-n500">
          {/*
            목록에는 기획안 내용이 실리지 않는다(서버 계약 — 응답 수백 건 × 문항 수십 개면 목록이
            비대해진다). 활동명이 왜 안 보이는지를 적지 않으면 검토자는 화면이 덜 만들어진 줄 안다.
          */}
          활동명과 커리큘럼은 목록에 실리지 않습니다. 이름을 눌러 기획안 내용을 확인한 뒤
          처리합니다. 작성 중(미제출) 기획안은 목록에 나오지 않습니다.
        </div>

        {status === "error" ? (
          <EmptyState
            message={errorMessage || "기획안 목록을 불러오지 못했습니다."}
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
                      : rspnsSttsCd === null
                        ? "아직 제출된 기획안이 없습니다."
                        : `${RSPNS_STTS_BADGE[rspnsSttsCd].label} 상태인 기획안이 없습니다.`
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

export function ProposalReviewListPage() {
  const proposalForm = useProposalForm();

  /*
   * 폼 번호를 받기 전에는 목록 훅을 마운트하지 않는다 — 0번 폼으로 조회가 나가거나 "없다"가
   * 잠깐 스쳐 지나가는 것을 막는다(근거는 ProposalFormGate 머리말).
   */
  if (proposalForm.status === "ready" && proposalForm.form) {
    return <ProposalReviewList formId={proposalForm.form.formId} />;
  }
  return <ProposalFormGate title={TITLE} query={proposalForm} />;
}
