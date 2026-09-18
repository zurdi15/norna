<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import type {createLinkShareDraft} from '@/client/queries/linkShares'
import {normalizeSharePermission} from '@/client/queries/projectShares'
import type {Permission} from '@/constants/permissions'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSelect from '@/ui/UiSelect.vue'

import {usePermissions} from './permissions'

export type LinkShareDraft = ReturnType<typeof createLinkShareDraft>

/** A new public link: what it lets people do, and optionally a name and a password. */
defineProps<{
	loading: boolean
}>()

const emit = defineEmits<{
	submit: []
	cancel: []
}>()

const model = defineModel<LinkShareDraft>({required: true})

const {t} = useI18n()
const permissions = usePermissions()

const permission = computed<Permission>({
	get: () => normalizeSharePermission(model.value.permission),
	set: value => model.value = {...model.value, permission: value},
})
const name = computed({
	get: () => model.value.name,
	set: value => model.value = {...model.value, name: value},
})
const password = computed({
	get: () => model.value.password,
	set: value => model.value = {...model.value, password: value},
})
</script>

<template>
	<form
		class="grid gap-4 rounded-lg border border-line bg-canvas-subtle p-4"
		@submit.prevent="emit('submit')"
	>
		<UiField
			:label="t('projectShare.links.permission')"
			:hint="t('projectShare.links.permissionHint')"
		>
			<UiSelect
				v-model="permission"
				:items="permissions.options.value"
			/>
		</UiField>
		<div class="grid gap-4 sm:grid-cols-2">
			<UiField
				:label="t('projectShare.links.name')"
				:hint="t('projectShare.links.nameHint')"
			>
				<UiInput
					v-model="name"
					data-autofocus
					autocomplete="off"
					:placeholder="t('projectShare.links.namePlaceholder')"
				/>
			</UiField>
			<UiField
				:label="t('projectShare.links.password')"
				:hint="t('projectShare.links.passwordHint')"
			>
				<UiInput
					v-model="password"
					type="password"
					autocomplete="new-password"
				/>
			</UiField>
		</div>
		<div class="flex flex-wrap items-center justify-end gap-2">
			<UiButton
				variant="ghost"
				@click="emit('cancel')"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				variant="primary"
				:loading="loading"
			>
				{{ t('projectShare.links.create') }}
			</UiButton>
		</div>
	</form>
</template>
