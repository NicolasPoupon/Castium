import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier'
import vueParser from 'vue-eslint-parser'
import { defineConfig } from 'eslint/config'

export default defineConfig([
    { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**'] },

    // JS / TS standards
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
            globals: globals.browser,
        },
        plugins: { prettier },
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'prettier/prettier': [
                'warn',
                {
                    singleQuote: true,
                    semi: false,
                    trailingComma: 'es5',
                    printWidth: 100,
                },
            ],
        },
    },

    // Vue standards
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                ecmaVersion: 'latest',
                sourceType: 'module',
                extraFileExtensions: ['.vue'],
            },
            globals: globals.browser,
        },
        plugins: { vue, prettier },
        extends: [vue.configs['flat/recommended'], ...tseslint.configs.recommended],
        rules: {
            'vue/multi-word-component-names': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'vue/html-indent': ['error', 4],
            'vue/singleline-html-element-content-newline': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'prettier/prettier': [
                'warn',
                {
                    singleQuote: true,
                    semi: true,
                    trailingComma: 'es5',
                    printWidth: 100,
                },
            ],
        },
    },

    // Declaration files
    {
        files: ['**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/triple-slash-reference': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
        },
    },
])
