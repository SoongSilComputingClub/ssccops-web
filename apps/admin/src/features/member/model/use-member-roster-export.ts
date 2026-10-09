"use client";

import { useRef, useState } from "react";
import {
  exportMemberRoster,
  type MemberStatusOption,
  type RosterPositionNotation,
  type RosterSemester,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import type { MbrSttsCd } from "@/shared/config/codes";
import { todayInSeoul } from "@/shared/lib/date";
import { downloadBlob } from "@/shared/lib/download-blob";
import { isRosterPresidentMissing, toMemberRosterExportErrorMessage } from "./roster-export-error";
import { useMemberCodes } from "./use-member-codes";

/*
 * 회원명부 내려받기 화면의 상태 (#785 · 서버 #674 · 상위 ssccops#598).
 *
 * 화면이 받는 것은 연도·학기와 옵션 둘(포함할 상태 · 직책 표기법)뿐이고 나머지는 서버가 정한다.
 * 내려받기는 이펙트가 아니라 **누르는 순간의 함수**다 — 응답 CSV·참가자 명단 CSV와 같다.
 */

/** 기본으로 체크해 두는 상태 — 재학만 (Story 결정) */
const DEFAULT_STATUSES: readonly MbrSttsCd[] = ["ENROLLED"];

/** 기본 직책 표기법 — 연합회 제출용이 이 화면의 본래 쓰임이다 */
const DEFAULT_NOTATION: RosterPositionNotation = "FEDERATION";

/*
 * 응답에서 파일 이름을 읽지 못했을 때만 쓰는 이름이다.
 *
 * 서버가 정하는 제목·파일 이름(«2026년도_학술분과_SSCC_2학기_동아리회원명부.xlsx»)을 화면이 흉내
 * 내지 않는다 — 흉내 내면 규칙이 두 벌이 된다. 이 이름이 쓰이는 것은 서버가 CORS로
 * `Content-Disposition`을 노출하지 않는 배포(사이에 낀 프록시 등)뿐이고, 그때도 파일은 저장돼야 한다.
 */
const FALLBACK_FILENAME = "회원명부.xlsx";

/**
 * 오늘 → 기본 연도·학기. 1~6월은 1학기, 7~12월은 2학기다.
 *
 * 명부는 학기 초에 낸다. 그래서 방학은 **다가오는** 학기로 본다 — 1·2월은 그해 1학기, 7·8월은
 * 2학기다. 서버에는 학기 개념이 없어(기수도 연 단위다) 이 값은 제목과 파일 이름에만 쓰인다.
 */
export function defaultRosterTerm(today: string): { year: number; semester: RosterSemester } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return { year, semester: month <= 6 ? 1 : 2 };
}

export type MemberRosterExportStatus = "idle" | "loading" | "error";

export interface MemberRosterExport {
  year: number;
  setYear: (year: number) => void;
  /**
   * 고를 수 있는 연도 — 올해 앞뒤 한 해씩.
   *
   * 명단은 언제나 **오늘** 기준이고 연도는 제목에만 들어간다. 먼 연도를 고르면 오늘 명단에 그
   * 해의 제목이 붙은 파일이 나오므로 선택지를 좁혀 둔다. 1·2월에 지난해 2학기 명부를 내는
   * 경우가 있어 지난해를 둔다.
   */
  yearOptions: readonly number[];
  semester: RosterSemester;
  setSemester: (semester: RosterSemester) => void;

  /** 상태 선택지 — `GET /v1/member-statuses` 그대로(서버 순서) */
  statuses: MemberStatusOption[];
  statusesLoading: boolean;
  /** 상태 목록을 받지 못했다 — 선택지가 없어 내려받기를 잠근다 */
  statusesFailed: boolean;
  isStatusChecked: (code: MbrSttsCd) => boolean;
  toggleStatus: (code: MbrSttsCd) => void;
  /** 고른 상태가 하나도 없다 — 버튼을 잠그고 사유를 체크박스 아래에 적는다 */
  noStatusChosen: boolean;

  notation: RosterPositionNotation;
  setNotation: (notation: RosterPositionNotation) => void;

  /** 버튼을 잠근 사유 — 잠겨 있지 않으면 null */
  blockReason: string | null;
  status: MemberRosterExportStatus;
  errorMessage: string;
  /** 회장이 없어 거절됐다 — 화면이 역할 관리 링크를 함께 둔다 */
  presidentMissing: boolean;
  download: () => void;
}

export function useMemberRosterExport(): MemberRosterExport {
  const codes = useMemberCodes();

  /*
   * 오늘 날짜를 초깃값으로 바로 잡는다. 이 화면은 `AuthGate` 안이라 서버 렌더 HTML에 실리지
   * 않으므로(세션이 준비된 뒤 브라우저에서 처음 그려진다) 빌드 시각과 어긋날 일이 없다.
   */
  const [initialTerm] = useState(() => defaultRosterTerm(todayInSeoul()));
  const [year, setYear] = useState(initialTerm.year);
  const [semester, setSemester] = useState<RosterSemester>(initialTerm.semester);
  const [checked, setChecked] = useState<ReadonlySet<MbrSttsCd>>(() => new Set(DEFAULT_STATUSES));
  const [notation, setNotation] = useState<RosterPositionNotation>(DEFAULT_NOTATION);

  const [status, setStatus] = useState<MemberRosterExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [presidentMissing, setPresidentMissing] = useState(false);
  const running = useRef(false);

  const yearOptions = [initialTerm.year - 1, initialTerm.year, initialTerm.year + 1];

  /*
   * 보낼 상태는 **선택지에 있는 것만, 서버 순서로** 고른다. 체크 상태에만 있고 선택지에 없는
   * 코드(기본값 `ENROLLED`가 기준 코드에서 빠진 경우)를 보내면 화면에 보이지 않는 조건으로
   * 내려받게 된다.
   */
  const chosen = codes.statuses.filter((s) => checked.has(s.code)).map((s) => s.code);
  const statusesFailed = !codes.loading && codes.statuses.length === 0;
  const noStatusChosen = !codes.loading && !statusesFailed && chosen.length === 0;

  let blockReason: string | null = null;
  if (codes.loading) blockReason = "회원 상태 목록을 불러오는 중입니다";
  else if (statusesFailed) blockReason = "회원 상태 목록을 불러오지 못했습니다 — 새로고침해주세요";
  else if (noStatusChosen) blockReason = "포함할 회원 상태를 하나 이상 골라주세요";

  const toggleStatus = (code: MbrSttsCd) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const download = () => {
    if (running.current || blockReason) return;
    running.current = true;
    setStatus("loading");
    setErrorMessage("");
    setPresidentMissing(false);

    exportMemberRoster({ year, semester, mbrSttsCds: chosen, positionNotation: notation })
      .then(({ blob, filename }) => {
        downloadBlob(filename ?? FALLBACK_FILENAME, blob);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        // 화면이 허용된 줄 알고 보낸 요청이 403이면 권한이 방금 회수된 것이다 — 세션을 맞춘다
        syncSessionOnForbidden(error);
        setStatus("error");
        setErrorMessage(toMemberRosterExportErrorMessage(error));
        setPresidentMissing(isRosterPresidentMissing(error));
      })
      .finally(() => {
        running.current = false;
      });
  };

  return {
    year,
    setYear,
    yearOptions,
    semester,
    setSemester,
    statuses: codes.statuses,
    statusesLoading: codes.loading,
    statusesFailed,
    isStatusChecked: (code) => checked.has(code),
    toggleStatus,
    noStatusChosen,
    notation,
    setNotation,
    blockReason,
    status,
    errorMessage,
    presidentMissing,
    download,
  };
}
