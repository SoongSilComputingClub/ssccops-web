"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  historyTypeOf,
  MEMBER_HISTORY_TYPES,
  type MemberHistoryChangeType,
  type MemberHistoryEntry,
  type MemberHistoryType,
} from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMemberHistories } from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import { formatInstant } from "@/shared/lib/date";
import type { BadgeTone } from "@/shared/ui";
import { Badge, Card, Chip, EmptyState, PageBody, PageHeader } from "@/shared/ui";

/*
 * 회원 변경 이력 (#51 · 서버 #82 · GET /v1/members/{memberId}/histories).
 *
 * 회원 상세의 '최근 변경이력' 카드는 3건에서 끊기고 역할·회원 정보는 아예 들어 있지 않다.
 * 이 화면이 그 뒤를 펼쳐 "이 회원의 무엇이 언제, 누구에 의해, 왜 바뀌었는가"에 답한다.
 *
 * ── 이름을 '전체 변경 이력'이라고 붙이지 않는다 ─────────────────
 * 담기는 것은 네 출처다 — 등급(`mbr_grd_hstry`) · 상태(`mbr_stts_hstry`) · 역할 부여·종료
 * (`mbr_role_rel`) · 회원 정보(`mbr_chg_hstry` · #237에서 늘었다). '전체'라고 부르면 화면이
 * 없는 것을 있다고 말하게 되고, 그러면 여기가 비어 있다는 사실이 "고친 적이 없다"로 읽힌다.
 * **회원 정보 이력은 서버 #226 배포 시점부터 쌓인다** — 그전에 고친 값은 어디에도 남아 있지
 * 않으므로, 화면이 그 사실도 함께 밝힌다({@link SCOPE_NOTE} · 본문 첫 줄).
 *
 * ── 네 출처를 한 타임라인으로 본다 ──────────────────────────────
 * 합치고 정렬하는 일은 **서버가 끝냈다**(발생 시각 역순 · 같은 시각은 종류로 끊는다). 받은
 * 배열을 그대로 그린다 — 화면이 다시 정렬하면 그 규칙이 두 곳에서 정해지고, 상세 카드의
 * 최근 3건과 이 화면이 조용히 갈린다.
 *
 * ── 거르는 일도 서버가 한다 ────────────────────────────────────
 * 유형 칩이 `type` 질의 파라미터로 나간다. 전량을 받아 화면에서 걸러도 되는 크기지만, 필터를
 * 두 곳에서 정하면 서버가 출처를 하나 더 늘렸을 때 화면이 모르는 종류를 조용히 삼킨다.
 *
 * ── 접근 제어 ──────────────────────────────────────────────────
 * `MEMBER_MANAGE`가 없으면 화면을 열지 않는다. 조회부터 서버가 막으므로 열어 봐야 오류
 * 화면뿐이고, 판정은 #29의 `useCan` 하나만 쓴다(views/role-authorities의 선례).
 */

const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 변경 이력을 볼 수 없습니다 — 운영진에게 요청해주세요";

/** 이 화면에 담기는 것이 무엇인지 — 한 줄로 밝힌다 (위 주석) */
const SCOPE_NOTE = "등급 · 상태 · 역할 · 회원 정보 변경이 기록됩니다";

/**
 * 역할 줄의 변경자·사유가 비어 있는 이유.
 *
 * `mbr_role_rel`에는 변경자(`chnrg_mbr_id`)·사유 컬럼이 **없다.** 서버가 답할 근거를 데이터로
 * 갖고 있지 않아 언제나 null을 내리며, 요청자나 회원 자신을 대신 채우면 이력이 사실이 아닌
 * 것을 말하게 된다 — 그 순간 이 목록은 근거로 쓸 수 없다. 그래서 화면은 '-'로 두되, **왜
 * 비었는지를 반드시 밝힌다.** 아무 말 없이 '-'만 있으면 "적지 않고 부여했다"로 읽히는데
 * 그것은 사실이 아니다(적을 자리 자체가 없다).
 */
const ROLE_BLANK_NOTE =
  "역할 부여·종료에는 변경자와 변경 사유가 남지 않습니다 — 기록할 자리가 없어 서버가 알려줄 수 없는 값이라 '-'로 둡니다. 적지 않은 것이 아닙니다.";

/**
 * 회원 정보 줄에 적용일·사유 자리가 없는 이유 (#237).
 *
 * 등급·상태는 "언제부터 적용할 것인가"와 "왜 바꾸는가"를 받아 두는 사건이지만, 이름·학번·
 * 연락처는 **고친 순간이 곧 적용**이고 사유를 물을 자리도 없다(서버 `mbr_chg_hstry`에 그
 * 컬럼 자체가 없다). 그래서 화면은 역할 줄처럼 '-'를 두는 것이 아니라 **그 자리를 아예
 * 그리지 않는다** — 빈칸을 그리면 "적을 수 있었는데 비워 뒀다"로 읽힌다.
 */
const PROFILE_BLANK_NOTE =
  "회원 정보 변경에는 적용일과 변경 사유가 없습니다 — 고친 순간이 곧 적용이라 그 자리를 비워 둡니다.";

/** 필터 칩 이름 — 서버 `type` 어휘와 1:1이다 */
const TYPE_LABEL: Record<MemberHistoryType, string> = {
  GRADE: "등급",
  STATUS: "상태",
  ROLE: "역할",
  /* 아홉 항목을 한 칩으로 묶는다 — 어느 항목이 바뀌었는지는 줄마다 이름으로 적힌다 */
  PROFILE: "회원 정보",
};

/**
 * 줄의 종류 배지.
 *
 * 필터는 셋인데 배지는 넷이다 — 역할 한 배정이 부여와 종료라는 두 사건을 낳기 때문이며,
 * 그 둘을 한 이름으로 그리면 타임라인에서 임기의 시작과 끝을 구별할 수 없다.
 */
const CHANGE_LABEL: Record<MemberHistoryChangeType, string> = {
  GRADE: "등급",
  STATUS: "상태",
  ROLE_ASSIGNED: "역할 부여",
  ROLE_ENDED: "역할 종료",
  /*
   * 배지에는 '회원 정보'라고만 적는다. 항목 이름(학번·연락처 …)은 배지 옆에 따로 서므로
   * 여기에 붙이면 좁은 화면에서 배지가 길어져 줄이 접힌다.
   */
  PROFILE: "회원 정보",
};

const CHANGE_TONE: Record<MemberHistoryChangeType, BadgeTone> = {
  GRADE: "blue",
  STATUS: "amber",
  ROLE_ASSIGNED: "outline-accent",
  ROLE_ENDED: "outline",
  PROFILE: "grey",
};

/**
 * `이전 → 이후`에서 **비어 있는 쪽**에 놓는 말.
 *
 * 값을 지어내는 것이 아니라 "그 자리에 값이 없었다"는 사실을 적는 것이다. 등급·상태의 이전
 * 값은 가입 시점의 최초 부여에서 비고(그때는 등급도 상태도 없었다), 역할은 부여 줄의 이전과
 * 종료 줄의 이후가 빈다(맡기 전·끝난 뒤에는 그 역할이 아니다).
 *
 * 등급·상태에 '신규'를 쓰는 것은 회원 상세의 '최근 변경이력' 카드가 이미 그 말을 쓰기
 * 때문이다 — 같은 이력을 두 화면이 다른 말로 그리면 같은 줄인지 알아보기 어렵다.
 */
const NONE_LABEL: Record<MemberHistoryChangeType, string> = {
  GRADE: "신규",
  STATUS: "신규",
  ROLE_ASSIGNED: "없음",
  ROLE_ENDED: "없음",
  /* 그 항목이 그때 비어 있었다는 뜻이다 — 학과가 없다가 채워졌거나, 학번을 비웠거나 */
  PROFILE: "없음",
};

export function MemberHistoryPage({ mbrId }: { mbrId: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 변경 이력" subtitle={SCOPE_NOTE} showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberHistoryView mbrId={mbrId} />;
}

function MemberHistoryView({ mbrId }: { mbrId: number }) {
  const router = useRouter();

  /**
   * 고른 유형. **빈 배열이 곧 '전체'**다 — 서버가 `type` 생략을 전부로 읽으므로 첫 진입의
   * 통합 타임라인과 같은 요청이 된다(entities/member/api/member-histories.ts).
   */
  const [types, setTypes] = useState<MemberHistoryType[]>([]);
  const { entries, status, errorMessage, reload } = useMemberHistories(mbrId, types);

  const toggleType = (type: MemberHistoryType) =>
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  /*
   * 역할이 조회 대상인가 — 안내를 띄울지는 **받은 줄이 아니라 요청한 조건**으로 정한다.
   * 역할 이력이 하나도 없는 회원에게도 "역할 줄에는 변경자가 없다"는 사실은 미리 알려 두는
   * 편이 낫다. 받은 줄로 정하면 안내가 데이터에 따라 나타났다 사라져 규칙을 짐작하게 된다.
   */
  const roleIncluded = types.length === 0 || types.includes("ROLE");
  const profileIncluded = types.length === 0 || types.includes("PROFILE");
  const filtered = types.length > 0;

  return (
    <>
      <PageHeader
        title="회원 변경 이력"
        subtitle={`회원 #${mbrId} · ${SCOPE_NOTE}`}
        showBack
        action={{
          label: "회원 상세",
          onClick: () => router.push(ROUTES.memberDetail(mbrId)),
        }}
      />
      <PageBody maxWidth={860}>
        {/*
          담기는 범위를 본문 맨 위에 한 번 더 적는다. 헤더의 한 줄은 무엇이 담기는지만
          말하고, 여기서 **무엇이 담기지 않는지**까지 말한다 — 이력이 비어 있을 때 그것이
          "고친 적이 없다"로 읽히는 것을 막는 문장이라 목록보다 위에 있어야 한다.
        */}
        <div className="mb-4 rounded-[12px] border border-line bg-white/60 px-[14px] py-[11px] text-[13.5px] leading-[1.7] text-n400">
          이 화면에는 <b>등급 · 상태 · 역할 · 회원 정보 변경</b>이 기록됩니다. 회원 정보(학번 ·
          이름 · 연락처 · 학과 등) 수정은 <b>기록이 시작된 뒤부터</b> 쌓이므로, 그전에 고친
          값은 여기에 나타나지 않습니다.
          {roleIncluded && <div className="mt-[6px]">{ROLE_BLANK_NOTE}</div>}
          {profileIncluded && <div className="mt-[6px]">{PROFILE_BLANK_NOTE}</div>}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-[7px]">
          {/* '전체'는 고르는 값이 아니라 아무것도 고르지 않은 상태다 — 누르면 선택을 비운다 */}
          <Chip active={!filtered} onClick={() => setTypes([])}>
            전체
          </Chip>
          {MEMBER_HISTORY_TYPES.map((type) => (
            <Chip
              key={type}
              active={types.includes(type)}
              onClick={() => toggleType(type)}
            >
              {TYPE_LABEL[type]}
            </Chip>
          ))}
          {status === "ready" && (
            <span className="ml-1 text-[13px] text-n500">{entries.length}건</span>
          )}
        </div>

        {status === "loading" && <HistorySkeleton />}

        {status === "not-found" && (
          <EmptyState
            message="회원을 찾을 수 없습니다."
            action={{ label: "회원 목록", onClick: () => router.push(ROUTES.members) }}
          />
        )}

        {status === "error" && (
          <EmptyState
            message={errorMessage || "변경 이력을 불러오지 못했습니다."}
            action={{ label: "다시 시도", onClick: reload }}
          />
        )}

        {/*
          이력이 없는 것은 오류가 아니다 — #78 이전에 가입해 아직 등급·상태를 바꾼 적이 없는
          회원이 그렇다. 유형을 걸러 비었을 때는 "이 회원에게 이력이 없다"가 아니라 "고른
          유형이 없다"이므로 문장을 나누고, 전체로 되돌릴 길을 함께 준다.
        */}
        {status === "ready" && entries.length === 0 && (
          <EmptyState
            message={
              filtered
                ? "고른 유형의 변경 이력이 없습니다."
                : "기록된 변경 이력이 없습니다."
            }
            action={filtered ? { label: "전체 보기", onClick: () => setTypes([]) } : undefined}
          />
        )}

        {status === "ready" && entries.length > 0 && (
          <Card className="px-5 pt-[18px] pb-[6px]">
            {entries.map((entry, index) => (
              <HistoryRow
                /*
                 * 서버가 이력 행의 식별자를 내리지 않는다(세 출처의 번호 공간이 달라 한 열에
                 * 담을 수 없다). 같은 회원의 같은 시각·같은 종류가 둘일 수 있으므로 순번을
                 * 섞어 열쇠를 만든다 — 목록이 정렬된 채 통째로 오고 그 자리에서만 쓰이는 값이다.
                 */
                key={`${entry.changeType}-${entry.createdAt}-${index}`}
                entry={entry}
                last={index === entries.length - 1}
              />
            ))}
          </Card>
        )}
      </PageBody>
    </>
  );
}

function HistorySkeleton() {
  return (
    <Card className="animate-pulse px-5 pt-[18px] pb-[6px]">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mb-[18px] flex gap-3">
          <div className="mt-[5px] size-[9px] flex-none rounded-full bg-black/5" />
          <div className="min-w-0 flex-1">
            <div className="h-[16px] w-[200px] rounded bg-black/5" />
            <div className="mt-[8px] h-[14px] w-[280px] rounded bg-black/5" />
          </div>
        </div>
      ))}
    </Card>
  );
}

/**
 * 타임라인 한 줄.
 *
 * ── 발생 시각과 효력 적용일을 함께 보여 준다 ────────────────────
 * 둘은 다른 사실이다. `createdAt`은 '언제 기록됐는가'(정렬의 기준)이고 `appliedDate`는
 * '언제부터 적용되는가'다. 소급 입력된 변경에서 둘이 갈리는데, 하나만 보여 주면 "지난달
 * 자로 처리한 휴학을 오늘 입력했다"는 사실이 화면에서 사라진다.
 *
 * 발생 시각은 {@link formatInstant}로 그린다 — 서버가 `Instant`(UTC)로 내리므로 문자열을
 * 잘라 쓰면 아홉 시간 어긋난 시각이 뜬다.
 *
 * ── 없는 값은 '-'로 두고 지어내지 않는다 ────────────────────────
 * 변경자·사유가 빈 자리는 둘이다. 역할 줄은 **언제나** 비고({@link ROLE_BLANK_NOTE}),
 * 등급·상태 줄은 배치·이관으로 생긴 이력에 사람이 없을 때 빈다. 어느 쪽이든 '시스템'이나
 * '알 수 없음' 같은 말을 채우면 화면이 데이터에 없는 것을 말하게 된다.
 *
 * ── 회원 정보 줄은 '적용' 칸을 아예 그리지 않는다 ───────────────
 * 값이 없어서 '-'인 역할 줄과 다르다. 이름·학번은 **적용일이라는 개념 자체가 없어**
 * (고친 순간이 곧 적용이다) 그 칸을 '-'로 그리면 "적을 수 있었는데 비어 있다"로 읽힌다 —
 * 없는 값을 만들어 내지 않는다는 규칙이 여기서는 칸을 지우는 모양이 된다
 * ({@link PROFILE_BLANK_NOTE}). 대신 **무슨 항목이 바뀌었는지**를 그 자리에 세운다.
 */
function HistoryRow({ entry, last }: { entry: MemberHistoryEntry; last: boolean }) {
  const from = entry.previousName ?? NONE_LABEL[entry.changeType];
  const to = entry.newName ?? NONE_LABEL[entry.changeType];
  const isRole = historyTypeOf(entry.changeType) === "ROLE";
  const isProfile = entry.changeType === "PROFILE";

  return (
    <div className="flex gap-3">
      {/* 점과 선으로 시간축을 세운다 — 마지막 줄은 아래로 이어지지 않는다 */}
      <div className="flex flex-none flex-col items-center">
        <div className="mt-[6px] size-[9px] rounded-full bg-accent" />
        {!last && <div className="mt-[3px] w-px flex-1 bg-line" />}
      </div>

      <div className={last ? "min-w-0 flex-1 pb-[18px]" : "min-w-0 flex-1 pb-5"}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CHANGE_TONE[entry.changeType]}>{CHANGE_LABEL[entry.changeType]}</Badge>
          {/*
            항목 이름은 **서버가 준 값을 그대로** 쓴다(`changeFieldName`). 코드 → 이름 사전을
            화면에 두면 서버가 말을 다듬는 날 여기만 옛 이름을 그린다.
          */}
          {entry.changeFieldName && (
            <span className="text-[14px] font-medium text-n300">{entry.changeFieldName}</span>
          )}
          <span className="text-[15.5px]">
            {/* 표시 명칭은 서버가 준 값 그대로다 — 기준정보에서 이름을 바꾸면 이력도 따라온다 */}
            <span className="text-n400">{from}</span>
            <span className="mx-[6px] text-n500">→</span>
            <span className="font-medium">{to}</span>
          </span>
        </div>

        <div className="mt-[5px] flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-n500">
          <span>발생 {formatInstant(entry.createdAt) || "-"}</span>
          {/* 회원 정보 줄에는 적용일이 없다 — 칸을 '-'로 채우지 않고 지운다 (위 주석) */}
          {!isProfile && <span>적용 {entry.appliedDate ?? "-"}</span>}
          <span>
            변경자 {entry.changedByName ?? "-"}
            {isRole && <span className="ml-1 text-n500">(기록 없음)</span>}
          </span>
        </div>

        {/*
          사유는 있을 때만 그린다. 빈 줄을 '사유 없음'으로 채우면 사유가 없다는 사실이 사유처럼
          이력에 남는다 — 등급·상태 변경 시트가 같은 이유로 빈 사유를 null 로 보낸다.
        */}
        {entry.changeReason && (
          <div className="mt-[5px] rounded-[10px] bg-bg px-[10px] py-[7px] text-[13px] leading-[1.6] text-n300">
            {entry.changeReason}
          </div>
        )}
      </div>
    </div>
  );
}
