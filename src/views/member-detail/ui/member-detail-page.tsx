"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generationText,
  mbrGrdTone,
  mbrSttsTone,
  MEMBER_CHANGE_WARNING,
  type MemberChange,
  type MemberChangeWarning,
  type MemberRoleAssignment,
  type MemberRoleRef,
} from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import {
  GradeStatusSheet,
  RoleSheet,
  useMemberDetail,
  useMemberRoles,
  type MemberRoles,
} from "@/features/member";
import { ROUTES } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { todayInSeoul } from "@/shared/lib/date";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  flash,
  PageBody,
  PageHeader,
  Pill,
  SectionLabel,
  Sheet,
  TextField,
} from "@/shared/ui";

/*
 * 회원 상세 (#46 · 서버 #76 · GET /v1/members/{memberId}).
 *
 * 프로필·현재 역할·최근 변경 이력 3건이 **한 응답**으로 온다. 예전에는 목 스토어의 회원·역할
 * 관계·등급 이력·상태 이력 네 배열을 화면에서 이어 붙였는데, 이력을 합쳐 자르는 규칙(기록
 * 시각 역순 3건)이 화면 계산에 달려 있어 서버와 갈릴 자리였다. 변경자 이름도 응답에 실려
 * 오므로 회원 목록에서 이름을 되찾던 `mbrNmOf`가 사라졌다.
 *
 * 목록보다 더 좁혀진 개인정보(연락처·이메일·변경 이력)를 한 사람 단위로 보여 주므로 목록과
 * 같은 권한으로 잠근다(#52). 목록에서 감춰도 주소를 직접 치면 여기로 바로 올 수 있어 화면마다
 * 판정을 둔다 — 근거는 views/member-list 의 NO_MEMBER_MANAGE 주석.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 정보를 볼 수 없습니다 — 운영진에게 요청해주세요";

/**
 * 역할 카드의 조작이 잠긴 이유 (#50).
 *
 * ── 회원 상세와 역할 조작의 요구 권한이 다르다 ──────────────────
 * 이 화면 자체는 `MEMBER_MANAGE`로 열리지만 역할 부여·종료는 **`ROLE_MANAGE`**를 요구한다
 * (서버가 `MemberRoleAssignmentController` 클래스 전체에 걸었다 · VR-M12). 표준코드가
 * `MEMBER_MANAGE`를 "회원 정보·등급·상태"로, `ROLE_MANAGE`를 인가 조작으로 갈라 놓았기
 * 때문이다 — 회원 정보를 고칠 수 있다고 스스로에게 임원 역할을 붙일 수 있으면
 * `MEMBER_MANAGE`가 사실상 최고 권한이 된다.
 *
 * 그래서 **여기까지 온 사람이 역할 카드에서는 막히는 조합이 정상적으로 존재한다.** 화면은 그
 * 어긋남을 감추지 않고 버튼을 잠근 채 이유를 말한다(features/auth/model/use-can.ts의 "이동은
 * 감추고 동작은 잠근다").
 *
 * 다만 **조회까지 함께 막히지는 않는다** — 현재 역할은 회원 상세 응답(`MEMBER_MANAGE`)에 이미
 * 실려 오므로 그것으로 그린다. 지난 재임 이력만 `ROLE_MANAGE` 뒤에 있다.
 */
const NO_ROLE_MANAGE =
  "역할을 다루려면 권한 관리(ROLE_MANAGE) 권한이 필요합니다 — 회원 관리 권한과는 별개입니다";

export function MemberDetailPage({ mbrId }: { mbrId: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberDetailView mbrId={mbrId} />;
}

function MemberDetailView({ mbrId }: { mbrId: number }) {
  const router = useRouter();
  const { member, status, errorMessage, reload, apply } = useMemberDetail(mbrId);

  /*
   * 역할 조작은 회원 상세와 요구 권한이 다르다(NO_ROLE_MANAGE 주석). 배정 목록 조회부터
   * ROLE_MANAGE 로 막혀 있어 권한이 없으면 **호출조차 하지 않는다** — 어차피 403이다.
   */
  const canManageRole = useCan(CAPABILITY.ROLE_MANAGE);
  const roles = useMemberRoles(mbrId, { enabled: canManageRole });

  /** 어느 시트가 열려 있는가 — null이면 닫혀 있다 */
  const [sheet, setSheet] = useState<"grd" | "stts" | null>(null);
  /**
   * 방금 저장한 상태 변경에 딸려 온 경고.
   *
   * 화면 상태로 들고 있는 것은 이것이 **회원의 속성이 아니라 방금 일어난 일**이기 때문이다 —
   * 다시 조회해도 오지 않고, 사용자가 처리했다고 표시하기 전까지 남아 있어야 한다.
   */
  const [warnings, setWarnings] = useState<MemberChangeWarning[]>([]);

  if (status !== "ready" || !member) {
    return (
      <>
        <PageHeader title="회원 상세" showBack />
        <PageBody>
          {status === "loading" && (
            <Card className="animate-pulse">
              <div className="h-[30px] w-[180px] rounded bg-black/5" />
              <div className="mt-3 h-[18px] w-[240px] rounded bg-black/5" />
              <div className="mt-5 h-[120px] w-full rounded bg-black/5" />
            </Card>
          )}
          {status === "not-found" && (
            <EmptyState
              message="회원을 찾을 수 없습니다."
              action={{ label: "회원 목록", onClick: () => router.push(ROUTES.members) }}
            />
          )}
          {status === "error" && (
            <EmptyState
              message={errorMessage || "회원 정보를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  return (
    <>
      {/*
        수정 화면으로 가는 유일한 길이다 — 이 버튼이 없으면 /members/{mbrId}/edit 는 주소를
        직접 쳐야만 닿는다. 두 화면 모두 MEMBER_MANAGE 로 잠겨 있고(여기까지 온 사람은 이미
        가졌다) 저장 시점의 판정은 서버가 다시 한다.
      */}
      <PageHeader
        title="회원 상세"
        subtitle={`회원 #${member.memberId}`}
        showBack
        action={{
          label: "정보 수정",
          onClick: () => router.push(ROUTES.memberEdit(member.memberId)),
        }}
      />
      <PageBody>
        {/*
          경고는 본문 맨 위다 — 방금 한 변경의 결과이고, 스크롤을 내려야 보이는 자리에 두면
          못 보고 화면을 떠난다. 닫기 전까지 남는다.
        */}
        {warnings.length > 0 && (
          <ChangeWarningPanel warnings={warnings} onDismiss={() => setWarnings([])} />
        )}
        {/* 좌우 두 단은 lg 미만에서 한 단으로 쌓는다 — 프로필 · 역할 · 이력 순서 그대로다 */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-[10px]">
                <div className="text-[26px] font-medium">{member.name}</div>
                {/* 색은 코드로 고르고 글자는 서버가 준 명칭을 쓴다 (api/members.ts 주석) */}
                <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                  {member.membershipGradeName}
                </Badge>
                <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                  {member.membershipStatusName}
                </Badge>
                {/* 아직 로그인한 적 없는 이관 회원 — 시스템으로 연락이 닿지 않는다 */}
                {!member.linkedAccount && <Pill tone="outline">이관</Pill>}
              </div>
              <div className="mt-1 text-[13.5px] text-n500">
                회원 #{member.memberId} · 가입 {member.joinDate}
              </div>
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
              {/*
                라벨-값을 두 쌍씩 놓던 4열은 좁은 화면에서 한 쌍씩 놓는다. 84px 라벨을
                그대로 둔 채 값을 1fr로 남기면 375px에서 값에 남는 폭이 60px 남짓이라
                연락처 · 이메일이 통째로 줄바꿈된다.
              */}
              <div className="grid grid-cols-[84px_1fr] gap-y-[9px] text-[15px] lg:grid-cols-[84px_1fr_84px_1fr]">
                <div className="text-[14px] text-n500">학생번호</div>
                <div>{member.studentNumber || "학번 미확인"}</div>
                <div className="text-[14px] text-n500">기수</div>
                <div>{generationText(member.generationNumber)}</div>
                <div className="text-[14px] text-n500">학과</div>
                <div>{member.departmentName || "학과 미입력"}</div>
                <div className="text-[14px] text-n500">학년</div>
                <div>
                  {member.academicYear ? `${member.academicYear}학년` : "학년 미입력"}
                </div>
                <div className="text-[14px] text-n500">연락처</div>
                <div>{member.phoneNumber || "미입력"}</div>
                <div className="text-[14px] text-n500">이메일</div>
                <div>{member.email || "미입력"}</div>
              </div>
            </Card>

            {/*
              등급·상태는 여기서만 바꾼다. 정보 수정 화면(#47)에 이 두 값의 자리가 없는 것은
              변경 이력을 남겨야 하는 조작이라 서버가 전용 엔드포인트로 열었기 때문이고,
              화면도 같은 경계를 그린다 — 수정 폼에 넣으면 이력 없는 변경 경로가 생긴다.
            */}
            <Card>
              <SectionLabel className="mb-3">등급 · 상태</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border border-line p-[14px]">
                  <div className="text-[13px] text-n500">회원등급</div>
                  <div className="mt-1 text-[19px] font-medium">
                    {member.membershipGradeName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSheet("grd")}
                  >
                    등급 변경
                  </Button>
                </div>
                <div className="rounded-[12px] border border-line p-[14px]">
                  <div className="text-[13px] text-n500">회원상태</div>
                  <div className="mt-1 text-[19px] font-medium">
                    {member.membershipStatusName}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSheet("stts")}
                  >
                    상태 변경
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <MemberRoleCard
              memberId={member.memberId}
              memberName={member.name}
              fallbackRoles={member.roles}
              canManage={canManageRole}
              roles={roles}
            />

            {/*
              최근 변경이력 카드 (#51에서 '전체 보기'가 붙었다).

              ── 카드는 단건 응답의 3건을 그대로 쓴다 ────────────────────
              이력 화면(views/member-history)이 여는 통합 조회 API를 여기서 부르지 않는다.
              같은 데이터를 두 번 받는 것이고, 두 벌이 되면 상세 카드와 이력 화면이 같은
              이력을 다르게 보여 줄 자리가 생긴다 — 서버도 같은 이유로 두 응답이 한 벌의
              변환·정렬(MemberChangeHistoryAssembler)을 공유한다.

              ── 이 카드에는 역할이 들어 있지 않다 ───────────────────────
              서버가 상세의 최근 3건에 역할을 싣지 않는다(recentChangesOf가 역할을 빈 목록으로
              넘긴다) — 지난 임기의 부여·종료가 세 칸을 채우면 등급·상태의 최근 변화가
              밀려나기 때문이다. 역할까지 포함한 시간축은 '전체 보기'가 여는 화면에 있고,
              링크 아래 문장이 그 차이를 말한다. 그 말이 없으면 이 카드가 이력의 전부로 보인다.
            */}
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <SectionLabel>최근 변경이력</SectionLabel>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.memberHistories(member.memberId))}
                  className="cursor-pointer text-[13.5px] text-accent"
                >
                  전체 보기 ›
                </button>
              </div>
              {member.recentChanges.length === 0 ? (
                <div className="text-[14.5px] text-n500">변경 이력이 없습니다</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {member.recentChanges.map((change, index) => (
                    <ChangeRow key={`${change.changeType}-${change.createdAt}-${index}`} change={change} />
                  ))}
                </div>
              )}
              <div className="mt-3 text-[12.5px] leading-[1.6] text-n500">
                등급 · 상태의 최근 3건입니다. 역할 부여 · 종료까지 합친 시간축은 전체 보기에
                있습니다.
              </div>
            </Card>
          </div>
        </div>
      </PageBody>

      {/*
        변경 응답으로 화면을 갈아 끼운다 — 다시 조회하지 않는다. 응답의 member가 조회와 같은
        상세 DTO라 뱃지·등급/상태 카드·최근 변경이력(맨 앞이 방금 남긴 이력이다)이 한 번에
        맞는다. reload()를 부르면 왕복 한 번 동안 옛 값이 남고, 그 사이 다른 사람이 바꾼 값이
        섞여 방금 내가 한 변경이 반영된 것인지 구분되지 않는다.
      */}
      <GradeStatusSheet
        member={member}
        kind={sheet}
        onClose={() => setSheet(null)}
        onChanged={(result) => {
          apply(result.member);
          /* 성공 사실만 토스트로 알린다 — 처리가 남았다는 사실은 아래 패널이 붙들고 있는다 */
          flash(sheet === "grd" ? "등급을 변경했습니다" : "상태를 변경했습니다");
          setWarnings(result.warnings);
        }}
      />
    </>
  );
}

/**
 * 역할 카드 (#50 · 서버 #81).
 *
 * ── 현재와 종료를 나눠 보여 준다 ────────────────────────────────
 * **종료는 삭제가 아니다.** 서버에 `DELETE`가 없고 임기를 끝내는 길은 `roleEndYmd`를 채우는
 * 것뿐이라, 지난 재임이 목록에 그대로 남는다 — 지우면 "언제까지 국장이었는가"가 사라진다.
 * 두 묶음을 가르는 것은 `roleEndYmd`의 유무가 아니라 **서버가 준 `current`**다(BR-M25):
 * 종료일이 미래로 채워진 배정(임기가 정해진 국장)은 아직 유효하고, 화면이 종료일만 보고
 * 판단하면 그 사람이 지금 가진 권한과 배지가 갈린다.
 *
 * ── 조회는 열려 있고 조작만 잠긴다 ──────────────────────────────
 * 요구 권한이 어긋나는 자리다(NO_ROLE_MANAGE 주석). `ROLE_MANAGE`가 없으면 배정 목록 API가
 * 403이므로 **회원 상세 응답에 실려 온 현재 역할**(`fallbackRoles`)로 그린다 — 그것은
 * `MEMBER_MANAGE`로 이미 받은 값이라 보여 주지 않을 이유가 없다. 그때 볼 수 없는 것은 지난
 * 재임 이력뿐이고, 화면은 그 사실을 문장으로 남긴다(빈 목록으로 보이면 이력이 없는 것인지
 * 못 보는 것인지 알 수 없다).
 */
function MemberRoleCard({
  memberId,
  memberName,
  fallbackRoles,
  canManage,
  roles,
}: {
  memberId: number;
  memberName: string;
  /** 회원 상세 응답의 현재 역할 — ROLE_MANAGE 가 없을 때 그리는 값이다 */
  fallbackRoles: MemberRoleRef[];
  canManage: boolean;
  roles: MemberRoles;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  /** 종료 확인을 기다리는 배정 — null이면 확인 창이 닫혀 있다 */
  const [ending, setEnding] = useState<MemberRoleAssignment | null>(null);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionLabel>역할</SectionLabel>
        {/*
          잠그되 감추지 않는다 — 이 화면을 멀쩡히 보는 사람에게서 버튼만 사라지면 기능이
          없어진 것인지 고장인지 알 수 없다. 잠긴 이유는 title 로 붙인다.
        */}
        <Button
          variant="ghost"
          size="sm"
          disabled={!canManage || roles.status !== "ready"}
          title={canManage ? undefined : NO_ROLE_MANAGE}
          onClick={() => setAssignOpen(true)}
        >
          역할 부여
        </Button>
      </div>

      {!canManage ? (
        <>
          {fallbackRoles.length === 0 ? (
            <EmptyState message="부여된 역할이 없습니다." padding="sm" />
          ) : (
            <div className="flex flex-col gap-[9px]">
              {fallbackRoles.map((role) => (
                <div
                  key={role.roleId}
                  className="flex items-center gap-2 rounded-[12px] border border-line p-3"
                >
                  <div className="text-[16px] font-medium">{role.roleName}</div>
                  {role.representative && <Pill tone="blue">대표</Pill>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-[12.5px] text-n500">{NO_ROLE_MANAGE}</div>
        </>
      ) : roles.status === "loading" ? (
        <div className="flex flex-col gap-[9px]">
          <div className="h-[46px] animate-pulse rounded-[12px] bg-black/5" />
          <div className="h-[46px] animate-pulse rounded-[12px] bg-black/5" />
        </div>
      ) : roles.status === "error" ? (
        <EmptyState
          message={roles.errorMessage || "역할을 불러오지 못했습니다."}
          padding="sm"
          action={{ label: "다시 시도", onClick: roles.reload }}
        />
      ) : (
        <>
          <div className="mb-[7px] text-[13px] text-n400">현재 역할</div>
          {roles.current.length === 0 ? (
            <EmptyState message="부여된 역할이 없습니다." padding="sm" />
          ) : (
            <div className="flex flex-col gap-[9px]">
              {roles.current.map((assignment) => (
                <AssignmentRow
                  key={assignment.mbrRoleId}
                  assignment={assignment}
                  busy={roles.saving}
                  onEnd={() => setEnding(assignment)}
                  onRepresent={async () => {
                    if (await roles.setRepresentative(assignment.mbrRoleId)) {
                      flash(`${assignment.roleNm}을(를) 대표 역할로 지정했습니다`);
                    }
                  }}
                />
              ))}
            </div>
          )}

          {roles.ended.length > 0 && (
            <>
              <div className="mt-5 mb-[7px] text-[13px] text-n400">
                종료된 역할 · {roles.ended.length}건
              </div>
              <div className="flex flex-col gap-[9px]">
                {roles.ended.map((assignment) => (
                  <AssignmentRow key={assignment.mbrRoleId} assignment={assignment} ended />
                ))}
              </div>
              <div className="mt-[7px] text-[12.5px] text-n500">
                종료는 삭제가 아니라 종료일을 채우는 것이라 지난 재임이 그대로 남습니다
              </div>
            </>
          )}

          {/*
            대표 지정 실패는 확인 창 없이 일어나므로 사유를 붙일 자리가 카드밖에 없다. 종료
            실패는 확인 창 안에서 보여 주고(그쪽이 닫히기 전에 읽어야 한다) 여기는 비운다.
          */}
          {roles.saveErrorMessage && ending === null && !assignOpen && (
            <div className="mt-3 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] text-danger">
              {roles.saveErrorMessage}
            </div>
          )}
        </>
      )}

      <RoleSheet
        memberId={memberId}
        memberName={memberName}
        open={assignOpen}
        roles={roles}
        onClose={() => setAssignOpen(false)}
        onAssigned={(assignment) => flash(`${assignment.roleNm} 역할을 부여했습니다`)}
      />
      <EndRoleSheet
        assignment={ending}
        roles={roles}
        onClose={() => {
          setEnding(null);
          roles.clearSaveError();
        }}
      />
    </Card>
  );
}

/**
 * 배정 한 줄.
 *
 * 시작·종료일을 함께 보여 준다. 회원 상세 응답의 현재 역할에는 이 두 날짜가 없어 예전 카드는
 * 이름만 그렸는데, 종료된 배정까지 한 카드에 놓이면 **어느 임기인지가 날짜로만 구별된다** —
 * 같은 역할을 두 번 맡은 사람의 줄 두 개는 그 밖에 다른 점이 없다.
 *
 * 종료된 줄에는 대표 배지를 달지 않는다. `rprsRoleYn`은 끝난 임기에도 값이 남아 있는데(서버가
 * 지난 이력을 건드리지 않는다), 그것을 배지로 그리면 대표가 둘로 보인다 — 대표는 **유효한 것
 * 중 최대 1건**이라는 규칙과 화면이 어긋난다.
 */
function AssignmentRow({
  assignment,
  ended,
  busy,
  onEnd,
  onRepresent,
}: {
  assignment: MemberRoleAssignment;
  ended?: boolean;
  busy?: boolean;
  onEnd?: () => void;
  onRepresent?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[12px] border border-line p-3",
        ended && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[16px] font-medium">{assignment.roleNm}</div>
          {/* 대표는 표시용이며 권한과 무관하다 (BR-M26 · 부여 시트가 그 문장을 갖는다) */}
          {!ended && assignment.rprsRoleYn && <Pill tone="blue">대표</Pill>}
          {ended && <Pill tone="outline">종료</Pill>}
        </div>
        <div className="mt-[2px] text-[12.5px] text-n500">
          {assignment.roleBgngYmd} ~ {assignment.roleEndYmd ?? "무기한"}
        </div>
      </div>
      {onRepresent && !assignment.rprsRoleYn && (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          title="사이드바 프로필에 내걸 역할로 지정합니다 (권한과 무관)"
          onClick={onRepresent}
        >
          대표 지정
        </Button>
      )}
      {onEnd && (
        <Button variant="ghost-danger" size="sm" disabled={busy} onClick={onEnd}>
          종료
        </Button>
      )}
    </div>
  );
}

/**
 * 역할 종료 확인 (#50 · PATCH .../roles/{mbrRoleId}).
 *
 * ── 왜 확인 절차를 두는가 ───────────────────────────────────────
 * **되돌리는 길이 이 API에 없다.** 서버의 PATCH는 부분 수정이라 종료일을 다시 비울 수 없고
 * (JSON이 '필드 없음'과 'null'을 구별하지 못한다), 되살리려면 **다시 부여**해야 하는데 그러면
 * 기간이 끊긴 두 건으로 남는다 — 한 줄이 두 줄이 되는 것을 눌러 놓고 알게 하면 안 된다.
 * 게다가 이 조작은 그 사람이 지금 할 수 있는 일을 바로 줄인다(BR-M31 · 재로그인이 필요 없다).
 *
 * 종료일을 고를 수 있게 둔 것은 임기가 지난 뒤에 정리하는 경우가 정상이기 때문이다. 시작일보다
 * 이른 날짜는 서버가 400으로 거절하므로 그 판정을 앞당겨 버튼을 잠근다 — **근거는 서버다.**
 */
function EndRoleSheet({
  assignment,
  roles,
  onClose,
}: {
  /** null이면 닫혀 있다 */
  assignment: MemberRoleAssignment | null;
  roles: MemberRoles;
  onClose: () => void;
}) {
  const [endDate, setEndDate] = useState("");

  if (!assignment) return null;

  /*
   * 서버는 종료일을 생략하면 아무것도 하지 않으므로(부분 수정) 화면이 반드시 값을 보낸다.
   * 기본값은 서울 기준 오늘이다 — 등급·상태 변경과 달리 "비워 두면 서버가 채운다"가 없다.
   */
  const value = endDate || todayInSeoul();
  const beforeStart = value < assignment.roleBgngYmd;

  const close = () => {
    setEndDate("");
    onClose();
  };

  const submit = async () => {
    const result = await roles.endAssignment(assignment.mbrRoleId, value);
    /* 실패하면 닫지 않는다 — 자기 잠금(409) 안내가 여기서 사라지면 다시 볼 길이 없다 */
    if (!result) return;
    flash(`${assignment.roleNm} 역할을 종료했습니다`);
    close();
  };

  return (
    <Sheet
      open
      title="역할 종료"
      hint={`${assignment.roleNm} · ${assignment.roleBgngYmd}부터`}
      onClose={close}
      onOk={submit}
      okLabel={roles.saving ? "종료 중…" : "종료"}
      okDisabled={roles.saving || beforeStart}
      okTitle={beforeStart ? "종료일은 시작일보다 이를 수 없습니다" : undefined}
    >
      <Field
        label="종료일"
        required
        error={beforeStart ? "종료일은 시작일보다 이를 수 없습니다" : null}
        className="mb-4"
      >
        <TextField
          type="date"
          value={value}
          min={assignment.roleBgngYmd}
          invalid={beforeStart}
          onChange={(e) => {
            setEndDate(e.target.value);
            roles.clearSaveError();
          }}
        />
      </Field>

      <div className="rounded-[12px] border border-amber bg-amber-soft px-3 py-[10px] text-[13px] text-amber">
        종료해도 <b>기록은 지워지지 않고</b> 지난 재임으로 남습니다. 다만 <b>되돌릴 수는
        없어</b>, 다시 맡기려면 새로 부여해야 하고 그러면 기간이 끊긴 두 건이 됩니다.
      </div>

      {/*
        자기 잠금(409 CANNOT_REVOKE_OWN_ROLE_MANAGE)이 여기로 온다 — 마지막 ROLE_MANAGE
        보유자가 스스로를 잠그는 것을 서버가 막은 것이라, 실패가 아니라 방어라는 것이 문장에
        있어야 한다(features/member/model/member-error.ts).
      */}
      {roles.saveErrorMessage && (
        <div className="mt-4 rounded-[12px] border border-danger/40 bg-danger/5 px-3 py-[9px] text-[13.5px] text-danger">
          {roles.saveErrorMessage}
        </div>
      )}
    </Sheet>
  );
}

/**
 * 탈퇴·제명으로 옮긴 뒤 남은 것들 (#48 · 서버 응답의 `warnings`).
 *
 * ── 왜 토스트가 아닌가 ──────────────────────────────────────────
 * 서버는 상태만 바꾸고 **역할·담당 하위 업무를 정리하지 않는다** — 어떻게 넘길지가 운영 규칙이
 * 필요한 판단이라 부수 효과를 넣지 않기로 했기 때문이다(서버 `MemberChangeWarningResponse`).
 * 그래서 이 사실을 사람에게 넘기는 마지막 지점이 이 패널이고, 몇 초 뒤 사라지는 토스트로
 * 알리면 조직을 떠난 회원이 국장 역할과 미완료 업무를 그대로 쥔 채 아무도 모르게 남는다.
 * 닫기는 사용자가 직접 누른다 — "봤다"는 표시이지 처리했다는 뜻은 아니므로 문구로 구분한다.
 *
 * 건수는 서버가 문구와 따로 실어 주므로 값으로 쓴다. 코드를 모르는 경고가 새로 생겨도 서버
 * 문장을 그대로 보여 준다 — 화면이 모르는 경고를 삼키면 그 사실만 조용히 사라진다.
 */
function ChangeWarningPanel({
  warnings,
  onDismiss,
}: {
  warnings: MemberChangeWarning[];
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber bg-amber-soft p-[18px]"
    >
      <div className="flex items-start gap-[10px]">
        <div className="mt-[3px] flex size-[18px] flex-none items-center justify-center rounded-full bg-amber text-[12px] font-bold text-white">
          !
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-medium text-amber">
            상태는 바뀌었지만 정리되지 않은 항목이 남아 있습니다
          </div>
          <div className="mt-[10px] flex flex-col gap-[7px]">
            {warnings.map((warning) => (
              <div key={warning.code} className="flex items-baseline gap-2 text-[14.5px]">
                <Badge tone="grey">{warningLabel(warning.code)}</Badge>
                <span>{warning.message}</span>
                <span className="text-[13px] text-n400">({warning.count}건)</span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] text-[13px] text-n400">
            역할과 담당 업무는 <b>자동으로 정리되지 않습니다</b> — 역할 종료와 업무 인계는 직접
            처리해주세요.
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          확인했습니다
        </Button>
      </div>
    </div>
  );
}

/** 경고 코드 → 무엇이 남았는지를 가리키는 짧은 이름. 모르는 코드는 서버 문장만 보여 준다 */
function warningLabel(code: string): string {
  switch (code) {
    case MEMBER_CHANGE_WARNING.CURRENT_ROLES_REMAIN:
      return "역할";
    case MEMBER_CHANGE_WARNING.ASSIGNED_SUB_WORKS_REMAIN:
      return "하위 업무";
    default:
      return "확인 필요";
  }
}

/**
 * 변경 이력 한 줄.
 *
 * 등급·상태 이력이 한 배열에 섞여 오고 무엇이 바뀌었는지는 `changeType`이 가른다. 이전 값이
 * 없으면(가입 시점의 최초 부여) '신규'로 그린다 — 그때는 등급도 상태도 없었다는 사실 그대로다.
 *
 * 날짜는 `appliedDate`(언제부터 적용되는가)를 쓴다. 정렬 기준인 `createdAt`은 UTC 기준
 * 일시라 시:분을 그대로 잘라 보여 주면 아홉 시간 어긋난 시각이 화면에 뜬다.
 */
function ChangeRow({ change }: { change: MemberChange }) {
  const kind = change.changeType === "GRADE" ? "등급" : "상태";
  const by = change.changedByName ?? "-";

  return (
    <div className="flex items-start gap-[10px]">
      <div className="mt-[7px] size-[5px] flex-none rounded-full bg-accent" />
      <div className="min-w-0">
        <div className="text-[14.5px]">
          {kind} · {change.previousName ?? "신규"} → {change.newName}
        </div>
        <div className="mt-[2px] text-[12.5px] text-n500">
          {change.appliedDate} · {by}
        </div>
        {change.changeReason && (
          <div className="mt-[2px] text-[12.5px] text-n400">{change.changeReason}</div>
        )}
      </div>
    </div>
  );
}
