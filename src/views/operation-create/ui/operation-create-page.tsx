"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/entities/session";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useCreateMeeting } from "@/features/meeting";
import { useCreateSubWork } from "@/features/sub-work";
import { useActiveSubWorkTypes } from "@/features/sub-work-type";
import { useCreateWork, useWorkDetail } from "@/features/work";
import {
  ATND_TRGT_CDS,
  ATND_TRGT_NM,
  AUTZR_ROLE_NM,
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
import { ROUTES } from "@/shared/config/routes";
import {
  Button,
  Card,
  Chip,
  Field,
  PageBody,
  PageHeader,
  SectionLabel,
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
   * 회의 목록의 '+ 등록'처럼 특정 운영_유형에서 들어온 경우(`?kind=MEETING`) 선택 카드를
   * 그 유형 하나로 고정한다 — 하위 업무가 parentWorkId로 고정되는 것과 같은 방식이다.
   * 상위 업무 연결(parentWorkId)이 우선이며, kind는 SUB_WORK를 가리킬 수 없다(하위 업무는
   * 상위 업무 상세를 거쳐야만 생긴다).
   */
  const kinds: OperTypeCd[] = parentWorkId
    ? ["SUB_WORK"]
    : fixedKind === "WORK" || fixedKind === "MEETING"
      ? [fixedKind]
      : ["WORK", "MEETING"];
  const [operTypeCd, setOperTypeCd] = useState<OperTypeCd>(kinds[0]);

  // oper 공통 속성
  const [operTtl, setOperTtl] = useState("");
  const [prrtyRnkCd, setPrrtyRnkCd] = useState<PrrtyRnkCd>("NORMAL");
  const [bgngDt, setBgngDt] = useState("");
  const [endDt, setEndDt] = useState("");

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

  /*
   * 업무·하위 업무·회의 등록은 각각 WORK_MANAGE·WORK_MANAGE·MEETING_MANAGE 다 (#29 · 서버
   * WorkController·SubWorkController·MeetingController 전체, #83). 잠금은 **지금 고른
   * 운영_유형**에 따라 정한다.
   */
  const canManageWork = useCan(CAPABILITY.WORK_MANAGE);
  const canManageMeeting = useCan(CAPABILITY.MEETING_MANAGE);
  const allowed = operTypeCd === "MEETING" ? canManageMeeting : canManageWork;

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
   * 담당자는 **로그인한 회원 본인**이다. 서버에 회원 목록 API가 없어 다른 회원을 고를 수
   * 없고, 목 회원 목록의 mbrId를 그대로 보내면 서버가 실재하지 않는 회원으로 보고 400
   * (담당자로 지정할 수 없는 회원입니다)으로 끊는다. 담당자 위임은 회원 목록 API가 생긴 뒤에
   * 붙인다 — 그때까지 화면에도 고른 척하는 셀렉트를 두지 않는다.
   *
   * 업무_상태·진행률·등록자는 보내지 않는다. 서버가 각각 기획(PLANNING)·집계값·인증 주체로
   * 정하며, 화면이 값을 만들어 보내면 서버가 무시하는 필드가 늘 뿐이다.
   */
  const submitWork = async () => {
    if (!sessionMember) {
      flash("회원 정보를 확인할 수 없습니다. 다시 로그인해주세요");
      return;
    }

    const { workId, message } = await workCreation.create({
      title: operTtl.trim(),
      itemType: workTypeCd,
      ownerId: sessionMember.memberId,
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
   * 담당자는 업무 등록과 같은 이유로 **로그인한 회원 본인**이다 (회원 목록 API가 없다).
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
  const submitSubWork = async (workId: number) => {
    if (!sessionMember) {
      flash("회원 정보를 확인할 수 없습니다. 다시 로그인해주세요");
      return;
    }
    if (!subWorkTypeId) {
      flash("하위_업무_유형을 선택하세요");
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
      ownerId: sessionMember.memberId,
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
   * 담당자는 업무·하위 업무와 같은 이유로 **로그인한 회원 본인**이다. 회의 책임자를 따로
   * 입력받지 않는 것도 이슈 본문의 결정이다 — 담당자가 곧 책임자이므로 서버가
   * personInChargeId 하나로 oper.pic_id·mtg.mtg_rbprsn_id 양쪽을 채운다(ssccops-web#56).
   *
   * 안건은 이 화면에서 함께 등록하지 않는다 — 등록 직후 상세 화면에서 안건을 상정한다
   * (OPS-027). 등록 폼에 안건 입력까지 얹으면 "무엇에 연결할지"를 고르는 목록이 필요한데,
   * 지금 업무·하위 업무 목록 API(OPS-008·OPS-020)는 카드에 필요한 값만 내리고 oper_id를
   * 담지 않아 여기서 바로 쓸 수 없다.
   */
  const submitMeeting = async () => {
    if (!sessionMember) {
      flash("회원 정보를 확인할 수 없습니다. 다시 로그인해주세요");
      return;
    }

    const { meetingId, message } = await meetingCreation.create({
      title: operTtl.trim(),
      meetingCategory: mtgSeCd,
      personInChargeId: sessionMember.memberId,
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
      flash("운영_제목 · 시작_일시는 필수입니다");
      return;
    }

    if (operTypeCd === "WORK") {
      void submitWork();
      return;
    }

    if (operTypeCd === "SUB_WORK") {
      // 하위 업무 폼은 상위 업무에서 들어왔을 때만 그려진다 — 여기에 상위 업무가 없을 수 없다
      if (parentWorkId === null) {
        flash("상위 업무 상세에서 '+ 하위 업무'로 들어와주세요");
        return;
      }
      void submitSubWork(parentWorkId);
      return;
    }

    void submitMeeting();
  };

  return (
    <>
      <PageHeader
        title="운영 등록"
        subtitle="운영_유형별 등록 폼"
        showBack={parentWorkId !== null}
      />
      <PageBody>
        <Card className="mb-4">
          <SectionLabel className="mb-3">등록할 운영_유형</SectionLabel>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${kinds.length},1fr)` }}
          >
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

        <div className="grid grid-cols-[1.1fr_1fr] items-start gap-4">
          <Card>
            <SectionLabel className="mb-3">상위 속성 · oper</SectionLabel>
            <div className="grid grid-cols-2 gap-[14px]">
              <Field label="운영_제목" required className="col-span-2">
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
                담당자는 항상 본인으로 고정한다 — 서버에 회원 목록 API가 없어 고를 후보를
                받아올 데가 없고, 다른 회원의 식별자를 보내면 400(담당자로 지정할 수 없는
                회원입니다)으로 끊긴다. 회의도 #83부터 같은 제약을 받는다 — 책임자가 곧
                담당자이므로(ssccops-web#56) 셀렉트를 별도로 두지 않는다.
              */}
              <Field label="담당자">
                <div className="pt-[6px]">
                  <div className="text-[15px]">{sessionMember?.name ?? "-"}</div>
                  <div className="mt-1 text-[13px] text-n500">
                    본인으로 등록됩니다 · 담당자 위임은 추후 지원
                  </div>
                </div>
              </Field>
              <Field label="우선_순위_코드">
                <div className="flex gap-[7px] pt-[6px]">
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
              <Field label="시작_일시" required>
                <TextField
                  type="datetime-local"
                  value={bgngDt}
                  onChange={(e) => setBgngDt(e.target.value)}
                />
              </Field>
              <Field
                label={operTypeCd === "SUB_WORK" ? "마감_일시" : "종료_일시"}
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
                <div className="mb-2 text-[13.5px] text-n400">업무_유형_코드</div>
                <div className="mb-4 flex gap-[7px]">
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
                <Field label="총평_내용">
                  <TextArea
                    value={grvwCn}
                    onChange={(e) => setGrvwCn(e.target.value)}
                    placeholder="운영 종료 후 회고 · 지금은 비워도 됩니다"
                  />
                </Field>
                <div className="mt-3 text-[13px] text-n500">
                  등록 후 하위 업무를 이 업무에 연결하면 업무_진행_률이 집계됩니다.
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
                <div className="mb-2 text-[13.5px] text-n400">하위_업무_유형</div>
                {subWorkTypeOptions.status === "loading" && (
                  <div className="mb-3 text-[13.5px] text-n500">
                    하위_업무_유형을 불러오는 중입니다
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
                      <div className="text-n500">승인_필요</div>
                      <div className={rule.approvalNeeded ? "text-danger" : undefined}>
                        {rule.approvalNeeded
                          ? `${rule.authorizerRoleCode ? AUTZR_ROLE_NM[rule.authorizerRoleCode] : "책임자"} 승인 필요`
                          : "승인 없이 진행"}
                      </div>
                      <div className="text-n500">최소_동의_수</div>
                      <div>
                        {rule.minAgreeCountNeeded
                          ? `${rule.minAgreeCount}명 동의`
                          : "해당 없음"}
                      </div>
                      <div className="text-n500">완료_점검</div>
                      <div>
                        {rule.completionCheckArticles.length > 0
                          ? rule.completionCheckArticles.join(" · ")
                          : "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-[13.5px] text-n500">
                    하위_업무_유형을 선택하면 승인 규칙이 표시됩니다
                  </div>
                )}
                <div className="flex flex-col gap-[14px]">
                  <Field label="업무_내용">
                    <TextField
                      value={workCn}
                      onChange={(e) => setWorkCn(e.target.value)}
                      placeholder="무엇을 하는 하위 업무인지"
                    />
                  </Field>
                  <Field label="외부_URL_주소">
                    <TextField
                      value={otsdUrlAddr}
                      onChange={(e) => setOtsdUrlAddr(e.target.value)}
                      placeholder="https:// 로 시작하는 문서 · 시트 URL"
                    />
                  </Field>
                </div>
                <div className="mt-3 text-[13px] text-n500">
                  등록 직후 업무_상태는 기획(PLANNING)이며, 완료 점검 목록은 고른 유형의
                  항목을 복사해 함께 만들어집니다.
                </div>
              </>
            )}

            {operTypeCd === "MEETING" && (
              <>
                <div className="mb-2 text-[13.5px] text-n400">회의_구분_코드</div>
                <div className="mb-4 flex gap-[7px]">
                  {MTG_SE_CDS.map((cd) => (
                    <Chip key={cd} active={mtgSeCd === cd} onClick={() => setMtgSeCd(cd)}>
                      {MTG_SE_NM[cd]}
                    </Chip>
                  ))}
                </div>
                <div className="mb-2 text-[13.5px] text-n400">참석_대상_코드</div>
                <div className="mb-4 flex gap-[7px]">
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
                <Field label="회의_장소_명">
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
          {/* 등록은 되돌릴 API가 없다 — 진행 중에는 눌리지 않게 막는다 (연타 = 업무 중복 생성) */}
          <Button
            className="px-[26px] py-[11px]"
            onClick={submit}
            disabled={pending || !allowed}
            title={allowed ? undefined : NO_MANAGE_REASON[operTypeCd]}
          >
            {pending ? "등록하는 중…" : `${OPER_TYPE_NM[operTypeCd]} 등록`}
          </Button>
          {/* 잠긴 버튼의 툴팁만으로는 긴 폼을 다 채운 뒤에야 이유를 알게 된다 — 밖에도 적는다 */}
          {!allowed && (
            <div className="mt-2 text-[13.5px] text-n500">{NO_MANAGE_REASON[operTypeCd]}</div>
          )}
        </div>
      </PageBody>
    </>
  );
}
