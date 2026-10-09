"use client";

import Link from "next/link";
import type { RosterPositionNotation, RosterSemester } from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  ROSTER_EXPORT_FORBIDDEN_MESSAGE,
  useMemberRosterExport,
  type MemberRosterExport,
} from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { formatYmd } from "@/shared/lib/date";
import { Button, Card, EmptyState, Field, PageBody, PageHeader, SelectField } from "@/shared/ui";

/*
 * 회원명부 내보내기 (#785 · 서버 #674 · 상위 ssccops#598).
 *
 * 운영진이 학기마다 동아리연합회에 내는 회원명부를 서버가 원본 양식 그대로 xlsx로 만든다. 화면은
 * **연도·학기와 옵션 둘을 받아 내려받기만** 한다 — 누구를 넣고 무엇으로 적을지는 서버 규칙이다.
 *
 * ── 순서가 «누가 들어가나 → 파일 이름»이다 (#789) ───────────────
 * 위에서부터 포함할 상태 · 직책 표기법 · 명단 미리보기(기준일 · 인원 · 빠지는 이유)이고, 연도·학기는
 * 맨 아래 «파일 이름» 칸에서 고른다. 처음(#785)에는 연도·학기가 맨 위였고 안내 한 줄(«명단은 오늘
 * 기준입니다»)이 있었는데, 맨 위의 연도 선택은 명단을 거르는 필터로 읽혔다(2026-10-09 운영진).
 * 서버에는 학기 개념이 없어 두 값은 제목과 파일 이름에만 쓰인다 — 그래서 고른 값으로 만들어질
 * 파일 이름을 바로 아래에 보여 주고, 명단 쪽에는 기준일을 날짜로 적는다.
 *
 * 권한은 CSV 회원 이관과 같은 `MEMBER_MANAGE`다(서버 클래스 레벨 `@RequireAuthority`). 목차에서는
 * 감추고, 주소로 들어오면 CSV 이관 화면처럼 안내만 그린다 — 이 화면에서 할 수 있는 일이 내려받기
 * 하나뿐이라 잠긴 버튼만 남은 화면은 뜻이 없다.
 */

/*
 * 직책 표기법 두 선택지 — 이름과 설명은 Story(ssccops#598) 표가 정본이다.
 *
 * 체크박스 하나(«실제 역할로 표기»)가 아니라 이름과 설명을 붙인 라디오인 것은 끈 상태가 무엇인지
 * 화면만 봐서는 알 수 없어서다. 체크박스 둘이 아닌 것은 서로 배타라 «둘 다»·«둘 다 아님»이라는
 * 뜻 없는 상태가 생기기 때문이다.
 */
const NOTATION_OPTIONS: readonly {
  value: RosterPositionNotation;
  label: string;
  description: string;
}[] = [
  {
    value: "FEDERATION",
    label: "동아리연합회 표기법",
    description: "동아리연합회 제출용입니다. 회장·부회장 외 모든 회원을 ‘정회원’으로 적습니다.",
  },
  {
    value: "SSCC",
    label: "SSCC 표기법",
    description:
      "동아리 내부용입니다. SSCC 직책 체계대로 회장·부회장 외 회원은 대표 역할로 적고, 대표 역할이 없으면 비워 둡니다.",
  },
];

const SEMESTERS: readonly RosterSemester[] = [1, 2];

/* 묶음 제목 — `Field`의 라벨과 같은 모양이다(체크박스·라디오 묶음은 `<fieldset>`이라 직접 그린다) */
const LEGEND = "mb-[8px] block text-[13.5px] text-n400";

export function MemberRosterExportPage() {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/csv-import 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원명부 내보내기" />
        <PageBody>
          <EmptyState message={ROSTER_EXPORT_FORBIDDEN_MESSAGE} />
        </PageBody>
      </>
    );
  }

  return <RosterExportForm />;
}

function RosterExportForm() {
  const roster = useMemberRosterExport();
  const loading = roster.status === "loading";

  return (
    <>
      <PageHeader title="회원명부 내보내기" subtitle="동아리연합회 양식의 xlsx" />
      <PageBody>
        {/* 서버가 내려받은 기록을 감사 로그에 남긴다 — 누르기 전에 알 수 있어야 한다 */}
        <div className="mb-4 max-w-[720px] text-[14px] leading-[1.7] text-n400">
          연락처·학번이 담긴 파일입니다. 내려받은 기록이 남습니다.
        </div>

        <Card className="flex max-w-[720px] flex-col gap-6">
          <StatusSection roster={roster} disabled={loading} />
          <NotationSection roster={roster} disabled={loading} />
          <PreviewSection roster={roster} />
          <FileNameSection roster={roster} disabled={loading} />

          {roster.status === "error" && (
            <div className="rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
              {roster.errorMessage}
              {/* 회장 역할을 배정해야 풀리는 거절이다 — 옵션을 바꿔도 같다 */}
              {roster.presidentMissing && (
                <>
                  {" "}
                  <Link href={ROUTES.roles} className="text-accent underline">
                    역할 관리로
                  </Link>
                </>
              )}
            </div>
          )}

          <div>
            <Button
              onClick={roster.download}
              disabled={loading || roster.blockReason !== null}
              title={roster.blockReason ?? undefined}
            >
              {loading ? "내려받는 중…" : "내려받기"}
            </Button>
          </div>
        </Card>
      </PageBody>
    </>
  );
}

/**
 * 파일 이름 — 연도·학기를 여기서 고른다. 서버에 학기 개념이 없어 두 값은 제목과 파일 이름에만 쓰인다.
 *
 * 고른 값으로 만들어질 파일 이름과 제목을 셀렉트 바로 아래에 보인다. 둘 다 미리보기 응답의 값이고
 * 화면이 짓지 않는다(규칙이 두 벌이 된다). 미리보기가 없으면(상태를 하나도 고르지 않았다 등) 비운다.
 */
function FileNameSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  const { preview, previewLoading } = roster;

  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>파일 이름</legend>
      <div className="grid max-w-[360px] grid-cols-2 gap-3">
        <Field label="연도">
          <SelectField
            value={roster.year}
            onChange={(e) => roster.setYear(Number(e.target.value))}
            disabled={disabled}
          >
            {roster.yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="학기">
          <SelectField
            value={roster.semester}
            onChange={(e) => roster.setSemester(Number(e.target.value) === 1 ? 1 : 2)}
            disabled={disabled}
          >
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}학기
              </option>
            ))}
          </SelectField>
        </Field>
      </div>
      {preview && (
        <div
          className={cn("mt-[10px] text-[14px] leading-[1.6] transition-opacity", previewLoading && "opacity-60")}
          aria-busy={previewLoading}
        >
          <div className="break-all font-medium">{preview.fileName}</div>
          <div className="text-n500">제목: {preview.title}</div>
        </div>
      )}
      <div className="mt-[6px] text-[13px] leading-[1.6] text-n500">
        연도·학기는 파일 제목과 이름에만 쓰입니다. 명단은 위 미리보기 그대로입니다.
      </div>
    </fieldset>
  );
}

/**
 * 포함할 회원 상태 — 선택지는 `GET /v1/member-statuses` 그대로다(화면이 목록을 박아 두지 않는다).
 *
 * 임시회원 제외·회장단 포함은 서버의 고정 규칙이라 체크박스가 없고 한 줄로만 밝힌다.
 */
function StatusSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>포함할 회원 상태</legend>

      {roster.statusesLoading && <div className="text-[14px] text-n500">불러오는 중…</div>}
      {roster.statusesFailed && (
        <div className="text-[13.5px] text-danger">
          회원 상태 목록을 불러오지 못했습니다 — 새로고침해주세요
        </div>
      )}
      {roster.statuses.length > 0 && (
        <div className="flex flex-wrap gap-x-[18px] gap-y-[10px]">
          {roster.statuses.map((s) => (
            <label
              key={s.code}
              className={cn(
                "flex items-center gap-[6px] text-[15px]",
                disabled ? "cursor-default" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                className="size-[17px] flex-none accent-accent disabled:cursor-not-allowed disabled:opacity-60"
                checked={roster.isStatusChecked(s.code)}
                onChange={() => roster.toggleStatus(s.code)}
                disabled={disabled}
              />
              {s.name}
            </label>
          ))}
        </div>
      )}

      {roster.noStatusChosen && (
        <div className="mt-[8px] text-[13px] text-danger">포함할 회원 상태를 하나 이상 골라주세요</div>
      )}
      <div className="mt-[8px] text-[13px] leading-[1.6] text-n500">
        회장·부회장은 고른 상태와 관계없이 항상 포함됩니다. 임시회원은 포함되지 않습니다.
      </div>
    </fieldset>
  );
}

/**
 * 명단 미리보기 — 명단 기준일과, 지금 고른 조건으로 몇 명이 들어가고 몇 명이 왜 빠지는지.
 *
 * 기준일은 서버의 오늘(`baseDate`)이다. 연도·학기를 바꿔도 이 칸의 날짜와 인원이 그대로인 것이
 * «연도는 명단을 거르지 않는다»를 말로 설명하지 않고 보여 주는 자리다.
 *
 * 빠지는 회원을 «임시회원»과 «고르지 않은 상태»로 가르는 것이 요점이다 — 회원 목록 인원과 명부 줄
 * 수가 다른 이유가 대개 앞의 것이고, 그것은 상태를 넓혀도 풀리지 않는다(등급을 바꿔야 한다).
 * 회장이 없으면 내려받기가 거절되므로 여기서 먼저 알린다. 버튼은 잠그지 않는다 — 미리보기와
 * 누르는 순간 사이에 회장이 배정될 수 있고, 그때 거절 여부는 서버가 다시 판정한다.
 */
function PreviewSection({ roster }: Readonly<{ roster: MemberRosterExport }>) {
  const { preview, previewLoading, previewErrorMessage } = roster;

  // 잠겨 있어 묻지 않았다(상태를 하나도 고르지 않았다 등) — 사유는 해당 칸 아래에 이미 있다
  if (!preview && !previewLoading && !previewErrorMessage) return null;

  return (
    <section aria-label="명단 미리보기">
      <div className={LEGEND}>명단 미리보기</div>

      {previewErrorMessage && <div className="text-[13.5px] text-danger">{previewErrorMessage}</div>}
      {!preview && previewLoading && <div className="text-[14px] text-n500">인원을 세는 중…</div>}

      {preview && (
        <div
          className={cn(
            "rounded-[12px] border border-line bg-surface px-[14px] py-3 text-[14px] leading-[1.6] transition-opacity",
            previewLoading && "opacity-60",
          )}
          aria-busy={previewLoading}
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-[6px]">
            <dt className="text-n500">명단 기준</dt>
            <dd>오늘({formatYmd(preview.baseDate)}) 회원</dd>
            <dt className="text-n500">명부 인원</dt>
            <dd>
              <span className="font-semibold">{preview.rowCount}명</span>
              {preview.officerCount > 0 && (
                <span className="text-n500"> (회장·부회장 {preview.officerCount}명 포함)</span>
              )}
            </dd>
            <dt className="text-n500">빠지는 회원</dt>
            <dd>
              <span title="임시회원은 어떤 상태를 골라도 포함되지 않습니다. 등급을 바꾸면 포함됩니다.">
                임시회원 {preview.excludedTemporaryCount}명
              </span>
              , 고르지 않은 상태 {preview.excludedByStatusCount}명
            </dd>
            <dt className="text-n500">전체 회원</dt>
            <dd>{preview.totalMemberCount}명</dd>
          </dl>

          {preview.presidentMissing && (
            <div className="mt-3 text-[13.5px] text-danger">
              회장이 없어 내려받을 수 없습니다 — 역할 관리에서 회장을 배정해주세요{" "}
              <Link href={ROUTES.roles} className="text-accent underline">
                역할 관리로
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** 직책 표기법 — 선택지마다 이름 아래 설명을 붙여 무엇이 다른지 화면에서 바로 읽히게 한다 */
function NotationSection({ roster, disabled }: Readonly<{ roster: MemberRosterExport; disabled: boolean }>) {
  return (
    <fieldset className="min-w-0">
      <legend className={LEGEND}>직책 표기법</legend>
      <div className="flex flex-col gap-[10px]">
        {NOTATION_OPTIONS.map((option) => {
          const checked = roster.notation === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-start gap-[10px] rounded-[12px] border px-[14px] py-3 transition-colors",
                checked ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
                disabled ? "cursor-default" : "cursor-pointer",
              )}
            >
              <input
                type="radio"
                name="roster-position-notation"
                value={option.value}
                className="mt-[3px] size-[17px] flex-none accent-accent disabled:cursor-not-allowed"
                checked={checked}
                onChange={() => roster.setNotation(option.value)}
                disabled={disabled}
              />
              {/*
                이름은 `<label>` 아래 두 단계 안에 둔다 (Sonar S6853). 검사기가 라벨 글자를 두 단계까지만
                찾아, span을 한 겹 더 씌우면 «글자 없는 라벨»이 된다(#786 머지 뒤 게이트가 이것으로 실패했다).
              */}
              <span className="min-w-0 text-[15px] font-medium">
                {option.label}
                <span className="mt-[2px] block text-[13.5px] font-normal leading-[1.6] text-n500">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
