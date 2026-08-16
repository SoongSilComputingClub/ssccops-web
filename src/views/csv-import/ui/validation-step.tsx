"use client";

import { useState } from "react";
import {
  memberImportFieldLabel,
  type MemberImportRowIssue,
  type MemberImportRowResult,
} from "@/entities/member";
import type { MemberImportWizard } from "@/features/member";
import { downloadCsv, toCsvText } from "@/shared/lib/download-csv";
import { Badge, Button, Card, SectionLabel, Sheet, StatBox } from "@/shared/ui";

/*
 * 3단계 — 사전 검증 (#57 · 서버 #84).
 *
 * ── 대표 몇 건이 아니라 전량을 보여 준다 ────────────────────────
 * 예전 화면은 오류를 4건만 그렸다. 128행 중 6건을 고쳐야 하는 사람에게 4건만 주면 나머지
 * 둘은 찾을 길이 없다 — 서버는 모든 행을 내려주므로 화면이 자르지 않는다. 길어지는 만큼은
 * 스크롤과 CSV 내려받기로 감당한다(파일을 고치는 일은 대개 이 화면이 아니라 엑셀에서 한다).
 *
 * ── 경고와 오류를 다르게 그린다 ─────────────────────────────────
 * 경고는 이관을 막지 않는다. 연락처가 빈 회원은 그대로 들어가지만 계정 연결이 A안(학번+회원명+
 * 전화번호 3종 일치 · ssccops#78)이라 **나중에 스스로 계정을 연결할 수 없다.** 고쳐야 진행되는
 * 것과 고치면 좋은 것을 한 목록에 섞으면, 둘 다 고치지 않거나 둘 다 붙잡고 있게 된다.
 *
 * ── 실행 전에 세 가지를 분명히 말한다 ───────────────────────────
 * 되돌릴 수 없다는 것, 중복 후보는 건너뛴다는 것(자동 병합 없음 · BR-M40), 그리고 오류 행은
 * 들어가지 않는다는 것. 확인 시트의 체크박스는 그 셋을 읽고 지나가게 하는 장치다.
 */

const STATUS_LABEL: Record<string, string> = {
  ERROR: "오류",
  DUPLICATE: "중복 후보",
  OK: "정상",
};

/** 행 번호가 무엇인지 — 이 화면에서 가장 자주 오해받는 값이라 어느 목록에나 붙인다 */
const ROW_NO_NOTE =
  "행 번호는 원본 CSV의 줄 번호입니다 (헤더가 1행). 파일을 열어 같은 줄 번호로 이동하세요.";

function issueText(issues: MemberImportRowIssue[]): string {
  return issues
    .map((issue) => {
      const field = memberImportFieldLabel(issue.field);
      return field ? `${field} — ${issue.message}` : issue.message;
    })
    .join(" / ");
}

export function ValidationStep({ wizard }: { wizard: MemberImportWizard }) {
  const { validation, executing, executionErrorMessage, validating } = wizard;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  /*
   * 검증 결과가 없는 채로 3단계에 서 있는 경우가 하나 있다 — 실행이 409 IMPORT_FILE_MISMATCH로
   * 거절돼 낡은 결과를 버린 뒤다. 통계를 남겨 두면 같은 실행 버튼이 그 자리에 그대로 있어
   * 운영자가 원인을 모른 채 같은 요청을 반복한다.
   */
  if (!validation) {
    return (
      <div className="flex max-w-[720px] flex-col gap-4">
        {executionErrorMessage && (
          <div className="rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
            {executionErrorMessage}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={wizard.goBack} disabled={validating}>
            컬럼 매핑으로
          </Button>
          <Button onClick={wizard.runValidation} disabled={validating}>
            {validating ? "검증 중…" : "사전 검증 다시 하기"}
          </Button>
        </div>
      </div>
    );
  }

  const { summary, rows } = validation;
  const blocked = rows.filter((row) => row.status !== "OK");
  const warned = rows.filter((row) => row.warnings.length > 0);

  const downloadReport = () => {
    const body = rows.map((row) => [
      row.rowNo,
      row.target,
      STATUS_LABEL[row.status] ?? row.status,
      issueText(row.reasons),
      issueText(row.warnings),
    ]);
    downloadCsv(
      "SSCC_회원이관_검증결과.csv",
      toCsvText([["행(원본 CSV 줄 번호)", "대상", "판정", "사유", "경고"], ...body]),
    );
  };

  const openConfirm = () => {
    setAcknowledged(false);
    setConfirmOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="전체 행" value={summary.totalCount} size="lg" />
        <StatBox label="정상 후보" value={summary.okCount} tone="accent" size="lg" />
        <StatBox label="오류" value={summary.errorCount} tone="danger" size="lg" />
        <StatBox label="중복 후보" value={summary.duplicateCount} tone="danger" size="lg" />
      </div>

      {/*
       * 경고 건수를 위 네 칸에 넣지 않는다. 앞의 셋은 서로 겹치지 않고 합이 전체 행이지만
       * 경고는 그 관계 밖이다 — 경고가 있는 행도 판정은 정상이라 이미 '정상 후보'에 들어 있다.
       * 나란히 두면 합이 맞지 않는 다섯 칸이 되어 어느 수를 믿어야 할지 알 수 없게 된다.
       */}
      <div className="text-[13.5px] text-n500">
        정상 후보 {summary.okCount}건 가운데 {summary.warningCount}건에 경고가 있습니다 — 경고는
        이관을 막지 않으므로 위 네 수에 따로 세지 않았습니다. {ROW_NO_NOTE}
      </div>

      {summary.duplicateCount > 0 && (
        <div className="rounded-[12px] bg-amber-soft px-4 py-3 text-[14px] text-amber">
          중복 후보 {summary.duplicateCount}건은 실행할 때 <b>건너뜁니다</b> — 이미 있는 회원을
          덮어쓰거나 자동으로 합치지 않습니다. 합쳐야 한다면 이관을 마친 뒤 회원 상세에서 직접
          정리해주세요.
        </div>
      )}

      <Card>
        <div className="mb-3 flex items-center">
          <SectionLabel>
            이관되지 않는 행 {blocked.length}건 (오류 {summary.errorCount} · 중복{" "}
            {summary.duplicateCount})
          </SectionLabel>
          <div className="flex-1" />
          <button
            type="button"
            onClick={downloadReport}
            className="cursor-pointer rounded-full bg-accent-soft px-3 py-[5px] text-[13.5px] text-accent hover:bg-accent/15"
          >
            검증 결과 전체 CSV 내려받기
          </button>
        </div>

        {blocked.length === 0 ? (
          <div className="py-6 text-center text-[15px] text-n500">
            모든 행이 이관 가능합니다
          </div>
        ) : (
          <IssueTable rows={blocked} kind="error" />
        )}
      </Card>

      {warned.length > 0 && (
        <Card>
          <SectionLabel className="mb-1">경고 {warned.length}건 — 이관은 됩니다</SectionLabel>
          <div className="mb-3 text-[13.5px] text-n500">
            고치지 않아도 진행되지만, 연락처가 없는 회원은 나중에 스스로 계정을 연결할 수
            없습니다 (계정 연결은 학번·회원명·연락처 세 값이 모두 맞아야 합니다). 지금 파일을
            고쳐 다시 올리는 편이 낫습니다.
          </div>
          <IssueTable rows={warned} kind="warning" />
        </Card>
      )}

      {executionErrorMessage && (
        <div className="rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {executionErrorMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={wizard.goBack} disabled={executing}>
          이전
        </Button>
        <Button
          className="px-[26px] py-[11px]"
          onClick={openConfirm}
          disabled={executing || summary.okCount === 0}
          title={summary.okCount === 0 ? "이관할 수 있는 행이 없습니다" : undefined}
        >
          {executing ? "이관 중…" : `${summary.okCount}건 이관 실행`}
        </Button>
      </div>

      <Sheet
        open={confirmOpen}
        title="이관을 실행합니다"
        hint="되돌릴 수 없습니다 — 잘못 들어간 회원은 한 명씩 손으로 정리해야 합니다."
        onClose={() => setConfirmOpen(false)}
        /*
         * 시트를 곧바로 닫고 진행 상태는 아래 실행 버튼이 보여 준다 — 요청이 나가는 동안
         * 시트가 떠 있으면 결과 화면(4단계)이 그 뒤에서 열려, 무엇을 보고 있는지가 흐려진다.
         * 이중 제출은 훅의 busyRef가 막으므로 시트를 잠가 둘 이유도 없다.
         */
        onOk={() => {
          wizard.runExecution();
          setConfirmOpen(false);
        }}
        okLabel={`${summary.okCount}건 실행`}
        okDisabled={!acknowledged}
        okTitle={acknowledged ? undefined : "아래 확인란을 체크해주세요"}
      >
        <ul className="flex flex-col gap-[6px] text-[14px] text-n300">
          <li>· 정상 후보 {summary.okCount}건이 새 회원으로 등록됩니다</li>
          <li>· 오류 {summary.errorCount}건은 등록되지 않습니다</li>
          <li>· 중복 후보 {summary.duplicateCount}건은 건너뜁니다 (덮어쓰지 않습니다)</li>
          <li>· 등록된 회원은 아직 계정과 연결되지 않은 상태입니다</li>
        </ul>
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-[3px] cursor-pointer"
          />
          <span>되돌릴 수 없다는 것을 확인했습니다</span>
        </label>
      </Sheet>
    </div>
  );
}

/**
 * 행별 사유 목록. 오류와 경고가 같은 표를 쓰되 **색과 문구가 갈린다** — 구조까지 나누면 같은
 * 값(줄 번호·대상)을 두 벌로 그리게 되고, 색이 아니라 '오류'·'경고' 낱말이 뜻을 전한다.
 *
 * 높이를 제한하고 안에서 스크롤하는 것은 오류가 100건이어도 아래의 실행 버튼이 화면 밖으로
 * 밀려나지 않게 하려는 것이다. 전량이 필요할 때는 CSV로 내려받는다.
 */
function IssueTable({
  rows,
  kind,
}: {
  rows: MemberImportRowResult[];
  kind: "error" | "warning";
}) {
  return (
    <div className="max-h-[360px] overflow-y-auto">
      <div className="grid grid-cols-[90px_1fr_1.4fr]">
        {["행", "대상", kind === "error" ? "사유" : "경고"].map((h) => (
          <div
            key={h}
            className="sticky top-0 bg-surface pb-[10px] text-[13px] tracking-[.3px] text-n500"
          >
            {h}
          </div>
        ))}
        {rows.map((row) => (
          <div key={row.rowNo} className="contents">
            <div className="border-t border-black/5 py-3 text-[15px]">{row.rowNo}</div>
            <div className="border-t border-black/5 py-3 text-[15px]">
              {row.target}
              {kind === "error" && (
                <Badge tone={row.status === "DUPLICATE" ? "amber" : "red"} className="ml-2">
                  {STATUS_LABEL[row.status] ?? row.status}
                </Badge>
              )}
            </div>
            <div
              className={`border-t border-black/5 py-3 text-[14px] ${
                kind === "error" ? "text-danger" : "text-amber"
              }`}
            >
              {(kind === "error" ? row.reasons : row.warnings).map((issue, index) => (
                <div key={index}>
                  {issue.field && (
                    <span className="mr-1 text-n400">
                      {memberImportFieldLabel(issue.field)}
                    </span>
                  )}
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
