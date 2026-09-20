"use client";

import { useRef, useState } from "react";
import { fetchEventParticipants } from "@/entities/event";
import type { PtcpSttsCd } from "@/shared/config/codes";
import { todayInSeoul } from "@/shared/lib/date";
import { downloadCsv, toCsvText } from "@/shared/lib/download-csv";
import { toEventErrorMessage } from "./event-error";
import { participantCsvFilename, participantCsvRows } from "./participant-csv";

/*
 * 참가자 명단 CSV 내려받기 (#545 · ssccops#409).
 *
 * 응답 CSV(`use-response-csv-export.ts`)와 같은 판단 둘 — 이펙트가 아니라 **누르는 순간의 함수**이고,
 * 화면이 들고 있는 명단이 아니라 **누른 시점에 다시 조회한** 명단을 담는다(표를 열어 둔 사이 다른
 * 운영자가 확정·취소했을 수 있다). 지금 켜 둔 상태 필터를 그대로 넘긴다 — «확정만» 보고 있으면
 * 확정만 내려받는 것이 사용자가 기대하는 것이다.
 */

export type ParticipantCsvExportStatus = "idle" | "loading" | "error";

export function useParticipantCsvExport(input: {
  eventId: number;
  eventTtl: string;
  ptcpSttsCd: PtcpSttsCd | null;
}): { exportCsv: () => void; status: ParticipantCsvExportStatus; errorMessage: string } {
  const [status, setStatus] = useState<ParticipantCsvExportStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const running = useRef(false);

  const exportCsv = () => {
    if (running.current) return;
    running.current = true;
    setStatus("loading");
    setErrorMessage("");
    fetchEventParticipants(input.eventId, input.ptcpSttsCd)
      .then((participants) => {
        downloadCsv(
          participantCsvFilename(input.eventTtl, todayInSeoul()),
          toCsvText(participantCsvRows(participants)),
        );
        setStatus("idle");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(toEventErrorMessage(error));
      })
      .finally(() => {
        running.current = false;
      });
  };

  return { exportCsv, status, errorMessage };
}
