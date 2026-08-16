"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkMemberImportFile,
  executeMemberImport,
  MEMBER_IMPORT_ERROR,
  MEMBER_IMPORT_FIELDS,
  memberImportFieldLabel,
  previewMemberImport,
  validateMemberImport,
  type MemberImportExecution,
  type MemberImportMapping,
  type MemberImportPreview,
  type MemberImportValidation,
} from "@/entities/member";
import { syncSessionOnForbidden } from "@/entities/session";
import { ApiError } from "@/shared/lib/api/client";
import {
  toMemberImportErrorMessage,
  toMemberImportExecuteErrorMessage,
} from "./import-error";

/*
 * CSV 회원 이관 위저드 (#57 · 서버 #84·#85).
 *
 * ── 시뮬레이션을 걷어낸 자리다 ──────────────────────────────────
 * 예전에는 파일 선택 영역을 누르면 `setFile("SSCC_회원명부_2026.csv (128행)")`라는 문자열이
 * 박혔고, 검증 통계 `128 · 119 · 6 · 3`도 오류 4건도 결과 3건도 전부 상수였다. 운영 도구에
 * 그렇게 열려 있으면 사람은 이관을 마쳤다고 믿는다 — 실제로는 mbr에 한 행도 들어가지 않은
 * 채로. 네 단계 구조와 컬럼 안내표는 그대로 두고 각 단계를 서버에 연결했다.
 *
 * ── 상태 하나에 단계 하나 ───────────────────────────────────────
 * `preview`·`validation`·`execution`이 각각 2·3·4단계를 여는 열쇠다. 앞 단계의 입력이 바뀌면
 * 뒤 단계의 결과를 **버린다** — 매핑을 고친 뒤에도 옛 검증 결과가 남아 있으면, 운영자는 고치기
 * 전의 통계를 보고 실행 버튼을 누르게 된다. 서버도 같은 사고를 fileToken으로 한 번 더 막는다.
 *
 * ── 훅 하나에 네 단계를 모두 두는 이유 ─────────────────────────
 * 단계마다 훅을 나누면 "매핑이 바뀌면 검증 결과를 버린다" 같은 규칙이 화면 컴포넌트로 올라간다.
 * 그 규칙은 화면이 잊어도 조용히 어긋날 뿐 아무도 오류를 보지 못하므로, 상태를 한 자리에 둔다.
 */

export type MemberImportStep = 1 | 2 | 3 | 4;

export interface MemberImportWizard {
  step: MemberImportStep;
  /** 한 단계 뒤로. 실행 중이거나 결과 화면(4단계)에서는 아무 일도 하지 않는다 */
  goBack: () => void;

  /* 1단계 — 파일 선택 */
  file: File | null;
  preview: MemberImportPreview | null;
  previewing: boolean;
  /** 클라이언트 사전 검사(크기·확장자)와 서버 미리보기 실패를 같은 자리에 띄운다 */
  fileErrorMessage: string;
  selectFile: (file: File) => void;
  clearFile: () => void;
  /** 미리보기를 받은 뒤에만 2단계로 넘어간다 */
  goToMapping: () => void;

  /* 2단계 — 컬럼 매핑 */
  mapping: MemberImportMapping;
  mapHeader: (header: string, fieldKey: string) => void;
  /** 서버가 400으로 거절할 매핑을 미리 잡아 둔 한 줄. 비어 있으면 검증할 수 있다 */
  mappingProblem: string;
  validating: boolean;
  validationErrorMessage: string;
  runValidation: () => void;

  /* 3단계 — 사전 검증 */
  validation: MemberImportValidation | null;
  executing: boolean;
  executionErrorMessage: string;
  runExecution: () => void;

  /* 4단계 — 이관 실행 결과 */
  execution: MemberImportExecution | null;
}

/** 매핑되지 않으면 서버가 요청 전체를 400으로 거절하는 필드 (mbrNm · mbrGrdCd · mbrSttsCd) */
const REQUIRED_FIELDS = MEMBER_IMPORT_FIELDS.filter((f) => f.mappingRequired);

/**
 * 서버가 400 `CSV_MAPPING_INVALID`로 거절할 매핑인지 화면에서 먼저 본다.
 *
 * 왕복을 아끼려는 것이 아니라 **무엇이 문제인지 말해 주기 위해서다.** 서버 응답에는 세 가지
 * 원인(필수 누락·중복 배정·없는 헤더) 중 어느 것인지가 실리지 않아, 그대로 보내면 운영자는
 * 열 몇 개의 선택 상자를 처음부터 훑어야 한다. 판정 근거는 여전히 서버이며 여기서 통과한
 * 매핑이 거절될 수는 있다(그 반대는 없다).
 */
function findMappingProblem(mapping: MemberImportMapping): string {
  const missing = REQUIRED_FIELDS.filter(
    (field) => !Object.values(mapping).includes(field.key),
  );
  if (missing.length > 0) {
    const names = missing.map((f) => f.label).join(" · ");
    return `${names} 컬럼을 반드시 지정해야 합니다 — 이 셋은 서버가 대신 정할 수 없습니다`;
  }

  /* 한 필드에 두 컬럼이면 어느 쪽을 쓸지 서버가 고를 근거가 없어 요청 전체가 거절된다 */
  const seen = new Set<string>();
  for (const fieldKey of Object.values(mapping)) {
    if (!fieldKey) continue;
    if (seen.has(fieldKey)) {
      return `'${memberImportFieldLabel(fieldKey)}'에 두 개의 컬럼이 지정됐습니다 — 하나만 남겨주세요`;
    }
    seen.add(fieldKey);
  }
  return "";
}

/** 미리보기가 준 헤더 전량에 추천값을 채운 매핑 — 고르지 않은 헤더도 항목을 갖는다 */
function initialMapping(preview: MemberImportPreview): MemberImportMapping {
  const next: MemberImportMapping = {};
  for (const header of preview.headers) {
    /*
     * 같은 헤더가 두 번 나오는 파일에서는 항목도 하나다. 서버가 헤더 이름으로 컬럼을 찾을 때
     * 첫 번째를 쓰므로(`MemberImportMapping.of`), 화면에 두 줄을 그려 봐야 뒤엣것은 매핑할
     * 길이 없다 — 대신 2단계가 그 사실을 안내로 밝힌다.
     */
    if (next[header] === undefined) {
      next[header] = preview.recommendedMapping[header] ?? "";
    }
  }
  return next;
}

export function useMemberImport(): MemberImportWizard {
  const [step, setStep] = useState<MemberImportStep>(1);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MemberImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [fileErrorMessage, setFileErrorMessage] = useState("");

  const [mapping, setMapping] = useState<MemberImportMapping>({});

  const [validation, setValidation] = useState<MemberImportValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState("");

  const [execution, setExecution] = useState<MemberImportExecution | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionErrorMessage, setExecutionErrorMessage] = useState("");

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /*
   * 같은 틱에 두 번 눌린 버튼은 그 사이에 렌더가 없어 `validating`·`executing`이 아직 갱신되지
   * 않는다. 검증이 두 번 나가는 것은 낭비로 끝나지만 **실행이 두 번 나가면 명부에 회원이 두 벌
   * 생긴다** — 학번이 있는 행은 두 번째 요청에서 SKIPPED가 되지만 학번이 없는 졸업 회원 행은
   * 중복 판정 근거가 없어 그대로 또 들어간다(서버 `reimportDuplicatesCount`가 세는 행들이다).
   */
  const busyRef = useRef(false);

  /**
   * 실행 중 창을 닫거나 새로고침하지 못하게 막는다.
   *
   * 요청이 나간 뒤 브라우저를 닫아도 서버의 등록은 계속된다 — 막는 것은 취소를 위해서가 아니라
   * **결과를 보게 하기 위해서다.** 어느 행이 들어갔고 어느 행이 실패했는지는 이 응답에만 있고,
   * 되돌릴 수 없는 조작이라 다시 실행해 확인할 수도 없다.
   */
  useEffect(() => {
    if (!executing) return;

    const block = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", block);
    return () => window.removeEventListener("beforeunload", block);
  }, [executing]);

  /** 뒤 단계의 결과를 버린다 — 앞 단계의 입력이 바뀌면 그 결과는 이미 낡았다 */
  const dropValidation = useCallback(() => {
    setValidation(null);
    setValidationErrorMessage("");
    setExecutionErrorMessage("");
  }, []);

  const selectFile = useCallback(
    (next: File) => {
      if (busyRef.current) return;

      const rejected = checkMemberImportFile(next);
      if (rejected) {
        /* 고른 파일을 남겨 두지 않는다 — 거절된 파일이 이름만 남아 있으면 올라간 줄 안다 */
        setFile(null);
        setPreview(null);
        setMapping({});
        dropValidation();
        setFileErrorMessage(rejected);
        return;
      }

      setFile(next);
      setPreview(null);
      setMapping({});
      dropValidation();
      setFileErrorMessage("");
      setPreviewing(true);

      /*
       * 파일을 고른 자리에서 바로 미리보기를 부른다. '다음' 버튼까지 기다렸다 부르면, CSV로
       * 읽을 수 없는 파일이라는 사실을 운영자는 한 단계 넘어가려는 순간에야 알게 된다.
       * 이 호출이 파일 내용에 대한 첫 판정이며 판정은 전부 서버가 한다.
       */
      previewMemberImport(next)
        .then((result) => {
          if (!aliveRef.current) return;
          setPreview(result);
          setMapping(initialMapping(result));
        })
        .catch((error: unknown) => {
          syncSessionOnForbidden(error);
          if (!aliveRef.current) return;
          setFile(null);
          setFileErrorMessage(toMemberImportErrorMessage(error));
        })
        .finally(() => {
          if (aliveRef.current) setPreviewing(false);
        });
    },
    [dropValidation],
  );

  const clearFile = useCallback(() => {
    if (busyRef.current) return;
    setFile(null);
    setPreview(null);
    setMapping({});
    dropValidation();
    setFileErrorMessage("");
    setStep(1);
  }, [dropValidation]);

  const goToMapping = useCallback(() => {
    if (preview) setStep(2);
  }, [preview]);

  const mapHeader = useCallback(
    (header: string, fieldKey: string) => {
      setMapping((current) => ({ ...current, [header]: fieldKey }));
      /* 매핑이 바뀌면 옛 검증 결과는 다른 매핑으로 만든 통계다 */
      dropValidation();
    },
    [dropValidation],
  );

  const mappingProblem = useMemo(() => findMappingProblem(mapping), [mapping]);

  const runValidation = useCallback(() => {
    if (busyRef.current || !file || mappingProblem) return;

    busyRef.current = true;
    setValidating(true);
    setValidationErrorMessage("");

    validateMemberImport(file, mapping)
      .then((result) => {
        if (!aliveRef.current) return;
        setValidation(result);
        setStep(3);
      })
      .catch((error: unknown) => {
        syncSessionOnForbidden(error);
        if (aliveRef.current) setValidationErrorMessage(toMemberImportErrorMessage(error));
      })
      .finally(() => {
        busyRef.current = false;
        if (aliveRef.current) setValidating(false);
      });
  }, [file, mapping, mappingProblem]);

  const runExecution = useCallback(() => {
    if (busyRef.current || !file || !validation) return;

    busyRef.current = true;
    setExecuting(true);
    setExecutionErrorMessage("");

    executeMemberImport(file, mapping, validation.fileToken)
      .then((result) => {
        if (!aliveRef.current) return;
        setExecution(result);
        setStep(4);
      })
      .catch((error: unknown) => {
        syncSessionOnForbidden(error);
        if (!aliveRef.current) return;

        /*
         * 409면 검증한 파일과 올린 파일이 다르다 — 서버는 한 행도 등록하지 않았다. 검증 결과를
         * 버려 3단계가 "다시 검증" 상태로 돌아가게 한다. 낡은 통계를 남겨 두면 같은 실행 버튼이
         * 그 자리에 그대로 있어, 운영자는 원인을 모른 채 같은 요청을 반복하게 된다.
         */
        if (
          error instanceof ApiError &&
          error.code === MEMBER_IMPORT_ERROR.IMPORT_FILE_MISMATCH
        ) {
          setValidation(null);
        }
        setExecutionErrorMessage(toMemberImportExecuteErrorMessage(error));
      })
      .finally(() => {
        busyRef.current = false;
        if (aliveRef.current) setExecuting(false);
      });
  }, [file, mapping, validation]);

  /*
   * 4단계에서는 뒤로 갈 수 없다. 이미 명부에 행이 생겼으므로 되돌아간 화면의 '이관 실행'은
   * 같은 파일을 한 번 더 넣는 버튼이 된다.
   */
  const goBack = useCallback(() => {
    if (busyRef.current || validating || executing) return;
    setStep((current) => (current === 2 || current === 3 ? ((current - 1) as MemberImportStep) : current));
  }, [validating, executing]);

  return {
    step,
    goBack,

    file,
    preview,
    previewing,
    fileErrorMessage,
    selectFile,
    clearFile,
    goToMapping,

    mapping,
    mapHeader,
    mappingProblem,
    validating,
    validationErrorMessage,
    runValidation,

    validation,
    executing,
    executionErrorMessage,
    runExecution,

    execution,
  };
}
