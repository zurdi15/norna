<script setup lang="ts">
import {computed, ref, useId, watch} from 'vue'
import {useI18n} from 'vue-i18n'

import {BOT_STATUS, BOT_USERNAME_PREFIX, useCreateBotMutation, useUpdateBotMutation} from '@/client/queries/bots'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiField from '@/ui/UiField.vue'
import UiInput from '@/ui/UiInput.vue'

import type {ListedBot} from './useIntegrations'

/** Creates a bot, or renames the one passed in: its username (always bot-…) and display name. */
const props = withDefaults(defineProps<{
	bot?: ListedBot
}>(), {
	bot: undefined,
})

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const formId = useId()
const create = useCreateBotMutation()
const update = useUpdateBotMutation()

// The prefix is shown in front of the field, so only the rest is typed.
const username = ref('')
const name = ref('')
const touched = ref(false)

watch(open, isOpen => {
	if (isOpen) {
		username.value = props.bot?.username.replace(BOT_USERNAME_PREFIX, '') ?? ''
		name.value = props.bot?.name ?? ''
		touched.value = false
	}
}, {immediate: true})

const usernameError = computed(() => {
	if (!touched.value) {
		return undefined
	}
	if (username.value.trim() === '') {
		return t('settingsIntegrations.bots.usernameRequired')
	}
	return /\s/.test(username.value.trim()) ? t('settingsIntegrations.bots.usernameSpaces') : undefined
})

const pending = computed(() => create.isPending.value || update.isPending.value)

async function submit() {
	touched.value = true
	if (usernameError.value) {
		return
	}
	try {
		if (props.bot) {
			await update.mutateAsync({
				id: props.bot.id,
				username: username.value,
				name: name.value,
				status: props.bot.status ?? BOT_STATUS.active,
			})
		} else {
			await create.mutateAsync({username: username.value, name: name.value})
		}
	} catch {
		return
	}
	open.value = false
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="bot ? t('settingsIntegrations.bots.editTitle') : t('settingsIntegrations.bots.new')"
		size="sm"
	>
		<form
			:id="formId"
			class="grid gap-4"
			novalidate
			@submit.prevent="submit"
		>
			<UiField
				:label="t('settingsIntegrations.bots.username')"
				:hint="t('settingsIntegrations.bots.usernameHint')"
				:error="usernameError"
				required
			>
				<UiInput
					v-model="username"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					placeholder="assistant"
					class="font-mono"
				>
					<template #leading>
						<span class="-me-2 font-mono">{{ BOT_USERNAME_PREFIX }}</span>
					</template>
				</UiInput>
			</UiField>
			<UiField
				:label="t('settingsIntegrations.bots.name')"
				:hint="t('settingsIntegrations.bots.nameHint')"
			>
				<UiInput
					v-model="name"
					autocomplete="off"
					:placeholder="t('settingsIntegrations.bots.namePlaceholder')"
				/>
			</UiField>
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
				:loading="pending"
			>
				{{ bot ? t('projectSettings.save') : t('settingsIntegrations.bots.create') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
