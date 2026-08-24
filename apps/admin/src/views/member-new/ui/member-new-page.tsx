"use client";

import { useRouter } from "next/navigation";
import { CAPABILITY } from "@/entities/session";
import { useCan } from "@/features/auth";
import { ROUTES } from "@/shared/config/routes";
import { Button, Card, EmptyState, PageBody, PageHeader, SectionLabel } from "@/shared/ui";

/*
 * 회원 등록 (#46 · 서버 #76) — 입력 폼 대신 안내를 둔다.
 *
 * ── 왜 폼을 닫았는가 ───────────────────────────────────────────
 * 서버에 **운영진이 회원을 직접 만드는 API가 없다.** `mbr` 행이 생기는 유일한 경로는
 * `POST /v1/members/signup`이고 그것은 본인이 자기 계정으로 부르는 가입이다(서버
 * MemberController 주석 · 인증 시점에도 회원을 만들지 않는다). 즉 운영진이 남의 회원 행을
 * 만들 자리가 계약에 없다.
 *
 * 예전 화면은 목 스토어의 `addMbr`로 저장하는 시늉을 했다. 목록·상세가 서버로 옮겨 온 지금
 * 그 조작은 어디에도 남지 않을뿐더러, 저장했다고 믿은 회원이 명부에 없는 상태를 만든다 —
 * **저장되지 않는 입력창을 열어 두지 않는다**는 판단은 views/my-account 가 먼저 했다.
 *
 * ── 왜 라우트를 지우지 않는가 ──────────────────────────────────
 * `/members/new`는 북마크·주소창·예전 링크로 여전히 들어올 수 있다. 라우트를 지우면 404가
 * 뜨는데, 그것은 "지금은 이 길이 없다"가 아니라 "주소를 잘못 쳤다"로 읽힌다. 대신 왜 없는지와
 * 어디로 가야 하는지를 말한다.
 *
 * 진입 가드는 #52 가 넣은 것을 그대로 둔다 — 형제 화면(목록·상세)과 같은 권한이라야 회원
 * 메뉴 전체가 한 규칙으로 읽힌다.
 */
const NO_MEMBER_MANAGE =
  "회원 관리(MEMBER_MANAGE) 권한이 없어 이 화면을 볼 수 없습니다 — 운영진에게 요청해주세요";

export function MemberNewPage() {
  const canManage = useCan(CAPABILITY.MEMBER_MANAGE);
  const router = useRouter();

  if (!canManage) {
    return (
      <>
        <PageHeader title="회원 등록" showBack />
        <PageBody>
          <EmptyState message={NO_MEMBER_MANAGE} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="회원 등록" subtitle="가입은 본인이, 이관은 CSV로" showBack />
      <PageBody maxWidth={720}>
        <Card>
          <SectionLabel className="mb-3">운영진이 회원을 직접 만들지 않습니다</SectionLabel>
          <div className="flex flex-col gap-3 text-[15px] leading-[1.6]">
            <p>
              회원 정보는 <b>본인이 가입할 때</b> 만들어집니다. 새로 들어온 회원에게는 계정을
              대신 만들어 주는 대신 로그인 후 가입 화면을 안내해주세요 — 학번·연락처는 본인이
              입력하는 것이 정확하고, 계정이 연결돼 있어야 이후 연락도 닿습니다.
            </p>
            <p>
              이전 시스템의 명부를 옮기는 것은 <b>CSV 회원 이관</b>으로 합니다. 한 명씩 넣는
              화면을 따로 두면 같은 명부를 만드는 길이 둘이 되고, 어느 쪽이 최신인지 알 수
              없게 됩니다.
            </p>
            <p className="text-[14px] text-n500">
              등급 · 상태 · 역할은 가입한 회원의 상세 화면에서 운영진이 정합니다.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-[10px]">
            <Button onClick={() => router.push(ROUTES.csvImport)}>CSV 회원 이관</Button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.members)}
              className="cursor-pointer text-[14px] text-accent"
            >
              회원 목록으로
            </button>
          </div>
        </Card>
      </PageBody>
    </>
  );
}
