export { PublicFormPage } from "./ui/public-form-page";
export { PublicFormDonePage } from "./ui/public-form-done-page";
/*
 * 기획안 화면(#163)은 공개 폼 응답자 화면을 그대로 쓰는 진입점이라 같은 슬라이스에 산다 —
 * 다른 뷰 슬라이스에 두면 `PublicFormPage`를 같은 레이어에서 참조하게 된다(FSD가 막는다).
 * 근거는 ui/proposal-new-page.tsx 머리말.
 */
export { ProposalNewPage } from "./ui/proposal-new-page";
export { ProposalListPage } from "./ui/proposal-list-page";
