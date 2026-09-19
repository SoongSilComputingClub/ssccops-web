import Link from "next/link";
import { receiptStatusBadge, recruitmentPhaseOf } from "@/entities/form";
import { acdmActvTypeNm, type AcademicProgramSummary } from "@/entities/academic-program";
import { studioProgramFormUrl } from "@/shared/config/routes";
import { formatDt, formatYmd } from "@/shared/lib/date";
import { Badge, Card } from "@/shared/ui";

/*
 * 모집 카드 한 장 (#528).
 *
 * 그리는 값이 **전부 목록 응답에서 온다** — 서버가 #483에서 폼 조인 한 줄과 접수 건수 집계를
 * 붙였다. 카드마다 상세를 한 번 더 부르지 않는다.
 */

/** 접수 기간의 한 칸 — 값이 없으면 «-»를 그린다(표시 규칙은 그리는 쪽이 정한다) */
function Cell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[10px] border border-line px-[11px] py-[9px]">
      <div className="text-[12.5px] text-n500">{label}</div>
      <div className="mt-[2px] text-[14.5px] text-ink">{value}</div>
    </div>
  );
}

/** 모집 정원 — 최소·최대 중 있는 것만 말한다. 둘 다 없으면 «-» */
function capacityText(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} ~ ${max}명`;
  if (max != null) return `최대 ${max}명`;
  if (min != null) return `최소 ${min}명`;
  return "-";
}

export function RecruitmentCard({ program }: Readonly<{ program: AcademicProgramSummary }>) {
  /*
   * 폼이 없는 활동은 목록 로더가 이미 걸렀다 — 여기 오는 행에는 `formReceiptStatus`가 있다.
   * 그래도 없으면 «모집 시작 전»으로 읽는다(아직 접수 일시가 없는 폼과 같은 자리).
   */
  const phase = recruitmentPhaseOf(program.formReceiptStatus ?? "DRAFT");
  const badge = receiptStatusBadge(program.formReceiptStatus ?? "DRAFT");
  const editable = phase === "before";

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <Badge tone="outline">{acdmActvTypeNm(program.typeCd)}</Badge>
        <div className="flex-1" />
        {/*
          «편집»과 «보기»가 라벨로 갈린다 — 누르기 전에 무엇이 되는지 알아야 한다.
          접수가 시작된 뒤에도 링크를 없애지 않는 것은, 리더가 자기 공고에 무엇을 물었는지
          되돌아볼 자리가 여기뿐이기 때문이다(서버도 그래서 창이 닫혀도 200을 준다).
        */}
        <Link
          href={studioProgramFormUrl(program.academicProgramId)}
          className={
            editable
              ? "rounded-[10px] bg-accent px-[14px] py-[8px] text-[14px] font-semibold text-on-solid hover:bg-accent-strong"
              : "rounded-[10px] px-[14px] py-[8px] text-[14px] text-n300 shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:text-ink"
          }
        >
          {editable ? "지원서 문항 편집" : "지원서 문항 보기"}
        </Link>
      </div>

      <h2 className="mt-3 text-[19px] font-medium tracking-[-.3px]">{program.title || "-"}</h2>
      <p className="mt-[2px] text-[13.5px] text-n500">
        {program.approvedAt ? `기획안 승인 ${formatYmd(program.approvedAt)}` : "기획안 승인일 없음"}
        {program.leaderName ? ` · ${program.leaderName}` : ""}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-4">
        <Cell label="접수 시작" value={program.rcptBgngDt ? formatDt(program.rcptBgngDt) : "-"} />
        <Cell label="접수 종료" value={program.rcptEndDt ? formatDt(program.rcptEndDt) : "-"} />
        <Cell label="모집 정원" value={capacityText(program.pscpMinCnt, program.pscpMaxCnt)} />
        {/*
          지원 건수는 접수 전에도 서버가 0을 그대로 준다 — «-»로 바꾸는 것은 표시 규칙이다.
          아직 받을 수 없는 구간에 «0건»을 그리면 «아무도 지원하지 않았다»로 읽힌다.
        */}
        <Cell
          label="지원"
          value={phase === "before" ? "-" : `${program.applicationCount}건`}
        />
      </div>

      {editable && (
        <div className="mt-3 rounded-[10px] border border-amber/45 bg-amber-soft px-[12px] py-[10px] text-[13.5px] text-amber">
          {/*
            창이 닫히는 시각은 접수 시작 일시다. 일시가 없으면(학술국장이 아직 정하지 않음)
            «언제까지»를 말할 수 없으므로 그 사실만 말한다 — 없는 마감을 지어내지 않는다.
          */}
          {program.rcptBgngDt
            ? `접수가 열리기 전까지만 문항을 고칠 수 있습니다 · ${formatDt(program.rcptBgngDt)}부터 접수`
            : "모집 일정이 아직 정해지지 않았습니다. 지금은 문항을 고칠 수 있습니다."}
          {program.qitemVer != null ? ` · 문항 버전 v${program.qitemVer}` : ""}
        </div>
      )}
    </Card>
  );
}
