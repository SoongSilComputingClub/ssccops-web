"use client";

import { useEffect, useState } from "react";
import { fetchForms, type FormSummary } from "@/entities/form";

/*
 * 행사 편집기의 폼 연결 후보 (#136 · D11 전속 연결).
 *
 * 폼 목록은 entities/form에서 온다 — 행사와 폼 두 엔티티를 함께 다루는 로직이라 features에
 * 둔다(FSD: 같은 레이어의 features/form을 참조할 수는 없다). **어느 폼이 이미 다른 행사에
 * 전속됐는지는 목록 응답이 말해 주지 않는다** — 후보를 거르지 않고 전부 싣고, 겹치면 서버가
 * 저장 시점에 409 FORM_ALREADY_LINKED로 판정한다(화면이 들고 있는 목록은 낡을 수 있다).
 *
 * 실패해도 편집 화면을 막지 않는다 — 폼 연결 없이도 행사는 저장할 수 있어야 한다(공지형).
 */

export interface FormLinkOptions {
  forms: FormSummary[];
  loading: boolean;
  /** 비어 있으면 정상 — 폼 연결 칸에만 조용히 표시한다 */
  errorMessage: string;
}

export function useFormLinkOptions(): FormLinkOptions {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let alive = true;

    fetchForms()
      .then((next) => {
        if (alive) setForms(next);
      })
      .catch(() => {
        if (alive) {
          setErrorMessage(
            "폼 목록을 불러오지 못해 폼 연결을 바꿀 수 없습니다 — 폼 조회(FORM_READ) 권한과 서버 상태를 확인해주세요",
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { forms, loading, errorMessage };
}
