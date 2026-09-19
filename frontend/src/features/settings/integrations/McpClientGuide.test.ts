import {afterEach, describe, expect, it, vi} from 'vitest'
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils'
import {createI18n} from 'vue-i18n'

import en from '@/i18n/lang/en.json'

import McpClientGuide from './McpClientGuide.vue'

const copy = vi.fn()
vi.mock('@/composables/useCopyToClipboard', async () => {
	const {ref} = await import('vue')
	return {
		useCopyToClipboard: () => copy,
		useCopyFeedback: () => ({copied: ref(false), copy}),
	}
})

enableAutoUnmount(afterEach)

const endpoint = 'https://tasks.example.com/api/v2/mcp'
const token = 'tk_test_secret'

function mountGuide() {
	return mount(McpClientGuide, {
		props: {endpoint, token},
		global: {
			plugins: [createI18n({legacy: false, locale: 'en', messages: {en}})],
			stubs: {
				UiIconButton: {props: ['label'], emits: ['click'], template: '<button type="button" :aria-label="label" @click="$emit(\'click\')" />'},
				UiSelect: {
					props: ['modelValue', 'items'],
					emits: ['update:modelValue'],
					template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
				},
			},
		},
	})
}

afterEach(() => {
	localStorage.clear()
	copy.mockClear()
})

describe('McpClientGuide', () => {
	it('shows no steps until a client is chosen', () => {
		const wrapper = mountGuide()
		expect(wrapper.find('ol').exists()).toBe(false)
		expect(wrapper.text()).not.toContain(token)
	})

	it.each(['claudeCode', 'codex', 'claudeDesktop', 'mistral', 'other'])('copies the endpoint and token for %s and remembers only the client', async client => {
		let wrapper = mountGuide()
		await wrapper.get('select').setValue(client)
		await flushPromises()
		for (const button of wrapper.findAll('button')) {
			await button.trigger('click')
		}
		await flushPromises()
		const copied = copy.mock.calls.map(([value]) => value).join('\n')
		expect(copied).toContain(endpoint)
		expect(copied).toContain(token)
		if (client === 'claudeDesktop') {
			expect(copy).toHaveBeenCalledWith(`Bearer ${token}`)
		}
		expect(JSON.stringify(localStorage)).not.toContain(token)

		wrapper.unmount()
		wrapper = mountGuide()
		expect((wrapper.get('select').element as HTMLSelectElement).value).toBe(client)
	})

	it('explains why ChatGPT can\'t use the token, without offering it', async () => {
		const wrapper = mountGuide()
		await wrapper.get('select').setValue('chatgpt')
		expect(wrapper.text()).toContain('OAuth')
		expect(wrapper.find('ol').exists()).toBe(false)
		expect(wrapper.find('button').exists()).toBe(false)
	})
})
