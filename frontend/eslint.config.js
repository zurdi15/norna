import pluginVue from 'eslint-plugin-vue'
import js from '@eslint/js'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginDepend from 'eslint-plugin-depend'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import iconButtonAccessibleName from './eslint-rules/icon-button-accessible-name.js'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default [
	js.configs.recommended,
	...pluginVue.configs['flat/recommended'],
	...vueTsEslintConfig(),
	pluginDepend.configs['flat/recommended'],
	{
		ignores: [
			'**/*.test.ts',
			'src/client/generated/**',
		],
	},
	{
		plugins: {
			vikunja: {
				rules: {
					'icon-button-accessible-name': iconButtonAccessibleName,
				},
			},
		},
		rules: {
			'vikunja/icon-button-accessible-name': 'error',

			'quotes': ['error', 'single'],
			'comma-dangle': ['error', 'always-multiline'],
			'semi': ['error', 'never'],
			'indent': ['error', 'tab', { 'SwitchCase': 1 }],

			'vue/v-on-event-hyphenation': ['warn', 'never', {'autofix': true}],
			'vue/multi-word-component-names': ['error', {
				ignores: ['index'],
			}],

			// uncategorized rules:
			'vue/component-api-style': ['error', ['script-setup']],
			'vue/component-name-in-template-casing': ['error', 'PascalCase', {
				'globals': ['RouterView', 'RouterLink'],
			}],
			'vue/custom-event-name-casing': ['error', 'camelCase'],
			'vue/define-macros-order': 'error',
			'vue/match-component-file-name': ['error', {
				'extensions': ['.js', '.jsx', '.ts', '.tsx', '.vue'],
				'shouldMatchCase': true,
			}],
			'vue/match-component-import-name': 'error',
			'vue/prefer-separate-static-class': 'warn',

			'vue/padding-line-between-blocks': 'error',
			'vue/next-tick-style': ['error', 'promise'],
			'vue/block-lang': [
				'error',
				{'script': {'lang': 'ts'}},
			],
			'vue/no-duplicate-attr-inheritance': 'error',
			'vue/no-empty-component-block': 'error',
			'vue/html-indent': ['error', 'tab'],

			// vue3
			'vue/no-ref-object-reactivity-loss': 'error',
			'vue/no-setup-props-reactivity-loss': 'error',

			'depend/ban-dependencies': 'warn',

			'no-restricted-syntax': ['error', {
				selector: 'ForInStatement',
				message: 'Use for...of with Object.keys/entries, or .forEach, instead of for...in. See https://github.com/go-vikunja/vikunja/issues/513',
			}],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					// 'args': 'all',
					// 'argsIgnorePattern': '^_',
					'caughtErrors': 'all',
					'caughtErrorsIgnorePattern': '^_',
					// 'destructuredArrayIgnorePattern': '^_',
					'varsIgnorePattern': '^_',
					'ignoreRestSiblings': true,
				},
			],
		},

		// files: ['*.vue', '**/*.vue'],
		languageOptions: {
			parserOptions: {
				parser: '@typescript-eslint/parser',
				ecmaVersion: 'latest',
				tsconfigRootDir: __dirname,
			},
		},


	},
	{
		...betterTailwindcss.configs.recommended,
		files: ['src/**/*.vue', 'src/**/*.ts'],
		settings: {
			'better-tailwindcss': {
				entryPoint: 'src/styles/main.css',
			},
		},
		rules: {
			...betterTailwindcss.configs.recommended.rules,
			'better-tailwindcss/enforce-consistent-line-wrapping': ['warn', {
				indent: 'tab',
				tabWidth: 4,
				printWidth: 120,
				preferSingleLine: true,
			}],
			// Colors only come from tokens: no palette escapes like bg-[#fff] or text-[oklch(...)].
			'better-tailwindcss/no-restricted-classes': ['error', {
				restrict: [{
					pattern: '^(.*:)?(bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|shadow|accent|caret|divide|placeholder)-\\[(#|rgb|hsl|oklch|oklab|lab|lch|color)',
					message: 'Use a color token from src/styles/tokens.css instead of an arbitrary color.',
				}],
			}],
		},
	},
]
