import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * 두 앱과 같은 규칙으로 본다. `eslint-config-next`는 `next` 패키지를 요구하지 않고
 * (peer는 eslint·typescript뿐) react-hooks·jsx-a11y 규칙을 함께 얹어 주므로, 앱에서만 잡히던
 * 것이 패키지로 옮겨 오면서 조용히 검사에서 빠지는 일이 없다.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /*
       * 이 워크스페이스는 Next 앱이 아니라 라우트 디렉터리가 없다 — 켜 두면 린트가 통과하면서
       * "Pages directory cannot be found" 한 줄만 매번 남는다.
       */
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
