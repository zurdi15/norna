<script setup lang="ts">
import {computed, ref, useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {ChevronDown, Search} from '@lucide/vue'

import type {TokenPermissions} from '@/client/queries/apiTokens'
import {matchesSearch} from '@/ui/search'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiChip from '@/ui/UiChip.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import {countPermissions, expandPreset, mergePermissions, restrictToRoutes, samePermissions, type TokenPreset} from './tokenPermissions'

/**
 * Picks what a token may do, grouped by resource: a checkbox per group selects all of
 * it, a search narrows the long list down, presets fill it in one go. Locked
 * permissions stay picked.
 */
const props = withDefaults(defineProps<{
	routes: TokenPermissions
	locked?: TokenPermissions
	presets?: TokenPreset[]
	loading?: boolean
}>(), {
	locked: () => ({}),
	presets: () => [],
	loading: false,
})

const model = defineModel<TokenPermissions>({required: true})

const {t} = useI18n()
const baseId = useId()

const query = ref('')
const expanded = ref(new Set<string>())

// Underscores read as spaces, so "tasks com" finds tasks_comments.
function matches(name: string) {
	return matchesSearch(name, query.value) || matchesSearch(name.replaceAll('_', ' '), query.value)
}

const groups = computed(() => Object.entries(props.routes).flatMap(([group, permissions]) => {
	const shown = matches(group) ? permissions : permissions.filter(matches)
	return shown.length ? [{group, permissions: shown, total: permissions.length}] : []
}))

const searching = computed(() => query.value.trim() !== '')
const isOpen = (group: string) => searching.value || expanded.value.has(group)

function toggleOpen(group: string) {
	const next = new Set(expanded.value)
	if (!next.delete(group)) {
		next.add(group)
	}
	expanded.value = next
}

function commit(next: TokenPermissions) {
	model.value = restrictToRoutes(mergePermissions(next, props.locked), props.routes)
}

const isLocked = (group: string, permission: string) => props.locked[group]?.includes(permission) ?? false
const isGroupLocked = (group: string) => (props.routes[group] ?? []).every(permission => isLocked(group, permission))
const pickedIn = (group: string) => model.value[group]?.length ?? 0

function groupState(group: string, total: number): boolean | 'indeterminate' {
	const picked = pickedIn(group)
	return picked === 0 ? false : picked >= total ? true : 'indeterminate'
}

function setGroup(group: string, checked: boolean | 'indeterminate') {
	commit({...model.value, [group]: checked === true ? [...props.routes[group] ?? []] : []})
}

function setPermission(group: string, permission: string, checked: boolean | 'indeterminate') {
	const current = model.value[group] ?? []
	commit({...model.value, [group]: checked === true ? [...current, permission] : current.filter(picked => picked !== permission)})
}

const presetSelections = computed(() => props.presets.map(preset => ({
	...preset,
	permissions: restrictToRoutes(mergePermissions(expandPreset(preset.groups, props.routes), props.locked), props.routes),
})))

const total = computed(() => countPermissions(model.value))
</script>

<template>
	<div class="grid gap-3">
		<div
			v-if="presets.length"
			class="flex flex-wrap items-center gap-1.5"
			role="group"
			:aria-label="t('settingsIntegrations.tokens.presets')"
		>
			<span class="me-1 caption">{{ t('settingsIntegrations.tokens.presets') }}</span>
			<UiChip
				v-for="preset in presetSelections"
				:key="preset.id"
				as="button"
				:pressed="samePermissions(model, preset.permissions)"
				class="pointer-coarse:h-9 pointer-coarse:px-3"
				@click="commit(preset.permissions)"
			>
				{{ preset.label }}
			</UiChip>
		</div>
		<div class="grid">
			<!-- Stays in reach while the long list scrolls under it. -->
			<div class="sticky top-0 z-10 flex items-center gap-3 bg-surface-raised pb-2">
				<UiInput
					:id="`${baseId}-search`"
					v-model="query"
					type="search"
					enterkeyhint="search"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					:aria-label="t('settingsIntegrations.tokens.searchPermissions')"
					:placeholder="t('settingsIntegrations.tokens.searchPermissions')"
					class="flex-1"
				>
					<template #leading>
						<UiIcon :icon="Search" />
					</template>
				</UiInput>
				<span
					class="shrink-0 font-mono text-2xs text-ink-faint tabular-nums"
					aria-live="polite"
				>{{ t('settingsIntegrations.tokens.pickedCount', total) }}</span>
			</div>
			<div
				v-if="loading && !groups.length"
				class="grid gap-2 py-2"
				aria-hidden="true"
			>
				<UiSkeleton
					v-for="n in 5"
					:key="n"
					class="h-8"
				/>
			</div>
			<ul
				v-else-if="groups.length"
				role="list"
				class="divide-y divide-line border-y border-line"
			>
				<li
					v-for="{group, permissions, total: groupTotal} in groups"
					:key="group"
				>
					<div class="flex items-center">
						<UiCheckbox
							:model-value="groupState(group, groupTotal)"
							:disabled="isGroupLocked(group)"
							class="self-stretch ps-1 pe-3"
							@update:modelValue="checked => setGroup(group, checked)"
						>
							<span class="sr-only">{{ t('settingsIntegrations.tokens.allOf', {group}) }}</span>
						</UiCheckbox>
						<button
							type="button"
							class="
								flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 pe-1 text-start
								focus-visible:outline-2 focus-visible:outline-accent
								pointer-coarse:h-12
							"
							:aria-expanded="isOpen(group)"
							:aria-controls="`${baseId}-${group}`"
							@click="toggleOpen(group)"
						>
							<span class="min-w-0 flex-1 truncate font-mono text-sm text-ink">{{ group }}</span>
							<span class="font-mono text-2xs text-ink-faint tabular-nums">{{ pickedIn(group) }}/{{ groupTotal }}</span>
							<UiIcon
								:icon="ChevronDown"
								size="sm"
								class="text-ink-faint transition-transform duration-150"
								:class="isOpen(group) && 'rotate-180'"
							/>
						</button>
					</div>
					<div
						v-if="isOpen(group)"
						:id="`${baseId}-${group}`"
						class="grid gap-x-4 ps-8 pb-2 sm:grid-cols-2"
					>
						<UiCheckbox
							v-for="permission in permissions"
							:key="permission"
							:model-value="model[group]?.includes(permission) ?? false"
							:disabled="isLocked(group, permission)"
							class="min-h-8 font-mono text-sm pointer-coarse:min-h-11"
							@update:modelValue="checked => setPermission(group, permission, checked)"
						>
							{{ permission }}
						</UiCheckbox>
					</div>
				</li>
			</ul>
			<p
				v-else
				class="py-6 text-center text-sm text-ink-muted"
			>
				{{ t('ui.listbox.empty') }}
			</p>
		</div>
	</div>
</template>
