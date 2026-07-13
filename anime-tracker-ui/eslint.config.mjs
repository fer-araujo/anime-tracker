import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier/flat";

export default tseslint.config(
  { ignores: [".next/", "node_modules/", "dist/", "next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "error",
    },
  },
  prettierConfig,
);
