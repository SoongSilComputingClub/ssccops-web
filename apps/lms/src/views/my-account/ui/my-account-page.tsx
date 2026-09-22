import { SectionLabel } from "@ssccops/ui";
import { LoginGate } from "@/features/auth";
// 서버 전용 조회는 배럴이 재export 하지 않는다(클라이언트 번들 오염 방지) — 직접 임포트한다
import { loadSessionUser } from "@/features/auth/model/load-session-user";
import { PushToggleCard } from "@/features/pwa";
import { Card } from "@/shared/ui";

/*
 * `/my` — 내 정보 (#606 · ssccops#448 · ADR-0045).
 *
 * 이 앱에 «내 정보» 화면이 없었다 — `/my` 아래에는 기획안 제출 현황(`/my/applications`)뿐이었다. 푸시
 * 알림 스위치는 «이 기기의 설정»이라 어느 화면의 부속도 아니어서 이 자리를 새로 둔다. 어드민 `/my`와
 * 같은 주소이고 같은 카드(«푸시 알림»)가 있다 — 두 앱을 오가는 운영진에게 같은 물건이 같은 자리다.
 *
 * 그리는 것은 둘이다: 로그인 계정(세션에서 — 서버를 부르지 않는다)과 «푸시 알림» 카드. 회원 정보(등급·
 * 기수·연락처)는 어드민의 것이라 여기 없다.
 *
 * 미로그인은 `LoginGate` — 다른 화면과 같은 규약(리다이렉트 없음).
 */
export async function MyAccountPage() {
  const user = await loadSessionUser();

  return (
    <div className="flex flex-col gap-[16px]">
      <header className="flex flex-col gap-[2px]">
        <h1 className="text-[22px] font-medium tracking-[-.3px] lg:text-[24px]">내 정보</h1>
        <p className="text-[13.5px] text-n500">로그인 계정과 이 기기의 알림 설정</p>
      </header>

      {user === null ? (
        <LoginGate
          title="로그인이 필요합니다"
          description="내 정보는 로그인한 회원만 볼 수 있습니다 — 구글 계정으로 로그인해주세요"
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          <Card>
            <SectionLabel>로그인 계정</SectionLabel>
            <div className="mt-3 text-[15.5px] text-ink">{user.name ?? "-"}</div>
            <div className="mt-[2px] text-[13.5px] text-n500">{user.email ?? "-"}</div>
          </Card>
          {/* 푸시 알림 스위치 — 기기마다 따로 켠다 (#606 · ADR-0045). 상태 문구는 @ssccops/pwa */}
          <PushToggleCard />
        </div>
      )}
    </div>
  );
}
