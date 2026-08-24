"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormDetail } from "@/entities/form";
import { mbrGrdNm, mbrSttsNm } from "@/entities/member";
import {
  RSPNS_STTS_BADGE,
  rspnsValueText,
  type FormResponseDetail,
} from "@/entities/response";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useFormDetail } from "@/features/form";
import { ResponseStatusSheet, useResponseDetail } from "@/features/response";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import { formatDt } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KeyValueGrid,
  PageBody,
  PageHeader,
  SectionLabel,
} from "@/shared/ui";

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_REVIEW = "응답을 심사할 권한이 없습니다";

/**
 * 응답 한 건을 그린다.
 *
 * ── 두 번 부르는 이유 ─────────────────────────────────────────
 * 응답 API는 `rspnsCn`(문항 ID → 답변)만 준다. 문항 라벨은 폼 소유이고 편집으로 바뀌므로
 * 응답에 복사해 두지 않는다 — 라벨은 폼 상세 API의 `qitemCpstCn`에서 온다. 그래서 이 화면은
 * 응답 상세와 폼 상세를 **둘 다** 받아 문항 순서 기준으로 맞춰 그린다.
 */
function ResponseDetailContent({
  formId,
  form,
  response,
  reload,
}: {
  formId: number;
  form: FormDetail;
  response: FormResponseDetail;
  reload: () => void;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const canReview = useCan(CAPABILITY.RESPONSE_REVIEW);

  const { member } = response;
  const badge = RSPNS_STTS_BADGE[response.rspnsSttsCd];
  /*
   * 심사할 수 없는 이유가 둘이고 사용자에게는 서로 다른 말이 필요하다 — "아직 제출 전"은
   * 기다리면 풀리고 "권한 없음"은 역할을 받아야 풀린다. 버튼은 둘 다 잠그되 문구는 나눈다.
   */
  const submitted = response.rspnsSttsCd !== "DRAFT";
  const reviewable = submitted && canReview;

  /*
   * 이전/다음은 서버가 준 인접 ID로만 움직인다.
   *
   * 예전에는 목 스토어의 목록 배열을 `rows[idx ± 1]`로 훑었는데, 서버 연동 후에는 상세 화면이
   * 목록을 들고 있지 않다(URL로 바로 들어올 수도 있다). 계약(#37)이 목록 정렬 기준의
   * prevFormRspnsId/nextFormRspnsId를 함께 내려주므로 그 값만 따른다 — 끝이면 null이라
   * 버튼이 비활성화된다.
   *
   * replace를 쓰는 것은 의도한 것이다. 응답 수십 건을 훑고 나서 뒤로가기 한 번이면 목록으로
   * 돌아와야지, 훑은 만큼 히스토리를 되짚게 하면 안 된다.
   */
  const go = (targetFormRspnsId: number | null) => {
    if (targetFormRspnsId === null) return;
    router.replace(ROUTES.responseDetail(formId, targetFormRspnsId));
  };

  return (
    <>
      <PageHeader
        title="응답 상세"
        subtitle={`응답 #${response.formRspnsId}`}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <div className="flex items-center gap-2">
              <div className="text-[23px] font-medium">{member.mbrNm || "-"}</div>
              <div className="flex-1" />
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <div className="mt-1 text-[13px] text-n500">
              회원 정보는 mbr 에서 조회 · 응답에 중복 저장하지 않음
            </div>
            <KeyValueGrid
              className="mt-4"
              items={[
                { k: FIELD_LABEL.memberId, v: String(member.mbrId) },
                { k: FIELD_LABEL.studentNumber, v: member.stdntNo || "-" },
                { k: FIELD_LABEL.generationNumber, v: member.genNo ? `${member.genNo}기` : "-" },
                { k: FIELD_LABEL.departmentName, v: member.scsbjtNm || "-" },
                { k: FIELD_LABEL.academicYear, v: member.scyrNo ? `${member.scyrNo}학년` : "-" },
                { k: "전화번호", v: member.telno || "-" },
                { k: FIELD_LABEL.membershipGrade, v: mbrGrdNm(member.mbrGrdCd) },
                { k: FIELD_LABEL.membershipStatus, v: mbrSttsNm(member.mbrSttsCd) },
                // 작성 중 응답은 아직 제출되지 않아 일시가 없다
                { k: FIELD_LABEL.submittedAt, v: formatDt(response.sbmsnDt) || "-" },
              ]}
            />
            <button
              type="button"
              onClick={() => router.push(ROUTES.memberDetail(member.mbrId))}
              className="mt-4 cursor-pointer text-[14px] text-accent"
            >
              회원 상세로 이동 ›
            </button>
          </Card>

          <Card>
            <SectionLabel className="mb-3">{FIELD_LABEL.responseContent}</SectionLabel>
            <div className="flex flex-col gap-3">
              {/* 폼의 문항 순서가 기준이다 — 응답에 없는 문항도 자리를 남긴다 */}
              {form.qitemCpstCn.qitems.map((q) => {
                const v = rspnsValueText(response.rspnsCn, q.qitemId);
                return (
                  <div key={q.qitemId}>
                    <div className="text-[13.5px] text-n500">
                      {q.qitemLblNm}
                      <span className="ml-1 font-mono text-[12px]">({q.qitemId})</span>
                    </div>
                    {/* 답변은 응답자가 쓴 자유 입력이다 — 링크·이메일처럼 띄어쓰기가
                        없는 값이 오면 줄바꿈되지 않고 카드 밖으로 밀린다 */}
                    <div className="mt-[2px] text-[16px] break-words">
                      {v || <span className="text-n500">(응답 없음)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/*
          Button은 whitespace-nowrap이라 자리가 모자라면 접히는 대신 글자가 테두리 밖으로
          밀려 나간다 — 잠긴 사유 문구까지 같은 줄에 서는 자리라 좁은 화면에서는 조각
          단위로 접히게 한다. lg:flex-nowrap으로 1024px 이상은 지금까지처럼 한 줄이다.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <Button
            variant="ghost"
            disabled={response.prevFormRspnsId === null}
            onClick={() => go(response.prevFormRspnsId)}
          >
            이전
          </Button>
          <Button
            disabled={!reviewable}
            title={canReview ? undefined : NO_REVIEW}
            onClick={() => setSheetOpen(true)}
          >
            응답 상태 변경
          </Button>
          <Button
            variant="ghost"
            disabled={response.nextFormRspnsId === null}
            onClick={() => go(response.nextFormRspnsId)}
          >
            다음
          </Button>
          {!submitted ? (
            <div className="text-[13.5px] text-n500">
              아직 제출되지 않은 응답이라 심사할 수 없습니다.
            </div>
          ) : (
            !canReview && <div className="text-[13.5px] text-n500">{NO_REVIEW}</div>
          )}
        </div>

        <ResponseStatusSheet
          formId={formId}
          formRspnsId={sheetOpen ? response.formRspnsId : null}
          current={response.rspnsSttsCd}
          onClose={() => setSheetOpen(false)}
          onChanged={reload}
        />
      </PageBody>
    </>
  );
}

/**
 * 응답 상세 — 목록 배열을 훑지 않고 단건 API로 받는다.
 *
 * 예전에는 목 스토어의 응답 배열에서 `findIndex`로 골랐다. 목록 응답에는 응답 내용(rspnsCn)이
 * 실리지 않으므로 그 방식은 서버 연동에서 성립하지 않고, URL로 바로 들어오면 목록 자체가
 * 없어 "응답을 찾을 수 없습니다"가 떴다.
 *
 * **다른 폼의 응답 ID로 들어오면 서버가 404를 준다** — 경로의 formId 범위를 서버가 검사하므로
 * (#37) 웹은 그 404를 없는 응답과 똑같이 처리하면 된다.
 */
export function ResponseDetailPage({
  formId,
  formRspnsId,
}: {
  formId: number;
  formRspnsId: number;
}) {
  const rspns = useResponseDetail(formId, formRspnsId);
  const formQuery = useFormDetail(formId);

  const reloadAll = () => {
    rspns.reload();
    formQuery.reload();
  };

  if (rspns.status === "ready" && rspns.response && formQuery.form) {
    return (
      <ResponseDetailContent
        formId={formId}
        form={formQuery.form}
        response={rspns.response}
        reload={reloadAll}
      />
    );
  }

  /*
   * 두 조회 중 하나라도 "없음"이면 없는 것으로 본다 — 폼이 없으면 그 폼의 응답도 없다.
   * 오류는 둘 중 먼저 잡힌 쪽 메시지를 쓰고, 재시도는 둘 다 다시 부른다.
   */
  const notFound = rspns.status === "not-found" || formQuery.status === "not-found";
  const errorMessage = rspns.errorMessage || formQuery.errorMessage;
  const failed = rspns.status === "error" || formQuery.status === "error";

  return (
    <>
      <PageHeader title="응답 상세" showBack />
      <PageBody>
        {notFound ? (
          <EmptyState message="응답을 찾을 수 없습니다." />
        ) : failed ? (
          <EmptyState
            message={errorMessage || "응답을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reloadAll }}
          />
        ) : (
          <EmptyState message="불러오는 중…" />
        )}
      </PageBody>
    </>
  );
}
