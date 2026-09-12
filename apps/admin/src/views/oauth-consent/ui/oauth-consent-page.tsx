"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { OAuthAuthorization } from "@/entities/oauth-authorization";
import {
  type ConsentDecision,
  ConsentDecisionButtons,
  scopeDescription,
  useOAuthConsent,
} from "@/features/oauth-consent";
import { Button } from "@/shared/ui";

/*
 * OAuth 동의 화면 (ssccops#315 · ssccops-web#430 · ADR-0026).
 *
 * Supabase OAuth 2.1 서버가 `Site URL + Authorization Path`(= 이 주소)로 사용자를 보낸다 —
 * `/oauth/consent?authorization_id=…`. 여기서 «허용»·«거절»을 누르면 Supabase가 돌려준
 * `redirect_url`로 클라이언트(Claude)에게 돌아간다.
 *
 * ── 어드민 셸이 없다 ────────────────────────────────────────
 * `(auth)` 라우트 그룹에 있어 사이드바·드로어 없이 로그인 화면과 같은 단독 레이아웃이다.
 * 여기 오는 사람은 어드민을 쓰러 온 것이 아니라 **다른 앱에서 잠깐 넘어온 것**이라, 목차가
 * 보이면 승인 뒤에 어디로 가야 하는지 헷갈린다.
 *
 * ── 클라이언트 이름·호스트·scope를 그대로 보인다 ──────────────
 * DCR을 켜면 아무 클라이언트나 등록할 수 있어 이 화면이 방어선이다(ADR-0026). 이름은
 * 클라이언트가 스스로 적어 낸 값이므로 «돌아갈 곳» 호스트를 함께 보여 사용자가 대조할 수
 * 있게 한다 — 이름이 «Claude»인데 호스트가 낯선 곳이면 거절해야 한다.
 */

/** 로그인 화면과 같은 폭·같은 머리(로고·제목) — 두 화면이 한 흐름으로 읽히게 */
function Frame({ title, children }: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <div className="w-full max-w-[392px] px-4">
      <div className="flex size-[34px] items-center justify-center rounded-[12px] border border-accent text-[16px] text-accent">
        S
      </div>
      <h1 className="mt-[22px] text-[26px] leading-[1.25] font-medium tracking-[-.5px]">
        {title}
      </h1>
      {children}
    </div>
  );
}

function Notice({ tone, children }: Readonly<{ tone: "danger" | "amber"; children: ReactNode }>) {
  const cls =
    tone === "danger"
      ? "border-danger/28 bg-danger/8 text-danger"
      : "border-amber/35 bg-amber-soft text-amber";
  return (
    <div className={`rounded-[12px] border px-[14px] py-3 text-[14px] leading-[1.55] ${cls}`}>
      {children}
    </div>
  );
}

function ScopeList({ scopes }: Readonly<{ scopes: string[] }>) {
  if (scopes.length === 0) {
    return <p className="text-[14px] text-n500">요청한 권한 범위가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-col gap-[6px]">
      {scopes.map((scope) => {
        const description = scopeDescription(scope);
        return (
          <li key={scope} className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
            <code className="rounded-[6px] bg-fill px-[6px] py-[1px] text-[13px] text-n300">
              {scope}
            </code>
            {description && <span className="text-n400">{description}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function AuthorizationSummary({ authorization }: Readonly<{ authorization: OAuthAuthorization }>) {
  return (
    <dl className="mt-6 grid gap-y-[10px] text-[15px]" style={{ gridTemplateColumns: "84px 1fr" }}>
      <dt className="text-[14px] text-n500">앱 이름</dt>
      <dd className="min-w-0 break-all text-ink">
        {authorization.clientName}
        {authorization.clientUri && (
          <span className="mt-[2px] block text-[13px] break-all text-n500">
            {authorization.clientUri}
          </span>
        )}
      </dd>
      <dt className="text-[14px] text-n500">돌아갈 곳</dt>
      <dd className="min-w-0 break-all text-n300">{authorization.redirectHost}</dd>
      <dt className="text-[14px] text-n500">요청 범위</dt>
      <dd className="min-w-0">
        <ScopeList scopes={authorization.scopes} />
      </dd>
    </dl>
  );
}

function ConsentBody({
  authorization,
  pending,
  actionError,
  signupRequired,
  onApprove,
  onDeny,
}: Readonly<{
  authorization: OAuthAuthorization;
  pending: ConsentDecision | null;
  actionError: string | null;
  signupRequired: boolean;
  onApprove: () => void;
  onDeny: () => void;
}>) {
  return (
    <Frame
      title={
        <>
          <span className="break-all">{authorization.clientName}</span>
          <br />
          접근 요청
        </>
      }
    >
      <p className="mt-3 text-[14.5px] leading-[1.6] text-n400">
        이 앱이 회원님의 SSCC 계정으로 운영관리시스템을 쓰려고 합니다. 허용하면 앱은 회원님이
        가진 권한 안에서만 동작합니다.
      </p>
      <AuthorizationSummary authorization={authorization} />
      <div className="mt-6 mb-5 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      {signupRequired && (
        <div className="mb-4">
          {/* 승인은 막지 않는다 — 판정은 서버가 한다(ADR-0026). 여기서는 알리기만 */}
          <Notice tone="amber">회원 가입 뒤에 사용할 수 있습니다.</Notice>
        </div>
      )}
      {actionError && (
        <div className="mb-4">
          <Notice tone="danger">{actionError}</Notice>
        </div>
      )}
      <ConsentDecisionButtons pending={pending} onApprove={onApprove} onDeny={onDeny} />
      <p className="mt-5 text-[13px] leading-[1.6] text-n500">
        앱 이름과 돌아갈 곳이 기대한 것과 다르면 거절해주세요. 거절해도 계정에는 아무 변화가
        없습니다.
      </p>
    </Frame>
  );
}

function StatusBody({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <Frame title={title}>
      <div className="mt-3 text-[14.5px] leading-[1.6] text-n400">{children}</div>
    </Frame>
  );
}

export function OAuthConsentPage() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const { state, signupRequired, approve, deny, retry } = useOAuthConsent(authorizationId);

  switch (state.status) {
    case "missing-id":
    case "invalid":
      return (
        <StatusBody title="요청이 유효하지 않습니다">
          연결 요청이 없거나 만료됐거나 이미 처리됐습니다 — 연결을 시작한 앱에서 다시
          시도해주세요
        </StatusBody>
      );
    case "error":
      return (
        <StatusBody title="요청을 확인하지 못했습니다">
          <p>{state.message}</p>
          <Button className="mt-4" onClick={retry}>
            다시 시도
          </Button>
        </StatusBody>
      );
    case "loading":
      return <StatusBody title="접근 요청 확인 중">잠시만 기다려주세요.</StatusBody>;
    case "redirecting":
      return <StatusBody title="앱으로 돌아가는 중">잠시만 기다려주세요.</StatusBody>;
    case "ready":
      return (
        <ConsentBody
          authorization={state.authorization}
          pending={state.pending}
          actionError={state.actionError}
          signupRequired={signupRequired}
          onApprove={approve}
          onDeny={deny}
        />
      );
  }
}
