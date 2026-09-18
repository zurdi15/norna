<script setup lang="ts">
import {computed, useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronRight} from '@lucide/vue'

import {cn} from '@/ui/cn'
import UiIcon from '@/ui/UiIcon.vue'

/**
 * The filter syntax at a glance: fields, operators, relative dates and two examples.
 * Every token is a button that inserts it into the query, which beats typing && on a phone.
 */
const props = withDefaults(defineProps<{
	// Inside a project the project field doesn't apply.
	showProject?: boolean
}>(), {
	showProject: true,
})

const emit = defineEmits<{
	insert: [token: string]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const panelId = useId()

type Tone = 'field' | 'operator' | 'logical' | 'value'

const fieldGroups = computed(() => [
	{key: 'dates', tokens: ['dueDate', 'startDate', 'endDate', 'doneAt', 'reminders', 'created', 'updated']},
	{key: 'people', tokens: ['assignees', 'createdBy']},
	{key: 'organize', tokens: props.showProject ? ['labels', 'project'] : ['labels']},
	{key: 'status', tokens: ['done', 'priority', 'percentDone']},
])

const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'in', 'not in', 'like']
const JOINS = ['&&', '||', '(', ')']
const DATES = ['now', 'now+7d', 'now-1w', 'now/d']
const EXAMPLES = [
	{query: 'done = false && dueDate < now+7d', key: 'exampleDueSoon'},
	{query: 'priority >= 4 || labels in urgent', key: 'exampleUrgent'},
]

const TONES: Record<Tone, string> = {
	field: 'text-accent',
	operator: 'text-ink-muted',
	logical: 'text-warning',
	value: 'text-ink',
}

function tokenClass(tone: Tone) {
	return cn(
		`
			inline-flex h-6 cursor-pointer items-center rounded-sm border border-line bg-canvas-subtle px-1.5 font-mono
			text-xs whitespace-nowrap transition-colors duration-150
			hover:border-line-strong hover:bg-surface
			pointer-coarse:h-8 pointer-coarse:px-2 pointer-coarse:text-sm
		`,
		TONES[tone],
	)
}
</script>

<template>
	<div class="grid">
		<button
			type="button"
			:aria-expanded="open"
			:aria-controls="panelId"
			class="
				-ms-1 flex h-7 cursor-pointer items-center gap-1 justify-self-start rounded-sm px-1 text-sm
				text-ink-muted
				hover:text-ink
				pointer-coarse:h-10 pointer-coarse:text-md
			"
			@click="open = !open"
		>
			<UiIcon
				:icon="ChevronRight"
				size="sm"
				:class="cn('transition-transform duration-150', open && 'rotate-90')"
			/>
			{{ t('filters.help.toggle') }}
		</button>

		<!-- Tokens take no focus on mousedown: the caret (and a phone's keyboard) stay in the query. -->
		<div
			v-show="open"
			:id="panelId"
			class="grid gap-3.5 pt-1.5 pb-1"
		>
			<section class="grid gap-1.5">
				<h3 class="caption">
					{{ t('filters.help.fields') }}
				</h3>
				<div
					v-for="group in fieldGroups"
					:key="group.key"
					class="grid grid-cols-[5.5rem_1fr] items-start gap-2"
				>
					<span class="pt-1 text-2xs text-ink-faint pointer-coarse:pt-2">{{ t(`filters.help.groups.${group.key}`) }}</span>
					<div class="flex flex-wrap gap-1">
						<button
							v-for="token in group.tokens"
							:key="token"
							type="button"
							:class="tokenClass('field')"
							:aria-label="t('filters.help.insert', {token})"
							@mousedown.prevent
							@click="emit('insert', token)"
						>
							{{ token }}
						</button>
					</div>
				</div>
			</section>

			<section class="grid gap-1.5">
				<h3 class="caption">
					{{ t('filters.help.operators') }}
				</h3>
				<div class="flex flex-wrap gap-1">
					<button
						v-for="token in OPERATORS"
						:key="token"
						type="button"
						:class="tokenClass('operator')"
						:aria-label="t('filters.help.insert', {token})"
						@mousedown.prevent
						@click="emit('insert', token)"
					>
						{{ token }}
					</button>
				</div>
				<div class="flex flex-wrap gap-1">
					<button
						v-for="token in JOINS"
						:key="token"
						type="button"
						:class="tokenClass('logical')"
						:aria-label="t('filters.help.insert', {token})"
						@mousedown.prevent
						@click="emit('insert', token)"
					>
						{{ token }}
					</button>
				</div>
			</section>

			<section class="grid gap-1.5">
				<h3 class="caption">
					{{ t('filters.help.relativeDates') }}
				</h3>
				<div class="flex flex-wrap gap-1">
					<button
						v-for="token in DATES"
						:key="token"
						type="button"
						:class="tokenClass('value')"
						:aria-label="t('filters.help.insert', {token})"
						@mousedown.prevent
						@click="emit('insert', token)"
					>
						{{ token }}
					</button>
				</div>
				<p class="text-xs text-ink-faint">
					{{ t('filters.help.relativeDatesHint') }}
				</p>
			</section>

			<section class="grid gap-1.5">
				<h3 class="caption">
					{{ t('filters.help.examples') }}
				</h3>
				<dl class="grid gap-2">
					<div
						v-for="example in EXAMPLES"
						:key="example.key"
						class="grid gap-0.5"
					>
						<dt class="font-mono text-xs text-ink pointer-coarse:text-sm">
							{{ example.query }}
						</dt>
						<dd class="text-xs text-ink-faint">
							{{ t(`filters.help.${example.key}`) }}
						</dd>
					</div>
				</dl>
			</section>
		</div>
	</div>
</template>
