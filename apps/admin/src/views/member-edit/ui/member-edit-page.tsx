"use client";

import { useRouter } from "next/navigation";
import { generationText, mbrGrdTone, mbrSttsTone } from "@/entities/member";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMemberEdit } from "@/features/member";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  TextField,
  flash,
} from "@/shared/ui";

/*
 * 회원 정보 수정 (/members/{mbrId}/edit · #47 · 서버 #77 · PATCH /v1/members/{memberId}).
 *
 * ── 입력란은 서버가 고칠 수 있는 필드까지다 ─────────────────────
 * 예전 화면은 학번·가입일·등급·상태까지 편집란으로 열어 두고 목 스토어를 고쳤다. 서버는 그
 * 값들을 받지 않으므로(요청 본문에 필드 자체가 없다) 그대로 두면 사용자가 고친 값이 저장된
 * 것처럼 화면만 바뀐다 — **저장되지 않는 입력창을 열어 두지 않는다**는 판단은 views/my-account 가
 * 먼저 했다. 지금 이 화면이 보내는 것은 학번·기수·동아리 가입 연·월·이름·학과·학년·연락처·
 * 이메일 아홉 개다.
 *
 *  - 학번(stdnt_no)  **#237에서 열렸다.** 사람이 손으로 적어 넣는 값이라 오타가 실제로 들어오는데
 *                    고칠 경로가 없었다(ssccops#161 · 서버 #226). 잠금이 지키던 것은 변경 이력이
 *                    대신 지킨다 — 바뀌면 누가 언제 무엇을 무엇으로 고쳤는지가 이력에 남는다.
 *                    전산 가입일과 한 문장으로 묶여 있던 둘이 여기서 갈린다.
 *  - 전산 가입일     시스템이 계정을 만든 날이라 사람이 정하는 값이 아니다. 읽기만 한다.
 *    (sys_join_ymd)
 *  - 동아리 가입 연·월 **여기는 반대로 연다.** 이관 명부에 없던 값이라 처음부터 비어 있고,
 *    (clb_join_yr_no)  운영진이 확인되는 대로 뒤늦게 채워야 한다 — 채울 곳이 없으면 그 값은
 *    (clb_join_mm_no)  영원히 비어 있다. 연도는 기수의 근거라 기수 자동 채움도 여기서 돈다.
 *  - 등급·상태       변경 이력(mbr_grd_hstry · mbr_stts_hstry)을 함께 남겨야 해 전용 API가
 *                    따로 있다(서버 #78 · 웹 #48). 그래서 칩이 아니라 **상세 화면으로 보내는
 *                    링크**다 — 이 화면에서 고르게 두면 저장 버튼 하나가 이력 있는 변경과 없는
 *                    변경을 섞어 부르게 된다.
 *
 * ── 폼을 서버 값으로 채우고 전 필드를 보낸다 ────────────────────
 * PATCH이지만 본문은 한 벌 전체이고 **생략한 선택 필드는 비우는 것**이다(서버
 * MemberUpdateRequest 주석). 그래서 초기값은 반드시 서버 응답이어야 하고, 저장은 손대지 않은
 * 칸까지 통째로 보낸다. 화면에 "비워 둔 칸은 지워집니다"를 적어 둔 것은 이 의미가 사용자에게도
 * 보여야 하기 때문이다.
 *
 * ── 진입 가드는 #52 가 넣은 것을 그대로 둔다 ────────────────────
 * 수정은 조회보다 더 강한 동작이라 화면 자체를 열지 않는다 — "동작만 잠근다"를 따르면 남의
 * 개인정보가 채워진 폼을 보여 준 채 저장만 막는 꼴이 된다.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원 정보를 수정할 수 없습니다 — 운영진에게 요청해주세요";

/**
 * 계정을 아직 연결하지 않은 회원의 학번을 고칠 때만 띄우는 안내 (#237 · ssccops#161).
 *
 * 이관 회원이 계정을 붙이는 유일한 경로는 **학번·회원명·연락처 3종 일치**다(서버
 * `MemberLinkPolicy`). 그래서 학번을 고치면 그 회원은 옛 학번으로 더는 연결되지 않는다 —
 * 오타 정정이면 그것이 바로 목적이지만, 잘못 고치면 연결할 길을 잃는다. **서버는 막지
 * 않으므로**(운영자의 판단이다) 알리는 일은 화면 몫이다.
 *
 * **이미 연결된 회원에게는 띄우지 않는다.** 그쪽 연결은 `auth_user_id`로 굳어 있어 학번을
 * 다시 보지 않으므로 해당 없는 경고이고, 모든 회원에게 띄우면 곧 읽히지 않는 문장이 된다.
 */
const UNLINKED_STUDENT_NUMBER_NOTE =
  "이 회원은 아직 계정을 연결하지 않았습니다. 학번을 바꾸면 예전 학번으로는 계정을 연결할 수 없습니다 — 계정 연결은 학번 · 회원명 · 연락처가 모두 맞아야 합니다.";

export function MemberEditPage({ mbrId }: { mbrId: number }) {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <MemberEditForm mbrId={mbrId} />;
}

function MemberEditForm({ mbrId }: { mbrId: number }) {
  const router = useRouter();
  const editor = useMemberEdit(mbrId);
  const { member, values, errors, academicRequired } = editor;

  if (editor.status !== "ready" || !member) {
    return (
      <>
        <PageHeader title="회원 수정" showBack />
        <PageBody>
          {editor.status === "loading" && (
            <Card className="animate-pulse">
              <div className="h-[30px] w-[180px] rounded bg-black/5" />
              <div className="mt-3 h-[18px] w-[240px] rounded bg-black/5" />
              <div className="mt-5 h-[120px] w-full rounded bg-black/5" />
            </Card>
          )}
          {editor.status === "not-found" && (
            <EmptyState
              message="회원을 찾을 수 없습니다."
              action={{ label: "회원 목록", onClick: () => router.push(ROUTES.members) }}
            />
          )}
          {editor.status === "error" && (
            <EmptyState
              message={editor.errorMessage || "회원 정보를 불러오지 못했습니다."}
              action={{ label: "다시 시도", onClick: editor.reload }}
            />
          )}
        </PageBody>
      </>
    );
  }

  const save = async () => {
    const saved = await editor.save();
    if (!saved) return;
    flash(`${saved.name} 저장됨`);
    router.replace(ROUTES.memberDetail(saved.memberId));
  };

  return (
    <>
      <PageHeader
        title="회원 수정"
        subtitle={`회원 #${member.memberId} · ${member.name}`}
        showBack
      />
      <PageBody>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Card>
            <SectionLabel className="mb-3">기본정보</SectionLabel>
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              {/*
                안내를 입력란 바로 아래에 붙인다 — 카드 맨 아래 한 줄로 모아 두면 학번을 고치는
                손과 문장이 멀어져 읽히지 않는다. 좁은 화면에서도 학번 칸에 붙어 따라온다.
              */}
              <Field
                label={FIELD_LABEL.studentNumber}
                required={academicRequired}
                error={errors.studentNumber}
              >
                <TextField
                  value={values.studentNumber}
                  onChange={(e) => editor.set({ studentNumber: e.target.value })}
                  invalid={!!errors.studentNumber}
                  /*
                    자릿수·숫자 여부를 검사하지 않으므로(서버도 길이만 본다) 숫자 키패드를
                    강제하지 않는다 — 옛 명부에서 이관된 학번은 모양이 제각각이다.
                  */
                  placeholder={academicRequired ? "필수" : "비우면 학번 없음"}
                />
                {!member.linkedAccount && (
                  <div className="mt-[6px] rounded-[10px] border border-amber/35 bg-amber-soft px-[10px] py-[7px] text-[13px] leading-[1.7] text-amber">
                    {UNLINKED_STUDENT_NUMBER_NOTE}
                  </div>
                )}
              </Field>
              <Field label={FIELD_LABEL.memberName} required error={errors.name}>
                <TextField
                  value={values.name}
                  onChange={(e) => editor.set({ name: e.target.value })}
                  invalid={!!errors.name}
                  placeholder="필수"
                />
              </Field>
              <Field label={FIELD_LABEL.generationNumber} error={errors.generationNumber}>
                <TextField
                  value={values.generationNumber}
                  onChange={(e) => editor.set({ generationNumber: e.target.value })}
                  invalid={!!errors.generationNumber}
                  inputMode="numeric"
                  placeholder="비우면 미배정"
                />
              </Field>
              {/*
                연도를 다 치고 다음 칸으로 넘어가는 순간(blur) 기수를 채운다. 타이핑마다 묻지
                않는 이유와 이미 배정된 기수를 건드리지 않는 이유는 features/member 의
                useMemberEdit 주석에 있다.
              */}
              <Field label={FIELD_LABEL.clubJoinYear} error={errors.clubJoinYear}>
                <TextField
                  value={values.clubJoinYear}
                  onChange={(e) => editor.set({ clubJoinYear: e.target.value })}
                  onBlur={editor.suggestGeneration}
                  invalid={!!errors.clubJoinYear}
                  inputMode="numeric"
                  placeholder="예: 2020"
                />
              </Field>
              <Field label={FIELD_LABEL.clubJoinMonth} error={errors.clubJoinMonth}>
                <TextField
                  value={values.clubJoinMonth}
                  onChange={(e) => editor.set({ clubJoinMonth: e.target.value })}
                  invalid={!!errors.clubJoinMonth}
                  inputMode="numeric"
                  placeholder="모르면 비워 둡니다"
                />
              </Field>
              {/*
                안내는 두 칸 아래 한 줄로 둔다 — 연도·월·기수가 한 덩어리로 읽혀야 "연도를
                넣으면 기수가 찬다"가 전달된다. lg 미만에서는 세 칸이 세로로 쌓여 그대로 이어진다.
              */}
              <div className="text-[13px] leading-[1.6] text-n500 lg:col-span-2">
                {editor.generationSuggestError ? (
                  <span className="text-danger">{editor.generationSuggestError}</span>
                ) : editor.generationAutoFilled ? (
                  "가입 연도에 맞춰 기수를 채웠습니다. 실제 기수가 다르면 직접 고쳐주세요."
                ) : (
                  "동아리 가입 연도를 넣으면 기수가 자동으로 채워집니다. 이미 배정된 기수는 그대로 둡니다."
                )}
              </div>
              <Field
                label={FIELD_LABEL.departmentName}
                required={academicRequired}
                error={errors.departmentName}
              >
                <TextField
                  value={values.departmentName}
                  onChange={(e) => editor.set({ departmentName: e.target.value })}
                  invalid={!!errors.departmentName}
                  placeholder={academicRequired ? "필수" : "선택"}
                />
              </Field>
              <Field
                label={FIELD_LABEL.academicYear}
                required={academicRequired}
                error={errors.academicYear}
              >
                <TextField
                  value={values.academicYear}
                  onChange={(e) => editor.set({ academicYear: e.target.value })}
                  invalid={!!errors.academicYear}
                  inputMode="numeric"
                  placeholder={academicRequired ? "필수 · 1~4" : "선택 · 1~4"}
                />
              </Field>
              <Field label="전화번호" error={errors.phoneNumber}>
                <TextField
                  value={values.phoneNumber}
                  onChange={(e) => editor.set({ phoneNumber: e.target.value })}
                  invalid={!!errors.phoneNumber}
                  placeholder="010-0000-0000"
                />
              </Field>
              <Field label="이메일" error={errors.email}>
                <TextField
                  value={values.email}
                  onChange={(e) => editor.set({ email: e.target.value })}
                  invalid={!!errors.email}
                  placeholder="선택"
                />
              </Field>
            </div>

            <div className="mt-4 text-[13px] leading-[1.6] text-n500">
              {academicRequired
                ? "재학 회원은 학번 · 학과 · 학년이 필수입니다. "
                : "학번 · 학과 · 학년은 선택입니다. "}
              동아리 가입 월은 모르면 비워 두어도 됩니다. 비워 둔 칸은 저장할 때{" "}
              <b>지워집니다</b> — 이 화면은 아홉 항목을 통째로 저장합니다.
            </div>

            {editor.saveErrorMessage && (
              <div className="mt-3 rounded-[10px] border border-danger/28 bg-danger/8 px-3 py-[10px] text-[14px] leading-[1.6] text-danger">
                {editor.saveErrorMessage}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionLabel className="mb-3">이 화면에서 바꿀 수 없는 항목</SectionLabel>
              <div className="grid grid-cols-[84px_1fr] gap-y-[9px] text-[15px]">
                <div className="text-[14px] text-n500">전산 가입일</div>
                <div>{member.systemJoinDate}</div>
                <div className="text-[14px] text-n500">현재 기수</div>
                <div>{generationText(member.generationNumber)}</div>
              </div>
              {/*
                학번은 이 목록을 떠났다(#237). 남은 전산 가입일은 시스템이 기록한 시각이라
                성격이 다르므로, 둘을 묶어 설명하던 한 문장도 함께 갈랐다.
              */}
              <div className="mt-3 text-[13px] leading-[1.6] text-n500">
                전산 가입일은 시스템이 계정을 만든 날이라 수정할 수 없습니다. 동아리 가입 시기는
                확인되는 대로 채워주세요.
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center">
                <SectionLabel>등급 · 상태</SectionLabel>
                <div className="flex-1" />
                {/*
                  등급·상태 변경은 이력을 함께 남기는 전용 API다(서버 #78 · 웹 #48). 이 화면의
                  저장과 섞지 않고 상세 화면의 변경 시트로 보낸다 — 사유와 적용 일자를 받아야
                  하는 조작이라 입력칸도 다르다.
                */}
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.memberDetail(member.memberId))}
                  className="cursor-pointer text-[14px] text-accent"
                >
                  상세에서 변경 ›
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-[7px]">
                {/* 색은 코드로 고르고 글자는 서버가 준 명칭을 쓴다 (entities/member/api/members.ts) */}
                <Badge tone={mbrGrdTone(member.membershipGradeCode)}>
                  {member.membershipGradeName}
                </Badge>
                <Badge tone={mbrSttsTone(member.membershipStatusCode)}>
                  {member.membershipStatusName}
                </Badge>
              </div>
              <div className="mt-3 text-[13px] leading-[1.6] text-n500">
                등급 · 상태는 변경 이력을 남겨야 해 이 화면에서 바꾸지 않습니다. 상세 화면에서
                사유와 함께 변경합니다.
              </div>
            </Card>

            <Button
              block
              className="py-[13px]"
              onClick={() => void save()}
              disabled={editor.saving || !editor.dirty}
              title={editor.dirty ? undefined : "변경된 내용이 없습니다"}
            >
              {editor.saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </PageBody>
    </>
  );
}
