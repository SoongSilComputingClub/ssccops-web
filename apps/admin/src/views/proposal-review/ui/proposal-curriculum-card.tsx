"use client";

import type { AcademicProgramPreview } from "@/entities/response";
import { formatYmd } from "@/shared/lib/date";
import { Card, EmptyState, SectionLabel } from "@/shared/ui";

/**
 * 회차별 커리큘럼 표 (#164 · 서버 #150의 `academicProgramPreview`).
 *
 * ── 화면은 커리큘럼을 파싱하지 않는다 ─────────────────────────
 * 그리는 것은 **서버가 준 회차 목록**뿐이다. 커리큘럼은 자유 텍스트로 접수되고(정규식을 걸지
 * 않는다) 승인 시점에 회차로 쪼개지는데, 그 파싱이 화면에도 한 벌 생기면 검토자가 승인한 것과
 * 실제로 만들어지는 것이 갈린다 — 자유 텍스트라 그 갈림은 가정이 아니라 실제로 일어난다.
 * 여기 보이는 표는 승인 버튼을 눌렀을 때 만들어질 회차 그 자체다.
 *
 * ── 파싱이 어긋나면 표 대신 사유를 그린다 ─────────────────────
 * 실패한 기획안의 회차 목록은 **빈 배열이다**(절반만 옮기는 이관은 없다). 그 상태에서 표를
 * 그리면 "커리큘럼을 안 적은 기획안"으로 보이므로, 표 자리에 사유를 적고 검토자를 수정요청으로
 * 돌린다. 제출자가 실제로 적은 글은 이 카드가 아니라 **기획안 내용 카드에 원문 그대로** 남아
 * 있다 — 화면이 파싱에 실패했다고 제출자가 쓴 것을 삼키지 않는다.
 *
 * ── 공용 GridTable을 쓰지 않는 이유 ───────────────────────────
 * 그쪽은 넓은 화면에서 셀을 한 줄로 자른다(`text-ellipsis whitespace-nowrap`). 회차 주제는
 * 200자까지 오는 자유 입력이라 그 규칙 아래서는 승인 직전에 읽어야 할 문장의 뒷부분이 조용히
 * 사라진다 — 목록 표에서는 맞는 규칙이지만 검토 화면에서는 반대다. 그래서 같은 열 구조를
 * 줄바꿈되는 그리드로 직접 그린다.
 */
export function ProposalCurriculumCard({
  preview,
}: {
  /** 기획안이 아니거나 미리보기를 받지 못했으면 null */
  preview: AcademicProgramPreview | null;
}) {
  /* 375px에서는 한 줄씩 쌓이고 lg 이상에서 회차·주제·계획일이 열로 선다 */
  const ROW = "lg:grid lg:grid-cols-[88px_1fr_128px] lg:gap-3";

  return (
    <Card>
      <SectionLabel className="mb-1">회차별 커리큘럼</SectionLabel>
      <div className="text-[13px] leading-[1.7] text-n500">
        승인하면 이 표대로 회차가 만들어집니다. 제출자가 적은 원문은 기획안 내용에 그대로
        있습니다.
      </div>

      {preview === null ? (
        <EmptyState
          padding="sm"
          message="커리큘럼 미리보기를 받지 못했습니다 — 기획안 내용에 적힌 원문을 그대로 확인해주세요"
        />
      ) : !preview.migratable ? (
        <div className="mt-4 rounded-[12px] border border-amber/40 bg-amber-soft px-3 py-[10px] text-[13.5px] leading-[1.7] text-amber">
          <div className="font-medium">커리큘럼을 회차로 나누지 못했습니다</div>
          {/* 서버가 보낸 사유를 그대로 적는다 — 몇 번째 줄이 어떻게 어긋났는지가 여기 담긴다 */}
          <div className="mt-[3px] break-words whitespace-pre-wrap">
            {preview.failureReason ||
              "무엇이 어긋났는지 사유를 받지 못했습니다. 기획안 내용의 커리큘럼 원문을 확인해주세요"}
          </div>
          <div className="mt-2">
            지금 승인하면 같은 사유로 거절됩니다. 이 사유를 검토 의견에 적어 수정요청으로
            돌려주세요.
          </div>
        </div>
      ) : preview.curriculumItems.length === 0 ? (
        /* 승인은 되는데 회차가 없는 경우다 — 정상 흐름에는 없지만 없는 줄을 지어내지 않는다 */
        <EmptyState padding="sm" message="만들어질 회차가 없습니다." />
      ) : (
        <div className="mt-4">
          <div className={`hidden ${ROW} pb-[10px] text-[13px] tracking-[.3px] text-n500`}>
            <div>회차</div>
            <div>주제</div>
            <div>계획일</div>
          </div>
          <ol>
            {preview.curriculumItems.map((item, index) => (
              <li
                key={`${item.seqno ?? "-"}|${index}`}
                className={`flex flex-col gap-[2px] border-t border-black/5 py-3 ${ROW}`}
              >
                {/*
                  회차 번호는 제출자가 적은 값이지 줄 순서로 매긴 값이 아니다(서버가 그렇게
                  파싱한다). 없으면 자리 번호로 메우지 않는다 — 그러면 3회차를 빼먹은 기획안이
                  화면에서 메워져 검토자가 빠진 회차를 알아챌 길이 사라진다.
                */}
                <div className="text-[13.5px] text-n500 lg:text-[15px] lg:text-n300">
                  {item.seqno === null ? "-" : `${item.seqno}회차`}
                </div>
                <div className="min-w-0 text-[16px] leading-[1.7] break-words lg:text-[15px]">
                  {item.ttl || "-"}
                </div>
                {/* 날짜는 생략할 수 있는 값이다 — 비어 있는 것이 정상이라 오류처럼 보이게 두지 않는다 */}
                <div className="text-[13.5px] text-n500 lg:text-[15px] lg:text-n300">
                  {formatYmd(item.planDt) || "미정"}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
