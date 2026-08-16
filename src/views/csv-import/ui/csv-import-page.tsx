"use client";

import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { useMemberImport } from "@/features/member";
import { CSV_STEPS } from "@/features/member/model/csv-spec";
import { BarStepper, EmptyState, PageBody, PageHeader } from "@/shared/ui";
import { FileStep } from "./file-step";
import { MappingStep } from "./mapping-step";
import { ResultStep } from "./result-step";
import { ValidationStep } from "./validation-step";

/*
 * CSV 회원 이관 (#57 · 서버 #84·#85 · 상위 ssccops#75).
 *
 * 회원 명부를 통째로 만들어 넣는 화면이라 회원 목록과 같은 권한으로 잠근다. 근거는
 * views/member-list 의 NO_MEMBER_MANAGE 주석이며, 서버도 세 엔드포인트 전부를
 * `@RequireAuthority(MEMBER_MANAGE)`로 막았다 — 미리보기도 예외가 아니다.
 *
 * 네 단계의 상태는 전부 `useMemberImport`에 있고 이 파일은 단계에 맞는 화면을 고르기만 한다.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 회원을 이관할 수 없습니다 — 운영진에게 요청해주세요";

export function CsvImportPage() {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);

  /* 훅을 조건부로 부를 수 없으므로 본문을 별도 컴포넌트로 뺀다 (views/role-authorities 와 같다) */
  if (!canManage) {
    return (
      <>
        <PageHeader title="CSV 회원 이관" />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return <CsvImportWizard />;
}

function CsvImportWizard() {
  const wizard = useMemberImport();

  return (
    <>
      <PageHeader
        title="CSV 회원 이관"
        subtitle="4단계 · 중복 후보는 건너뜁니다(자동 병합 없음) · 실행은 되돌릴 수 없습니다"
      />
      <PageBody>
        <BarStepper steps={CSV_STEPS} current={wizard.step} className="mb-5" />

        {wizard.step === 1 && <FileStep wizard={wizard} />}
        {wizard.step === 2 && <MappingStep wizard={wizard} />}
        {wizard.step === 3 && <ValidationStep wizard={wizard} />}
        {wizard.step === 4 && <ResultStep wizard={wizard} />}
      </PageBody>
    </>
  );
}
