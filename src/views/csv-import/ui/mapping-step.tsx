"use client";

import { MEMBER_IMPORT_FIELDS } from "@/entities/member";
import type { MemberImportWizard } from "@/features/member";
import { Button, Card, SectionLabel, SelectField } from "@/shared/ui";

/*
 * 2단계 — 컬럼 매핑 (#57).
 *
 * ── 헤더도 추천값도 미리보기 응답에서 온다 ──────────────────────
 * 화면은 파일을 열지 않는다. 여기 보이는 컬럼 이름·앞 5행은 **서버가 CSV 규칙대로 읽은 값**이며,
 * 그래서 따옴표로 감싼 필드("회장,프로젝트장")도 서버가 읽은 그대로 한 칸에 들어온다. 웹이
 * 따로 파싱하면 화면에서 매핑한 컬럼과 서버가 읽는 컬럼이 어긋나고, 그 어긋남은 이관이 끝난
 * 뒤 명부를 열어 봐야 드러난다.
 *
 * ── 추천은 짐작이다 ─────────────────────────────────────────────
 * `recommendedMapping`은 헤더 이름으로 짐작한 값이라 빗나갈 수 있다. 그래서 앞 5행을 함께
 * 보여 준다 — '학년'과 '등급'처럼 이름만으로는 갈리지 않는 컬럼도 값을 보면 곧바로 알 수 있다.
 */

/** 매핑되지 않으면 서버가 요청 전체를 400으로 거절하는 셋 */
const REQUIRED_LABELS = MEMBER_IMPORT_FIELDS.filter((f) => f.mappingRequired)
  .map((f) => f.label)
  .join(" · ");

export function MappingStep({ wizard }: { wizard: MemberImportWizard }) {
  const { preview, mapping, mapHeader, mappingProblem, validating, validationErrorMessage } =
    wizard;

  if (!preview) return null;

  const headers = Object.keys(mapping);
  /*
   * 같은 헤더가 두 번 나오는 파일(엑셀에서 흔하다)에서는 매핑 항목이 하나로 합쳐진다 —
   * 서버가 헤더 이름으로 컬럼을 찾을 때 첫 번째를 쓰기 때문이다. 줄 수가 갈리면 그 사실을
   * 밝힌다. 밝히지 않으면 운영자는 뒤쪽 같은 이름의 컬럼도 함께 들어갈 것이라 믿는다.
   */
  const hasDuplicateHeaders = preview.headers.length !== headers.length;

  /** 어느 필드가 이미 다른 헤더에 배정됐는지 — 중복 배정은 서버가 400으로 거절한다 */
  const assignedCount = new Map<string, number>();
  for (const fieldKey of Object.values(mapping)) {
    if (fieldKey) assignedCount.set(fieldKey, (assignedCount.get(fieldKey) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-[720px]">
        <SectionLabel className="mb-1">CSV 헤더 → 시스템 필드</SectionLabel>
        <div className="mb-4 text-[13.5px] text-n500">
          {REQUIRED_LABELS}은(는) 반드시 지정해야 합니다. 나머지는 비워 두면 이관하지 않습니다.
        </div>

        <div className="flex flex-col gap-3">
          {headers.map((header) => {
            const fieldKey = mapping[header];
            const duplicated = fieldKey !== "" && (assignedCount.get(fieldKey) ?? 0) > 1;
            /*
             * 첫 행의 값 — 어느 컬럼인지 이름만으로 갈리지 않을 때 사람이 보는 단서다.
             * 칸을 찾을 때 헤더 목록에서의 **첫 번째** 자리를 쓰는 것은 서버가 같은 이름의
             * 헤더를 만났을 때 고르는 컬럼이 그것이기 때문이다(`MemberImportMapping.of`).
             */
            const column = preview.headers.indexOf(header);
            const sample = preview.sampleRows[0]?.[column] ?? "";

            return (
              <div key={header} className="flex items-center gap-3">
                <div className="w-[180px] min-w-0">
                  <div className="truncate text-[15px] font-medium">{header || "(빈 헤더)"}</div>
                  {sample && (
                    <div className="truncate font-mono text-[12.5px] text-n500">{sample}</div>
                  )}
                </div>
                <div className="text-n500">→</div>
                <SelectField
                  value={fieldKey}
                  onChange={(e) => mapHeader(header, e.target.value)}
                  aria-label={`${header} 컬럼이 들어갈 시스템 필드`}
                  className={`max-w-[240px] ${duplicated ? "border-danger" : ""}`}
                >
                  <option value="">매핑 안 함</option>
                  {MEMBER_IMPORT_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                      {f.mappingRequired ? " *" : ""}
                    </option>
                  ))}
                </SelectField>
              </div>
            );
          })}
        </div>

        {hasDuplicateHeaders && (
          <div className="mt-4 rounded-[10px] bg-amber-soft px-3 py-[10px] text-[13.5px] text-amber">
            같은 이름의 헤더가 여러 개입니다 — 서버는 그중 <b>첫 번째 컬럼</b>만 읽습니다. 뒤쪽
            컬럼도 이관해야 한다면 파일에서 헤더 이름을 다르게 고쳐 다시 올려주세요.
          </div>
        )}

        <div className="mt-4 text-[13.5px] text-n500">
          졸업연도·역할은 고를 수 있는 필드에 없습니다 — 회원 테이블에 대응하는 칸이 없어
          이관되지 않습니다. 역할은 이관 뒤 회원 상세에서 부여합니다.
        </div>
      </Card>

      <Card className="max-w-[720px]">
        <SectionLabel className="mb-1">파일 미리보기</SectionLabel>
        <div className="mb-3 text-[13.5px] text-n500">
          서버가 읽은 앞 {preview.sampleRows.length}행입니다 (전체 {preview.totalRowCount}행).
          값이 밀려 보인다면 매핑이 아니라 파일의 쉼표·따옴표를 확인해주세요.
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr>
                {preview.headers.map((header, index) => (
                  <th
                    key={`${header}-${index}`}
                    className="whitespace-nowrap px-2 pb-[10px] text-[13px] font-normal tracking-[.3px] text-n500"
                  >
                    {header || "(빈 헤더)"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((value, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-t border-black/5 px-2 py-[10px] font-mono text-[12.5px] whitespace-nowrap text-n300"
                    >
                      {value || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {mappingProblem && (
        <div className="max-w-[720px] rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {mappingProblem}
        </div>
      )}
      {validationErrorMessage && (
        <div className="max-w-[720px] rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
          {validationErrorMessage}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={wizard.goBack} disabled={validating}>
          이전
        </Button>
        <Button
          className="px-[26px] py-[11px]"
          onClick={wizard.runValidation}
          disabled={validating || mappingProblem !== ""}
          title={mappingProblem || undefined}
        >
          {validating ? "검증 중…" : "사전 검증"}
        </Button>
      </div>
    </div>
  );
}
