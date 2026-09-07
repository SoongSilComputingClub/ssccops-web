"use client";

import { useRef, useState } from "react";
import {
  fetchFormResponseDetails,
  type AnswerColumn,
  type FormResponseItem,
} from "@/entities/response";
import { todayInSeoul } from "@/shared/lib/date";
import { downloadCsv, toCsvText } from "@/shared/lib/download-csv";
import { responseCsvFilename, responseCsvRows } from "./response-csv";

/*
 * 응답을 CSV로 내려받기 (ssccops#223).
 *
 * ── 왜 이펙트가 아니라 함수인가 ──────────────────────────────
 *
 * 내보내기는 화면 상태에서 파생되는 값이 아니라 **누르는 순간 일어나는 일**이다. 이펙트로
 * 짜면 "내보내기 요청됨" 플래그를 세우고 답이 도착하면 파일을 떨어뜨린 뒤 그 플래그를 다시
 * 내려야 하는데, 그 마지막 단계가 이펙트 안의 setState라 이 저장소가 금지한 모양이
 * 된다(react-hooks/set-state-in-effect · `use-response-list.ts` 주석). 눌렀을 때 부르는
 * 비동기 함수로 두면 그 왕복이 통째로 없어진다.
 *
 * ── 왜 표 보기가 이미 받아 둔 답을 쓰지 않는가 ────────────────
 *
 * 두 가지가 걸린다. 표는 `rspnsCn`만 들고 있고 **CSV에는 연락처(`telno`)가 더 필요한데**
 * 그것은 같은 상세 응답의 다른 칸이다 — 표가 쓰는 훅에 연락처를 얹으면 그 훅을 쓰는 모든
 * 화면이 쓰지도 않는 개인정보를 들고 다니게 된다. 그리고 내보내기는 **누른 시점의 서버 상태**를
 * 담는 편이 낫다: 표를 열어 둔 채 다른 검토자가 심사를 마쳤다면 화면의 답보다 방금 받은 답이
 * 맞다.
 *
 * 대가는 표를 열어 둔 상태에서 내보내면 상세를 한 번 더 부른다는 것이다. 폼 규모가 수~수십
 * 건이라 감당할 수 있고, 여러 번 부르는 규칙 자체는 `fetchFormResponseDetails` 한 곳에 있어
 * 서버가 전용 조회를 열면 두 경로가 함께 바뀐다.
 *
 * ── 실패를 대하는 태도가 표와 다르다 ─────────────────────────
 *
 * 표는 한 건이 안 와도 나머지를 그린다 — 빈 칸이 보이고 무엇이 빠졌는지 화면이 말한다.
 * **CSV는 멈춘다.** 내려받은 파일에는 "이 줄은 못 받은 것"이라고 적을 자리가 없고, 빈 칸으로
 * 나가면 그것이 곧 "응답자가 비워 뒀다"로 읽힌다. 파일은 화면과 달리 나중에 혼자 열리므로
 * 그 오해를 바로잡을 사람이 그 자리에 없다.
 */

export type ResponseCsvExportStatus = "idle" | "loading" | "error";

export interface ResponseCsvExportInput {
  formId: number;
  /** 파일 이름에 쓴다 — 없으면 폼 번호로 떨어진다 */
  formTtlNm: string | null | undefined;
  /** 지금 목록에 보이는 응답 (상태 필터가 걸려 있으면 그 결과) */
  responses: readonly FormResponseItem[];
  /** 문항 열 — 순서는 폼이 정한 그대로 */
  columns: readonly AnswerColumn[];
  /** `MEMBER_MANAGE` 보유 여부 — 연락처 열을 넣을지 (표시 경계다 · response-csv.ts 참고) */
  includeTelno: boolean;
  /** 응답 순번 열을 넣을지 — 화면이 `N번째`를 그리는 조건과 같은 값 */
  includeRspnsSeq: boolean;
}

export interface ResponseCsvExport {
  exportCsv: () => void;
  status: ResponseCsvExportStatus;
  /** 상세를 몇 건까지 받았는가 — 수십 건이면 눈에 띄게 걸린다 */
  loadedCount: number;
  total: number;
  errorMessage: string;
}

export function useResponseCsvExport(input: ResponseCsvExportInput): ResponseCsvExport {
  const [status, setStatus] = useState<ResponseCsvExportStatus>("idle");
  const [loadedCount, setLoadedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  /*
   * 진행 중인 내보내기가 있으면 새로 시작하지 않는다. state가 아니라 ref인 것은 같은 렌더
   * 안에서 두 번 눌린 경우까지 막기 위해서다 — setStatus는 다음 렌더에야 반영된다.
   */
  const running = useRef(false);

  const exportCsv = () => {
    if (running.current) return;

    const ids = input.responses.map((r) => r.formRspnsId);
    if (ids.length === 0) {
      setStatus("error");
      setErrorMessage("내보낼 응답이 없습니다.");
      return;
    }

    running.current = true;
    setStatus("loading");
    setLoadedCount(0);
    setErrorMessage("");

    void fetchFormResponseDetails(input.formId, ids, setLoadedCount)
      .then(({ details, failures }) => {
        // 한 건이라도 못 받으면 내보내지 않는다 — 빈 칸이 "비워 뒀다"로 읽힌다
        if (failures > 0) {
          setStatus("error");
          setErrorMessage(
            `${failures}건의 응답 내용을 불러오지 못해 내보내지 않았습니다. 다시 시도해 주세요.`,
          );
          return;
        }

        const rows = responseCsvRows({
          responses: input.responses,
          columns: input.columns,
          details,
          includeTelno: input.includeTelno,
          includeRspnsSeq: input.includeRspnsSeq,
        });
        downloadCsv(
          responseCsvFilename(input.formId, input.formTtlNm, todayInSeoul()),
          toCsvText(rows),
        );
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("응답 내용을 불러오지 못했습니다.");
      })
      .finally(() => {
        running.current = false;
      });
  };

  return {
    exportCsv,
    status,
    loadedCount,
    total: input.responses.length,
    errorMessage,
  };
}
