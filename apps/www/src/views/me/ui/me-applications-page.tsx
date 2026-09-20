import {
  APPLICATION_STATUS_BADGE,
  fetchMyApplications,
  myApplicationsErrorMessage,
  type MyApplication,
} from "@/entities/application";
import { fetchAuthSession } from "@/entities/session";
import { ROUTES } from "@/shared/config/routes";
import { EmptyState } from "@/shared/ui";
import { resolveGate } from "../model/gate";
import { filterByStatus, presentStatuses } from "../model/responses";
import { ApplicationCard } from "./application-card";
import { AccountLine, GateNotice } from "./gate-notices";
import { MeFrame } from "./me-frame";
import { StatusFilter } from "./status-filter";

/*
 * 신청한 행사 전량 (SSR · #574 · ssccops#428) — 허브 `/me`의 ①을 한 장으로.
 *
 * 목록은 페이징 없이 전량으로 오므로(`GET /v1/events/my-applications`) 상태 필터(`?status=`)는
 * 받아 둔 배열을 거른다 — 서버에 없는 필터 파라미터를 지어내지 않는다. 칩은 목록에 실제로
 * 있는 상태만, 라벨은 `APPLICATION_STATUS_BADGE`의 것이다(코드 → 라벨 표를 두 벌 두지 않는다).
 */
const STATUS_ORDER = Object.keys(APPLICATION_STATUS_BADGE);

export async function MeApplicationsPage({ status }: Readonly<{ status: string | null }>) {
  return (
    <MeFrame pathname={ROUTES.meApplications} description="행사 신청 결과를 확인할 수 있습니다">
      <Body status={status} />
    </MeFrame>
  );
}

async function Body({ status }: Readonly<{ status: string | null }>) {
  const [sessionResult, applicationsResult] = await Promise.allSettled([
    fetchAuthSession(),
    fetchMyApplications(),
  ]);

  const gate = resolveGate(sessionResult, applicationsResult);
  if (gate.kind !== "ready") return <GateNotice gate={gate} next={ROUTES.meApplications} />;

  return (
    <div className="flex flex-col gap-[12px]">
      <AccountLine session={gate.session} />
      {applicationsResult.status === "rejected" ? (
        <EmptyState title={myApplicationsErrorMessage(applicationsResult.reason)} />
      ) : (
        <ApplicationList applications={applicationsResult.value} status={status} />
      )}
    </div>
  );
}

function ApplicationList({
  applications,
  status,
}: Readonly<{
  applications: MyApplication[];
  status: string | null;
}>) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="아직 신청한 행사가 없습니다"
        description="행사 목록에서 모집 중인 행사를 확인해 보세요"
      />
    );
  }

  const statusOf = (application: MyApplication) => application.applicationStatus;
  const options = presentStatuses(applications, statusOf, STATUS_ORDER).map((code) => ({
    code,
    label: APPLICATION_STATUS_BADGE[code as MyApplication["applicationStatus"]].label,
  }));
  const selected = status !== null && STATUS_ORDER.includes(status) ? status : null;
  const visible = filterByStatus(applications, selected, statusOf, STATUS_ORDER);

  return (
    <div className="flex flex-col gap-[12px]">
      <StatusFilter basePath={ROUTES.meApplications} options={options} selected={selected} />
      {visible.length === 0 ? (
        <EmptyState title="해당 상태의 신청이 없습니다" />
      ) : (
        <div className="flex flex-col gap-[12px]">
          {visible.map((application) => (
            <ApplicationCard
              key={`${application.eventId}-${application.formRspnsId ?? application.eventPtcpId ?? "none"}`}
              application={application}
            />
          ))}
        </div>
      )}
    </div>
  );
}
