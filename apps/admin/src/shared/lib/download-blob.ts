/**
 * `Blob`을 파일로 내려받게 한다 — 객체 URL을 만들어 `<a download>`를 누른다.
 *
 * 화면이 만든 CSV(`downloadCsv`)와 서버가 만든 파일(회원명부 xlsx · #785)이 함께 쓴다. 서버 파일을
 * 주소로 바로 열지 않고 여기를 거치는 것은 인증이 Bearer 헤더라 `<a href>`에 실을 수 없어서다
 * (`apiFetchFile` 주석).
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
