<script setup lang="ts">
import {computed, reactive, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'

import type {InviteLinkTeam, UserInviteLink} from '@/client/generated'
import {adminTeamsQuery, useCreateInviteLinkMutation} from '@/client/queries/admin'
import PickerField from '@/features/settings/account/PickerField.vue'
import {formatDay} from '@/features/settings/integrations/format'
import {addDays} from '@/helpers/time/dateMath'
import {useAuthStore} from '@/stores/auth'
import UiButton from '@/ui/UiButton.vue'
import UiCalendar from '@/ui/UiCalendar.vue'
import UiCheckbox from '@/ui/UiCheckbox.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiSelect from '@/ui/UiSelect.vue'

/**
 * A link that lets people register, even with public registration off: how many may use it,
 * until when, and the teams they join. The new link goes to the `created` listener only.
 */
const emit = defineEmits<{
	created: [link: UserInviteLink]
}>()

const open = defineModel<boolean>('open', {default: false})

const {t, locale} = useI18n()
const authStore = useAuthStore()
const create = useCreateInviteLinkMutation()
const formId = useId()

type Expiry = 'never' | '1' | '7' | '30' | 'custom'

function emptyForm() {
	return {
		name: '',
		maxUses: '' as string | number | null,
		expiry: 'never' as Expiry,
		expiresOn: addDays(new Date(), 7),
		teamIds: [] as number[],
		skipEmailConfirm: false,
	}
}
const form = reactive(emptyForm())
const submitted = ref(false)

watch(open, isOpen => {
	if (!isOpen) {
		Object.assign(form, emptyForm())
		submitted.value = false
	}
})

const teams = useQuery(computed(() => ({...adminTeamsQuery(), enabled: open.value})))
const teamItems = computed(() => (teams.data.value ?? []).filter((team): team is InviteLinkTeam & {id: number} => team.id !== undefined))
const teamsText = computed(() => teamItems.value
	.filter(team => form.teamIds.includes(team.id))
	.map(team => team.name)
	.join(', '))

const expiryItems = computed(() => [
	{value: 'never' as const, label: t('admin.invites.form.never')},
	...(['1', '7', '30'] as const).map(days => ({value: days, label: t('admin.invites.form.days', Number(days))})),
	{value: 'custom' as const, label: t('admin.invites.form.pickDay')},
])

const tomorrow = computed(() => addDays(new Date(), 1))

// A picked day lasts until its end.
function expiresAt(): string | null {
	if (form.expiry === 'never') {
		return null
	}
	if (form.expiry === 'custom') {
		const end = new Date(form.expiresOn)
		end.setHours(23, 59, 59, 0)
		return end.toISOString()
	}
	return addDays(new Date(), Number(form.expiry)).toISOString()
}

const errors = computed(() => submitted.value
	? {
		name: form.name.trim() === '' ? t('admin.invites.form.nameRequired') : undefined,
		maxUses: form.maxUses !== '' && form.maxUses !== null && !(Number.isInteger(Number(form.maxUses)) && Number(form.maxUses) > 0)
			? t('admin.invites.form.maxUsesInvalid')
			: undefined,
	}
	: {})

async function submit() {
	submitted.value = true
	if (Object.values(errors.value).some(Boolean)) {
		return
	}
	try {
		const link = await create.mutateAsync({
			name: form.name.trim(),
			max_uses: form.maxUses === '' || form.maxUses === null ? null : Number(form.maxUses),
			expires_at: expiresAt(),
			team_ids: form.teamIds,
			skip_email_confirm: form.skipEmailConfirm,
		})
		open.value = false
		emit('created', link)
	} catch {
		// Reported by the mutation.
	} finally {
		// Drops the secret token from the mutation cache.
		create.reset()
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('admin.invites.new')"
		:description="t('admin.invites.newDescription')"
	>
		<form
			:id="formId"
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiField
				:label="t('admin.invites.form.name')"
				:hint="t('admin.invites.form.nameHint')"
				:error="errors.name"
				required
			>
				<UiInput
					v-model="form.name"
					type="text"
					maxlength="250"
					autocomplete="off"
				/>
			</UiField>
			<div class="grid gap-4 sm:grid-cols-2">
				<UiField
					:label="t('admin.invites.form.maxUses')"
					:error="errors.maxUses"
				>
					<UiInput
						v-model="form.maxUses"
						type="number"
						inputmode="numeric"
						min="1"
						step="1"
						:placeholder="t('admin.invites.form.unlimited')"
						class="font-mono"
					/>
				</UiField>
				<UiField :label="t('admin.invites.form.expires')">
					<UiSelect
						v-model="form.expiry"
						:items="expiryItems"
					/>
				</UiField>
			</div>
			<UiField
				v-if="form.expiry === 'custom'"
				v-slot="{id}"
				:label="t('admin.invites.form.expiresOn')"
			>
				<PickerField
					:id="id"
					v-slot="{close}"
					:title="t('admin.invites.form.expiresOn')"
					:text="formatDay(form.expiresOn, locale)"
				>
					<div class="p-3 pointer-coarse:px-4">
						<UiCalendar
							:model-value="form.expiresOn"
							:week-starts-on="authStore.settings.week_start"
							:min-value="tomorrow"
							@update:modelValue="(day: Date | null) => {if (day) {form.expiresOn = day}; close()}"
						/>
					</div>
				</PickerField>
			</UiField>
			<UiField
				v-if="teamItems.length"
				v-slot="{id}"
				:label="t('admin.invites.form.teams')"
				:hint="t('admin.invites.form.teamsHint')"
			>
				<PickerField
					:id="id"
					:title="t('admin.invites.form.teams')"
					:text="teamsText"
					:placeholder="t('admin.invites.form.noTeams')"
				>
					<UiListbox
						v-model="form.teamIds"
						:items="teamItems"
						:item-key="team => team.id"
						:item-label="team => team.name ?? ''"
						:label="t('admin.invites.form.teams')"
						multiple
						class="md:w-72"
					/>
				</PickerField>
			</UiField>
			<UiCheckbox v-model="form.skipEmailConfirm">
				{{ t('admin.invites.form.skipEmailConfirm') }}
			</UiCheckbox>
		</form>
		<template #footer="{close}">
			<UiButton
				variant="ghost"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				type="submit"
				:form="formId"
				variant="primary"
				:loading="create.isPending.value"
			>
				{{ t('admin.invites.form.create') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
