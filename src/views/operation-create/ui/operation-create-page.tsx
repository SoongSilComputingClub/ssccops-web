"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useCreateMeeting } from "@/features/meeting";
import { assignableMemberLabel, useAssignableMembers } from "@/features/member";
import { useCreateSubWork } from "@/features/sub-work";
import { useActiveSubWorkTypes } from "@/features/sub-work-type";
import { useCreateWork, useWorkDetail } from "@/features/work";
import {
  ATND_TRGT_CDS,
  ATND_TRGT_NM,
  MTG_SE_CDS,
  MTG_SE_NM,
  OPER_TYPE_NM,
  PRRTY_RNK_CDS,
  PRRTY_RNK_NM,
  WORK_TYPE_CDS,
  WORK_TYPE_NM,
  type AtndTrgtCd,
  type MtgSeCd,
  type OperTypeCd,
  type PrrtyRnkCd,
  type WorkTypeCd,
} from "@/shared/config/codes";
import { fromInput } from "@/shared/lib/date";
import { FIELD_LABEL } from "@/shared/config/labels";
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
  SelectField,
  TextArea,
  TextField,
  flash,
} from "@/shared/ui";

const KIND_META: Record<OperTypeCd, { table: string; note: string }> = {
  WORK: {
    table: "work",
    note: "행사·상시·정례 운영처럼 여러 하위 업무를 묶는 단위",
  },
  SUB_WORK: {
    table: "sub_work",
    note: "실제 실행 단위. 승인·점검 목록이 붙습니다",
  },
  MEETING: {
    table: "mtg",
    note: "정례·주제 회의. 안건과 결과를 기록합니다",
  },
};

/** 잠긴 조작에 붙는 사유. 감추지 않고 잠그는 근거는 features/auth/model/use-can.ts */
const NO_MANAGE_REASON: Record<OperTypeCd, string> = {
  WORK: "업무·하위 업무를 등록할 권한이 없습니다 — 운영진 권한이 필요합니다",
  SUB_WORK: "업무·하위 업무를 등록할 권한이 없습니다 — 운영진 권한이 필요합니다",
  MEETING: "회의를 등록할 권한이 없습니다 — 운영진 권한이 필요합니다",
};

export function OperationCreatePage({
  workId: fixedWorkId,
  kind: fixedKind,
}: {
  workId?: number;
  /** 특정 운영_유형 화면(예: 회의 목록의 '+ 등록')에서 들어온 경우 선택 카드를 그 유형 하나로 고정한다 */
  kind?: OperTypeCd;
}) {
  const router = useRouter();
  /* 업무(WORK)·하위 업무(SUB_WORK)·회의(MEETING)가 모두 서버로 나간다 (#30 · #36 · #83) */
  const sessionMember = useSessionStore((s) => s.member);
  const workCreation = useCreateWork();
  const subWorkCreation = useCreateSubWork();
  const meetingCreation = useCreateMeeting();

  /*
   * 상위 업무 식별자는 쿼리 파라미터(`/operations/new?workId=2`)로 온다 — 손으로 고칠 수
   * 있으므로 숫자가 아니면 상위 업무가 없는 것으로 본다. 그러면 kinds가 업무·회의로 갈려
   * 하위 업무 폼 자체가 그려지지 않는다.
   */
  const parentWorkId =
    fixedWorkId != null && Number.isInteger(fixedWorkId) && fixedWorkId > 0
      ? fixedWorkId
      : null;

  /*
   * 상위 업무는 **서버에서 다시 받는다** (OPS-003). 목 스토어에서 찾으면 화면에 뜨는 이름이
   * 실제로 하위 업무가 붙을 업무와 무관해진다 — 목 데이터의 1번 업무 이름('2026 동아리
   * 박람회')이 서버의 1번 업무와 같을 이유가 없다(#36에서 이 어긋남이 그대로 보였다).
   *
   * 조회 실패는 등록을 막는다. 없는 업무·삭제된 업무라면 서버가 어차피 404로 끊고, 권한이
   * 없으면 등록도 403이다 — 긴 폼을 다 채운 뒤에 알게 하지 않는다.
   */
  const parentWork = useWorkDetail(parentWorkId ?? 0);
  /* 하위 업무 폼을 그리는 화면(상위 업무에서 들어온 경우)에서만 유형 목록을 부른다 */
  const subWorkTypeOptions = useActiveSubWorkTypes(parentWorkId !== null);

  /*
   * 업무·하위 업무·회의 등록은 각각 WORK_MANAGE·WORK_MANAGE·MEETING_MANAGE 다 (#29 · 서버
   * WorkController·SubWorkController·MeetingController, #83). kinds보다 먼저 계산하는 것은
   * 아래에서 유형 자체를 걸러내는 데 쓰기 때문이다 — 국원처럼 둘 다 없는 회원에게는 선택
   * 카드 자체를 보여 주지 않는다(#71, 등록 버튼만 잠그던 것에서 한 단계 더 막는다).
   */
  const canManageWork = useCan(CAPABILITY.WORK_MANAGE);
  const canManageMeeting = useCan(CAPABILITY.MEETING_MANAGE);
  const canManageKind = (cd: OperTypeCd) => (cd === "MEETING" ? canManageMeeting : canManageWork);

  /*
   * 회의 목록의 '+ 등록'처럼 특정 운영_유형에서 들어온 경우(`?kind=MEETING`) 선택 카드를
   * 그 유형 하나로 고정한다 — 하위 업무가 parentWorkId로 고정되는 것과 같은 방식이다.
   * 상위 업무 연결(parentWorkId)이 우선이며, kind는 SUB_WORK를 가리킬 수 없다(하위 업무는
   * 상위 업무 상세를 거쳐야만 생긴다). 마지막에 canManageKind로 거르므로, 위 세 갈래 중 어느
   * 것을 골랐어도 권한이 없는 유형은 kinds에 남지 않는다.
   */
  const kinds: OperTypeCd[] = (
    parentWorkId
      ? (["SUB_WORK"] as OperTypeCd[])
      : fixedKind === "WORK" || fixedKind === "MEETING"
        ? [fixedKind]
        : (["WORK", "MEETING"] as OperTypeCd[])
  ).filter(canManageKind);
  const [operTypeCd, setOperTypeCd] = useState<OperTypeCd>(kinds[0] ?? "WORK");

  /*
   * 담당자 후보는 **서버에서 받는다** (#53 · GET /v1/members/assignable). 목 회원 스토어에서
   * 고르면 화면에 뜨는 이름과 실제로 배정되는 사람이 갈린다 — 목 데이터의 mbrId 1~12는 서버의
   * 같은 번호와 아무 관계가 없고, `oper.pic_id`·`mtg.mtg_rbprsn_id`가 둘 다 `mbr.mbr_id`를
   * 가리키는 FK라 엉뚱한 회원에게 배정되거나 400 OWNER_NOT_ACTIVE_MEMBER로 끊긴다. 상위 업무를
   * 서버에서 다시 받는 것(바로 위)과 같은 이유이며, 그쪽이 이 어긋남을 먼저 겪었다(#36).
   */
  /*
   * 업무·회의는 담당자·책임자도 국장 이상만 고를 수 있어야 한다(#71, 서버 #101) — 유형이
   * 바뀌면 훅이 authority 인자로 다시 불러 후보를 새로 받는다. 하위 업무는 국원도 담당자가
   * 될 수 있으므로 authority를 주지 않는다(전체 활동 회원).
   */
  const assignable = useAssignableMembers(
    operTypeCd === "MEETING"
      ? CAPABILITY.MEETING_MANAGE
      : operTypeCd === "SUB_WORK"
        ? undefined
        : CAPABILITY.WORK_MANAGE,
  );

  // oper 공통 속성
  const [operTtl, setOperTtl] = useState("");
  const [prrtyRnkCd, setPrrtyRnkCd] = useState<PrrtyRnkCd>("NORMAL");
  const [bgngDt, setBgngDt] = useState("");
  const [endDt, setEndDt] = useState("");

  /*
   * 담당자(oper.pic_id). **아직 고르지 않았음을 null로 둔다** — `mbrs[0]?.mbrId || 1` 같은
   * 폴백이 곧 잘못된 값이 서버로 나가는 길이었다(#53). 기본값은 세션 본인이지만 그것도 상태에
   * 미리 넣지 않고 아래에서 파생시킨다: 세션이 늦게 도착하는 화면에서 effect로 밀어 넣으면
   * 사용자가 이미 고른 값을 덮어쓰는 자리가 생긴다.
   *
   * 회의도 이 한 값으로 끝난다 — 회의 책임자는 담당자와 항상 같은 회원이라
   * (ssccops-web#56) 서버가 personInChargeId 하나로 oper.pic_id·mtg.mtg_rbprsn_id를 채운다.
   */
  const [pickedPicId, setPickedPicId] = useState<number | null>(null);
  const picId = pickedPicId ?? sessionMember?.memberId ?? null;

  /*
   * **후보 목록에 실제로 있는 값인가.** 세션 본인이라고 해서 통과시키지 않는 것은, 목록이
   * 아직 안 왔거나 조회에 실패한 상태에서 등록이 그대로 나가면 이 화면을 고친 이유가 사라지기
   * 때문이다. 탈퇴·제명된 본인처럼 서버가 후보에서 뺀 회원도 여기서 걸린다.
   */
  const picReady = assignable.includes(picId);

  /** 담당자를 확정하지 못한 이유 — 빈 문자열이면 확정됐다. 등록 버튼의 잠금 근거이기도 하다 */
  const picBlockReason =
    assignable.status === "loading"
      ? "담당자 목록을 불러오는 중입니다"
      : assignable.status === "error"
        ? assignable.errorMessage
        : assignable.members.length === 0
          ? "담당자로 지정할 수 있는 활동 회원이 없습니다"
          : picReady
            ? ""
            : "담당자를 선택하세요";

  // work 확장
  const [workTypeCd, setWorkTypeCd] = useState<WorkTypeCd>("EVENT");
  const [grvwCn, setGrvwCn] = useState("");

  /*
   * sub_work 확장. 상위 업무를 고르는 상태를 두지 않는 것은 **하위 업무가 상위 업무 안에서만
   * 생기기 때문이다** — 이 화면은 상위 업무 상세의 '+ 하위 업무'로만 SUB_WORK 폼을 그리므로
   * (kinds가 parentWorkId로 갈린다) 연결 대상은 언제나 그 한 건이다. 고르는 칩을 남겨
   * 두면 목 업무 목록에서 아무 업무나 골라 서버로 보내는 길이 생긴다.
   */
  const [subWorkTypeId, setSubWorkTypeId] = useState<number | null>(null);
  const [workCn, setWorkCn] = useState("");
  const [otsdUrlAddr, setOtsdUrlAddr] = useState("");

  // mtg 확장
  const [mtgSeCd, setMtgSeCd] = useState<MtgSeCd>("REGULAR");
  const [atndTrgtCd, setAtndTrgtCd] = useState<AtndTrgtCd>("ALL");
  const [mtgPlcNm, setMtgPlcNm] = useState("");

  /* 등록 버튼 잠금은 위에서 이미 걸러진 kinds 중 **지금 고른 운영_유형**을 다시 확인한다 */
  const allowed = canManageKind(operTypeCd);

  /* 서버로 나가는 세 경로(업무·하위 업무·회의) 중 하나라도 응답을 기다리는 중이면 버튼을 잠근다 */
  const pending = workCreation.pending || subWorkCreation.pending || meetingCreation.pending;

  /* 고른 유형의 승인 규칙 — 서버 목록에서 온 값이라 화면과 실제 판정이 갈리지 않는다 */
  const rule =
    subWorkTypeOptions.types.find((t) => t.subWorkTypeId === subWorkTypeId) ?? null;

  /*
   * 상위 업무 칩 문구. 아직 못 받았거나 조회에 실패했으면 **식별자를 그대로 보여 준다** —
   * 이름을 지어내거나 비워 두면 어느 업무에 붙이려던 것인지 화면에서 사라진다.
   */
  const parentWorkLabel =
    parentWork.status === "ready"
      ? parentWork.work?.title || `업무 #${parentWorkId}`
      : parentWork.status === "loading"
        ? "불러오는 중"
        : `업무 #${parentWorkId}`;

  /*
   * 업무 등록 (OPS-002 · POST /v1/works).
   *
   * 담당자는 **담당자 후보 목록에서 고른 회원**이다(#53). 기본값은 세션 본인이며, 후보에 없는
   * 값은 submit이 아니라 위의 `picReady`에서 이미 걸러진다 — 서버도 400
   * VALIDATION_FAILED(OWNER_NOT_ACTIVE_MEMBER)로 끊지만, 긴 폼을 다 채운 뒤에 알게 하지 않는다.
   *
   * 업무_상태·진행률·등록자는 보내지 않는다. 서버가 각각 기획(PLANNING)·집계값·인증 주체로
   * 정하며, 화면이 값을 만들어 보내면 서버가 무시하는 필드가 늘 뿐이다.
   */
  const submitWork = async (ownerId: number) => {
    const { workId, message } = await workCreation.create({
      title: operTtl.trim(),
      itemType: workTypeCd,
      ownerId,
      startAt: fromInput(bgngDt, true),
      endAt: endDt ? fromInput(endDt, true) : null,
      priority: prrtyRnkCd,
      review: grvwCn.trim() || null,
    });

    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (workId) router.replace(ROUTES.workDetail(workId));
  };

  /*
   * 하위 업무 등록 (OPS-007 · POST /v1/sub-works · #36).
   *
   * 담당자는 업무 등록과 같은 방식으로 후보 목록에서 고른 회원이다 (#53).
   *
   * 화면의 '마감_일시' 한 칸이 서버의 endAt(oper 종료_일시)과 dueAt(sub_work 마감_일시)을
   * 함께 채운다. 두 값을 나눠 받을 입력란이 시안에 없고, 한쪽만 채우면 다른 쪽 기능이
   * 조용히 죽는다 — endAt만 보내면 지연 판정·마감 임박 조회(OPS-008)가 볼 값이 없고,
   * dueAt만 보내면 상세의 '기간'이 비어 버린다. 목 스토어 시절에도 같은 값을 두 곳에 넣었다.
   *
   * 업무_상태·승인_상태·완료 체크리스트는 보내지 않는다 — 서버가 각각 기획(PLANNING)·
   * 유형의 승인 필요 여부·유형의 완료 점검 항목 복사로 정한다. 목 시절 화면이 만들어 넣던
   * 기본 점검 항목 4개는 그래서 사라졌다(유형마다 다른 항목이 서버에서 붙는다).
   *
   * 등록 후에는 **상위 업무 상세로 돌아간다.** 하위 업무 상세 화면은 아직 목 데이터라
   * 방금 받은 서버 식별자를 찾지 못한다 — 등록은 성공했는데 "없는 하위 업무"가 뜨는 화면으로
   * 보내지 않는다. 상위 업무 상세는 서버 연동(#30)이라 목록에 새 하위 업무가 그대로 보인다.
   */
  const submitSubWork = async (workId: number, ownerId: number) => {
    if (!subWorkTypeId) {
      flash("하위 업무 유형을 선택하세요");
      return;
    }
    if (parentWork.status !== "ready") {
      flash("상위 업무를 확인하지 못했습니다. 업무 상세에서 다시 들어와주세요");
      return;
    }

    const ddlnDt = endDt ? fromInput(endDt, true) : null;
    const { subWorkId, message } = await subWorkCreation.create({
      workId,
      title: operTtl.trim(),
      subWorkTypeId,
      ownerId,
      startAt: fromInput(bgngDt, true),
      endAt: ddlnDt,
      dueAt: ddlnDt,
      priority: prrtyRnkCd,
      content: workCn,
      externalLink: otsdUrlAddr,
    });

    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (subWorkId) router.replace(ROUTES.workDetail(workId));
  };

  /*
   * 회의 등록 (OPS-024 · POST /v1/meetings, #83).
   *
   * 담당자는 업무·하위 업무와 같은 후보 목록에서 고른다(#53). 회의 책임자를 따로 입력받지
   * 않는 것은 이슈 본문의 결정이다 — 담당자가 곧 책임자이므로 서버가 personInChargeId 하나로
   * oper.pic_id·mtg.mtg_rbprsn_id 양쪽을 채운다(ssccops-web#56). 그래서 담당자 셀렉트를
   * 고치는 것이 곧 회의 책임자를 고치는 일이다.
   *
   * 안건은 이 화면에서 함께 등록하지 않는다 — 등록 직후 상세 화면에서 안건을 상정한다
   * (OPS-027). 등록 폼에 안건 입력까지 얹으면 "무엇에 연결할지"를 고르는 목록이 필요한데,
   * 지금 업무·하위 업무 목록 API(OPS-008·OPS-020)는 카드에 필요한 값만 내리고 oper_id를
   * 담지 않아 여기서 바로 쓸 수 없다.
   */
  const submitMeeting = async (personInChargeId: number) => {
    const { meetingId, message } = await meetingCreation.create({
      title: operTtl.trim(),
      meetingCategory: mtgSeCd,
      personInChargeId,
      startAt: fromInput(bgngDt, true),
      endAt: endDt ? fromInput(endDt, true) : null,
      priority: prrtyRnkCd,
      attendeeScope: atndTrgtCd,
      location: mtgPlcNm.trim() || null,
      agendas: [],
    });

    if (!message) return; // 진행 중 중복 클릭 — 아무것도 보내지 않았다
    flash(message);
    if (meetingId) router.replace(ROUTES.meetingDetail(meetingId));
  };

  const submit = () => {
    if (!operTtl.trim() || !bgngDt) {
      flash("운영 제목 · 시작 일시는 필수입니다");
      return;
    }

    /*
     * 담당자가 후보 목록에 있는지를 **세 경로 앞에서 한 번에** 막는다. 여기를 지난 뒤에는
     * picId가 확실히 후보 안의 값이라 각 submit이 number 하나만 받으면 된다 — 세 곳에서
     * 각자 null을 다루면 한 곳만 빠뜨려도 그 유형에서만 잘못된 값이 나간다.
     */
    if (picId === null || !picReady) {
      flash(picBlockReason || "담당자를 선택하세요");
      return;
    }

    if (operTypeCd === "WORK") {
      void submitWork(picId);
      return;
    }

    if (operTypeCd === "SUB_WORK") {
      // 하위 업무 폼은 상위 업무에서 들어왔을 때만 그려진다 — 여기에 상위 업무가 없을 수 없다
      if (parentWorkId === null) {
        flash("상위 업무 상세에서 '+ 하위 업무'로 들어와주세요");
        return;
      }
      void submitSubWork(parentWorkId, picId);
      return;
    }

    void submitMeeting(picId);
  };

  /*
   * kinds가 비었다는 것은 이 화면으로 오게 만든 유형(상위 업무 연결이면 하위 업무, ?kind=면
   * 그 유형, 아니면 업무·회의 둘 다)을 국장 이상 권한 없이는 하나도 등록할 수 없다는 뜻이다
   * (#71). 폼을 그대로 그리고 등록 버튼만 잠그던 것에서 한 단계 더 나아가, 아예 폼을 보여
   * 주지 않는다 — 사이드바(nav.ts)가 "운영 등록" 메뉴 자체를 감추는 것과 같은 판단을 주소를
   * 직접 친 경우에도 지킨다.
   */
  if (kinds.length === 0) {
    const blockedReason = parentWorkId
      ? NO_MANAGE_REASON.SUB_WORK
      : fixedKind
        ? NO_MANAGE_REASON[fixedKind]
        : "업무·회의를 등록하려면 국장 이상의 운영진 권한이 필요합니다";
    return (
      <>
        <PageHeader title="운영 등록" subtitle="운영 유형별 등록 폼" showBack={parentWorkId !== null} />
        <PageBody>
          <EmptyState message={blockedReason} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="운영 등록"
        subtitle="운영 유형별 등록 폼"
        showBack={parentWorkId !== null}
      />
      <PageBody>
        <Card className="mb-4">
          <SectionLabel className="mb-3">등록할 {FIELD_LABEL.operationType}</SectionLabel>
          {/*
            열 수를 인라인 style로 주면 미디어 쿼리로 덮을 수 없어 좁은 화면에서도 2열로
            남는다 — 유형 카드는 설명 문장까지 담고 있어 그 폭에서는 글자만 세로로 쌓인다.
            kinds는 많아야 둘이므로(업무·회의) 클래스로 옮겨 모바일 1열 · lg 2열로 둔다.
          */}
          <div className={kinds.length > 1 ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
            {kinds.map((cd) => (
              <div
                key={cd}
                onClick={() => setOperTypeCd(cd)}
                className={
                  operTypeCd === cd
                    ? "cursor-pointer rounded-[12px] bg-accent/8 p-[14px] shadow-[inset_0_0_0_1px_#3182f6]"
                    : "cursor-pointer rounded-[12px] border border-line p-[14px] hover:border-accent"
                }
              >
                <div className="flex items-center gap-2">
                  <div className="text-[16px] font-semibold">{OPER_TYPE_NM[cd]}</div>
                  <span className="font-mono text-[12.5px] text-n500">
                    {KIND_META[cd].table}
                  </span>
                </div>
                <div className="mt-1 text-[13px] leading-[1.5] text-n500">
                  {KIND_META[cd].note}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <SectionLabel className="mb-3">상위 속성 · oper</SectionLabel>
            <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
              <Field
                label={FIELD_LABEL.operationTitle}
                required
                className="col-span-1 lg:col-span-2"
              >
                <TextField
                  value={operTtl}
                  onChange={(e) => setOperTtl(e.target.value)}
                  placeholder={
                    operTypeCd === "MEETING"
                      ? "예: 9월 1차 정기회의"
                      : "예: 동아리 박람회 부스 운영"
                  }
                />
              </Field>
              {/*
                담당자는 서버 후보 목록(GET /v1/members/assignable)에서 고른다 (#53).
                고르지 않았을 때 목록의 첫 회원으로 떨어지지 않도록 **빈 값을 실제 선택지로
                둔다** — 아직 목록이 없거나 세션 본인이 후보에서 빠진 경우, 셀렉트가 말없이
                첫 항목을 보여 주면 화면에 뜬 이름과 서버로 나가는 값이 갈린다.

                연락처·이메일·학번은 그리지 않는다 — 이 목록은 권한 없이 열리므로 서버가 그
                값을 내리지 않는다. 여기 필요한 것은 동명이인을 가르는 기수·역할까지다.
              */}
              <Field label="담당자" required>
                <SelectField
                  value={picReady && picId !== null ? String(picId) : ""}
                  disabled={assignable.status !== "ready"}
                  onChange={(e) =>
                    setPickedPicId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">
                    {assignable.status === "loading"
                      ? "담당자 목록을 불러오는 중…"
                      : "담당자 선택"}
                  </option>
                  {assignable.members.map((m) => (
                    <option key={m.memberId} value={m.memberId}>
                      {assignableMemberLabel(m)}
                    </option>
                  ))}
                </SelectField>
                <div
                  className={
                    picBlockReason
                      ? "mt-[5px] text-[12.5px] text-danger"
                      : "mt-[5px] text-[12.5px] text-n500"
                  }
                >
                  {picBlockReason ||
                    (picId === sessionMember?.memberId
                      ? "본인으로 등록됩니다 · 다른 회원을 담당자로 지정할 수 있습니다"
                      : "선택한 회원이 담당자로 등록됩니다")}
                </div>
                {/* 조회 실패는 등록 자체를 막는 상태라 다시 시도할 길을 그 자리에 둔다 */}
                {assignable.status === "error" && (
                  <button
                    type="button"
                    onClick={assignable.reload}
                    className="mt-[5px] cursor-pointer text-[12.5px] underline"
                  >
                    다시 시도
                  </button>
                )}
              </Field>
              <Field label={FIELD_LABEL.priority}>
                <div className="flex flex-wrap gap-[7px] pt-[6px]">
                  {PRRTY_RNK_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={prrtyRnkCd === cd}
                      onClick={() => setPrrtyRnkCd(cd)}
                    >
                      {PRRTY_RNK_NM[cd]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={FIELD_LABEL.startAt} required>
                <TextField
                  type="datetime-local"
                  value={bgngDt}
                  onChange={(e) => setBgngDt(e.target.value)}
                />
              </Field>
              <Field
                label={operTypeCd === "SUB_WORK" ? FIELD_LABEL.dueAt : FIELD_LABEL.endAt}
              >
                <TextField
                  type="datetime-local"
                  value={endDt}
                  onChange={(e) => setEndDt(e.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-3">
              확장 속성 · {KIND_META[operTypeCd].table}
            </SectionLabel>

            {operTypeCd === "WORK" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.workType}</div>
                <div className="mb-4 flex flex-wrap gap-[7px]">
                  {WORK_TYPE_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={workTypeCd === cd}
                      onClick={() => setWorkTypeCd(cd)}
                    >
                      {WORK_TYPE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <Field label={FIELD_LABEL.generalReview}>
                  <TextArea
                    value={grvwCn}
                    onChange={(e) => setGrvwCn(e.target.value)}
                    placeholder="운영 종료 후 회고 · 지금은 비워도 됩니다"
                  />
                </Field>
                <div className="mt-3 text-[13px] text-n500">
                  등록 후 하위 업무를 이 업무에 연결하면 진행률이 집계됩니다.
                </div>
              </>
            )}

            {operTypeCd === "SUB_WORK" && (
              <>
                {/*
                  상위 업무 연결을 유형보다 먼저 그린다 — '무엇에 붙는 하위 업무인가'가 유형
                  선택보다 앞선 정보이고, 이 값이 확인되지 않으면 아래를 다 채워도 등록되지 않는다.
                  이름은 서버 상세(OPS-003)에서 온 값이라 실제로 붙을 업무와 어긋날 수 없다.
                */}
                <div className="mb-2 text-[13.5px] text-n400">상위 업무 연결</div>
                <Chip active>{parentWorkLabel} 고정</Chip>
                <div
                  className={
                    parentWork.status === "ready"
                      ? "mt-2 mb-4 text-[13px] text-n500"
                      : "mt-2 mb-4 text-[13px] text-danger"
                  }
                >
                  {parentWork.status === "ready"
                    ? "하위 업무는 상위 업무 안에서만 생성됩니다"
                    : parentWork.status === "loading"
                      ? "상위 업무를 불러오는 중입니다"
                      : parentWork.errorMessage ||
                        "상위 업무를 찾을 수 없습니다. 업무 상세에서 다시 들어와주세요"}
                </div>

                {/*
                  유형은 **사용 중인 것만** 서버에서 받아 칩으로 그리고 하나만 고른다 (OPS-018).
                  꺼진 유형까지 고를 수 있으면 서버가 400 SUB_WORK_TYPE_INACTIVE로 끊는데,
                  사용자 눈에는 목록에 있던 유형을 골랐을 뿐이라 이유를 알 수 없다.
                */}
                <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.subWorkType}</div>
                {subWorkTypeOptions.status === "loading" && (
                  <div className="mb-3 text-[13.5px] text-n500">
                    하위 업무 유형을 불러오는 중입니다
                  </div>
                )}
                {subWorkTypeOptions.status === "error" && (
                  <div className="mb-3 text-[13.5px] text-danger">
                    {subWorkTypeOptions.errorMessage}{" "}
                    <button
                      type="button"
                      onClick={subWorkTypeOptions.reload}
                      className="cursor-pointer underline"
                    >
                      다시 시도
                    </button>
                  </div>
                )}
                {subWorkTypeOptions.status === "ready" &&
                  subWorkTypeOptions.types.length === 0 && (
                    <div className="mb-3 text-[13.5px] text-n500">
                      사용 중인 하위 업무 유형이 없습니다 — 하위 업무 유형 관리에서 먼저
                      등록하거나 사용을 켜야 합니다
                    </div>
                  )}
                <div className="mb-3 flex flex-wrap gap-[7px]">
                  {subWorkTypeOptions.types.map((t) => (
                    <Chip
                      key={t.subWorkTypeId}
                      active={subWorkTypeId === t.subWorkTypeId}
                      onClick={() => setSubWorkTypeId(t.subWorkTypeId)}
                    >
                      {t.typeName}
                    </Chip>
                  ))}
                </div>
                {/*
                  기준_금액은 이 표에 없다 — 서버의 유형 API 범위 밖이라(위험도 판정 REQ-016이
                  붙을 때 열린다) 목 스토어에서만 보이던 값이고, 남겨 두면 저장되지도 않는 규칙을
                  화면이 약속하게 된다.
                */}
                {rule ? (
                  <div className="mb-4 rounded-[12px] bg-bg p-3">
                    <div className="text-[13.5px] font-semibold">
                      {rule.typeName} 유형 규칙
                    </div>
                    <div className="mt-2 grid grid-cols-[92px_1fr] gap-y-[6px] text-[13.5px]">
                      <div className="text-n500">승인 필요</div>
                      <div className={rule.approvalNeeded ? "text-danger" : undefined}>
                        {rule.approvalNeeded
                          ? `${rule.authorizerAuthorityName ?? "책임자"} 승인 필요`
                          : "승인 없이 진행"}
                      </div>
                      <div className="text-n500">최소 동의 수</div>
                      <div>
                        {rule.minAgreeCountNeeded
                          ? `${rule.minAgreeCount}명 동의`
                          : "해당 없음"}
                      </div>
                      <div className="text-n500">완료 점검</div>
                      <div>
                        {rule.completionCheckArticles.length > 0
                          ? rule.completionCheckArticles.join(" · ")
                          : "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[13.5px] text-n500">
                    하위 업무 유형을 선택하면 승인 규칙이 표시됩니다
                  </div>
                )}
                <div className="flex flex-col gap-[14px]">
                  <Field label={FIELD_LABEL.workContent}>
                    <TextField
                      value={workCn}
                      onChange={(e) => setWorkCn(e.target.value)}
                      placeholder="무엇을 하는 하위 업무인지"
                    />
                  </Field>
                  <Field label={FIELD_LABEL.externalUrl}>
                    <TextField
                      value={otsdUrlAddr}
                      onChange={(e) => setOtsdUrlAddr(e.target.value)}
                      placeholder="https:// 로 시작하는 문서 · 시트 URL"
                    />
                  </Field>
                </div>
                <div className="mt-3 text-[13px] text-n500">
                  등록 직후 업무 상태는 기획(PLANNING)이며, 완료 점검 목록은 고른 유형의
                  항목을 복사해 함께 만들어집니다.
                </div>
              </>
            )}

            {operTypeCd === "MEETING" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.meetingCategory}</div>
                <div className="mb-4 flex flex-wrap gap-[7px]">
                  {MTG_SE_CDS.map((cd) => (
                    <Chip key={cd} active={mtgSeCd === cd} onClick={() => setMtgSeCd(cd)}>
                      {MTG_SE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <div className="mb-2 text-[13.5px] text-n400">{FIELD_LABEL.attendeeTarget}</div>
                <div className="mb-4 flex flex-wrap gap-[7px]">
                  {ATND_TRGT_CDS.map((cd) => (
                    <Chip
                      key={cd}
                      active={atndTrgtCd === cd}
                      onClick={() => setAtndTrgtCd(cd)}
                    >
                      {ATND_TRGT_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <Field label={FIELD_LABEL.meetingPlace}>
                  <TextField
                    value={mtgPlcNm}
                    onChange={(e) => setMtgPlcNm(e.target.value)}
                    placeholder="예: 동아리방"
                  />
                </Field>
                <div className="mt-3 text-[13px] text-n500">
                  회의 책임자는 항상 위 담당자와 같은 회원입니다 — 별도로 입력받지 않습니다.
                  안건은 등록 뒤 회의 상세에서 상정합니다.
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="mt-5">
          {/*
            등록은 되돌릴 API가 없다 — 진행 중에는 눌리지 않게 막는다 (연타 = 업무 중복 생성).
            담당자를 확정하지 못한 동안에도 잠근다(#53): 목록 조회가 실패한 채로 눌리면 서버로
            나가는 pic_id가 화면에 뜬 사람과 무관해진다.
          */}
          <Button
            className="px-[26px] py-[11px]"
            onClick={submit}
            disabled={pending || !allowed || picBlockReason !== ""}
            title={
              !allowed ? NO_MANAGE_REASON[operTypeCd] : picBlockReason || undefined
            }
          >
            {pending ? "등록하는 중…" : `${OPER_TYPE_NM[operTypeCd]} 등록`}
          </Button>
          {/* 잠긴 버튼의 툴팁만으로는 긴 폼을 다 채운 뒤에야 이유를 알게 된다 — 밖에도 적는다 */}
          {!allowed ? (
            <div className="mt-2 text-[13.5px] text-n500">{NO_MANAGE_REASON[operTypeCd]}</div>
          ) : (
            picBlockReason && (
              <div className="mt-2 text-[13.5px] text-n500">
                {picBlockReason} — 담당자가 정해져야 등록할 수 있습니다
              </div>
            )
          )}
        </div>
      </PageBody>
    </>
  );
}
