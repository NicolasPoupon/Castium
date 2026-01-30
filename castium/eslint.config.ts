import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import vue from "eslint-plugin-vue"
import prettier from "eslint-plugin-prettier"
import vueParser from "vue-eslint-parser"
import { defineConfig } from "eslint/config"

const prettierOptions = {
    singleQuote: true,
    semi: false,
    trailingComma: "es5",
    printWidth: 100,
}

export default defineConfig([
    {
        ignores: ["node_modules/**", ".nuxt/**", ".output/**", "dist/**"],
    },

    // JS / TS
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: globals.browser,
        },
        plugins: { prettier },
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "prettier/prettier": ["warn", prettierOptions],
        },
    },

    // Vue
    {
        files: ["**/*.vue"],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                ecmaVersion: "latest",
                sourceType: "module",
                extraFileExtensions: [".vue"],
            },
            globals: globals.browser,
        },
        plugins: { vue, prettier },
        extends: [
            vue.configs["flat/recommended"],
            ...tseslint.configs.recommended,
        ],
        rules: {
            "vue/multi-word-component-names": "off",
            "@typescript-eslint/no-explicit-any": "off",

            // Let Prettier handle formatting
            "vue/html-indent": "off",
            "vue/max-attributes-per-line": "off",
            "vue/html-self-closing": "off",
            "vue/singleline-html-element-content-newline": "off",
            "vue/multiline-html-element-content-newline": "off",

            "prettier/prettier": ["warn", prettierOptions],
        },
    },

    // .d.ts files
    {
        files: ["**/*.d.ts"],
        rules: {
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/triple-slash-reference": "off",
            "@typescript-eslint/ban-ts-comment": "off",
        },
    },
])
