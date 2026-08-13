"use client";

import { useAuditStore } from "@/entities/audit";
import { type Form } from "@/entities/form";
import { useResponseStore } from "@/entities/response";
import { TODAY } from "@/shared/config/constants";

/** 공개 폼 제출 — 비회원 응답 저장 + 감사 로그 기록 */
export function usePublicSubmit() {
  const addResponse = useResponseStore((s) => s.addResponse);
  const appendAudit = useAuditStore((s) => s.append);

  return (form: Form, answers: Record<string, string[] | string>) => {
    const joined: Record<string, string> = {};
    for (const [qid, v] of Object.entries(answers)) {
      const s = Array.isArray(v) ? v.join(", ") : v;
      if (s) joined[qid] = s;
    }

    // 문항 라벨에서 비회원 식별 정보 추론 (원본 규칙)
    const findBy = (re: RegExp) => {
      const q = form.questions.find((x) => re.test(x.label));
      return q ? (joined[q.qid] ?? "") : "";
    };
    const guest = {
      name: findBy(/성명|이름/),
      sid: findBy(/학번/),
      dept: findBy(/학과/),
      phone: findBy(/연락처|전화/),
    };

    addResponse({
      form: form.key,
      member: null,
      status: "SUBMITTED",
      at: `${TODAY} 12:00`,
      answers: joined,
      guest,
    });
    appendAudit({
      target: "폼",
      id: form.id,
      action: "응답접수",
      by: guest.name || "비회원",
      before: "-",
      after: "공개 링크",
      ip: "203.0.113.5",
      at: `${TODAY} 12:00`,
    });
  };
}
