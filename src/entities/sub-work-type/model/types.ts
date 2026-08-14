import type { AutzrRoleCd } from "@/shared/config/codes";

/**
 * table: sub_work_type — 하위_업무_유형
 * 하위 업무의 승인 정책(승인 필요 여부·승인자 역할·정족수·기준 금액)을 결정한다.
 */
export interface SubWorkType {
  /** 식별자N19 · PK */
  subWorkTypeId: number;
  /** 명V100 — 예산지출 · 대외공지 · 내부행사 · 스터디운영 · 문서제출 */
  typeNm: string;
  /** 여부B — 저위험 유형은 승인 면제 */
  aprvNeedYn: boolean;
  /** 코드V20 — 승인 주체 역할. 승인 불필요 시 null */
  autzrRoleCd: AutzrRoleCd | null;
  /** 여부B — 최소 동의 인원 필요 여부 */
  minNeedAgreCntYn: boolean;
  /** 수I10 — 최소 동의 인원 수 */
  minNeedAgreCnt: number | null;
  /** 금액N15 — 위험도 기준 금액(원) */
  crtrAmt: number | null;
  /** 여부B — 금전 집행 여부 */
  expndYn: boolean;
  /** 내용T — 유형별 완료 조건 */
  cmptnChckArtclCn: string | null;
}
