"use client";

import { useRouter } from "next/navigation";
import type { MemberImportExecutionRow } from "@/entities/member";
import type { MemberImportWizard } from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import { downloadCsv, toCsvText } from "@/shared/lib/download-csv";
import { Badge, Button, Card, SectionLabel, StatBox } from "@/shared/ui";
import type { BadgeTone } from "@/shared/ui";

/*
 * 4단계 — 이관 실행 결과 (#57 · 서버 #85).
 *
 * ── 성공 한 줄로 끝내지 않는다 ──────────────────────────────────
 * 예전 화면은 `flash("119건 이관 완료")` 뒤에 고정된 3줄을 보여 줬다. 실제 실행은 행 단위라
 * 한 행의 실패가 다른 행을 되돌리지 않고, 그래서 결과는 성공/실패가 아니라 **세 갈래의
 * 보고**다 — 등록·건너뜀·실패. 어느 행이 어디에 들어갔는지는 이 응답에만 있고 되돌릴 수도
 * 없으므로, 모든 행을 그리고 CSV로도 내려받게 한다.
 *
 * ── 재실행이 곧 중복 등록이라는 사실을 여기서 말한다 ─────────────
 * 이 API는 멱등하지 않다. 같은 파일을 다시 올리면 학번이 있는 행은 건너뛰지만 **학번이 없는
 * 졸업 회원 행은 중복이라고 판정할 근거가 아예 없어 두 번 들어간다.** 그 건수가
 * `reimportDuplicatesCount`이고, 이관이 실패한 줄 알고 다시 올리는 일이 흔하므로 그 숫자를
 * 결과 화면에서 드러낸다.
 */

const STATUS_LABEL: Record<string, string> = {
  CREATED: "등록",
  SKIPPED: "건너뜀",
  FAILED: "실패",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  CREATED: "blue",
  SKIPPED: "amber",
  FAILED: "red",
};

export function ResultStep({ wizard }: { wizard: MemberImportWizard }) {
  const router = useRouter();
  const { execution } = wizard;

  if (!execution) return null;

  const { summary, rows } = execution;

  const downloadReport = () => {
    const body = rows.map((row: MemberImportExecutionRow) => [
      row.rowNo,
      row.target,
      STATUS_LABEL[row.status] ?? row.status,
      row.mbrId ?? "",
      row.reason ?? "",
    ]);
    downloadCsv(
      "SSCC_회원이관_결과.csv",
      toCsvText([["행(원본 CSV 줄 번호)", "대상", "결과", "회원 번호", "사유"], ...body]),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-baseline gap-1">
          <div className="text-[40px] font-medium text-accent">{summary.createdCount}</div>
          <div className="text-[16px]">명이 새 회원으로 등록되었습니다</div>
        </div>
        {/* 4칸을 375px에 늘어놓으면 한 칸이 70px이라 '건너뜀 (중복)' 같은 라벨이
            글자마다 끊긴다 — 좁은 화면에서는 2×2로 접고 lg 부터 예전 배치다 */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox label="전체 행" value={summary.totalCount} />
          <StatBox label="등록" value={summary.createdCount} tone="accent" />
          <StatBox label="건너뜀 (중복)" value={summary.skippedCount} />
          <StatBox label="실패" value={summary.failedCount} tone="danger" />
        </div>
      </Card>

      {summary.reimportDuplicatesCount > 0 ? (
        <div className="rounded-[12px] bg-amber-soft px-4 py-3 text-[14px] text-amber">
          <b>같은 파일을 다시 실행하지 마세요.</b> 등록된 {summary.createdCount}건 가운데{" "}
          {summary.reimportDuplicatesCount}건은 학번이 없어(주로 졸업 회원) 시스템이 중복인지
          알아낼 근거가 없습니다 — 다시 실행하면 그 {summary.reimportDuplicatesCount}건이 한 번
          더 등록됩니다. 빠진 회원만 따로 추려 올려주세요.
        </div>
      ) : (
        <div className="text-[13.5px] text-n500">
          등록된 회원은 모두 학번이 있어, 같은 파일을 다시 실행해도 중복으로 등록되지 않고
          건너뜁니다.
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center">
          <SectionLabel>행별 결과 {rows.length}건</SectionLabel>
          <div className="flex-1" />
          <button
            type="button"
            onClick={downloadReport}
            className="cursor-pointer rounded-full bg-accent-soft px-3 py-[5px] text-[13.5px] text-accent hover:bg-accent/15"
          >
            결과 CSV 내려받기
          </button>
        </div>
        <div className="mb-2 text-[13px] text-n500">
          행 번호는 원본 CSV의 줄 번호입니다 (헤더가 1행).
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          <div className="grid grid-cols-[90px_1fr_110px_1.2fr]">
            {["행", "대상", "결과", "비고"].map((h) => (
              <div
                key={h}
                className="sticky top-0 bg-surface pb-[10px] text-[13px] tracking-[.3px] text-n500"
              >
                {h}
              </div>
            ))}
            {rows.map((row) => {
              /* 지역 상수로 받아야 콜백 안에서 null이 아님이 좁혀진다 */
              const memberId = row.mbrId;
              return (
              <div key={row.rowNo} className="contents">
                <div className="border-t border-black/5 py-3 text-[15px]">{row.rowNo}</div>
                <div className="border-t border-black/5 py-3 text-[15px]">{row.target}</div>
                <div className="border-t border-black/5 py-3">
                  <Badge tone={STATUS_TONE[row.status] ?? "grey"}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                </div>
                <div className="border-t border-black/5 py-3 text-[14px] text-n400">
                  {memberId != null ? (
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.memberDetail(memberId))}
                      className="cursor-pointer text-accent underline underline-offset-2"
                    >
                      회원 보기
                    </button>
                  ) : (
                    (row.reason ?? "—")
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div>
        <Button variant="ghost" onClick={() => router.push(ROUTES.members)}>
          회원 목록으로 이동
        </Button>
      </div>
    </div>
  );
}
