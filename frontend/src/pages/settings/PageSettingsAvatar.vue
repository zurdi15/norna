<script setup lang="ts">
import {computed, ref, useTemplateRef, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {RadioGroupIndicator, RadioGroupItem, RadioGroupRoot} from 'reka-ui'
import {ImageUp} from '@lucide/vue'

import {
	avatarProviderQuery,
	useSetAvatarProviderMutation,
	useUploadAvatarMutation,
	type AvatarProvider,
} from '@/client/queries/avatar'
import AvatarCropDialog from '@/features/settings/account/AvatarCropDialog.vue'
import SettingsPage from '@/features/settings/SettingsPage.vue'
import SettingsSection from '@/features/settings/SettingsSection.vue'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {error, success} from '@/message'
import {useAuthStore} from '@/stores/auth'
import UiButton from '@/ui/UiButton.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/**
 * Where the avatar comes from. A provider saves as soon as it is picked; "your picture"
 * waits for an image, cropped square, and switches once it is uploaded.
 */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()

const providerQuery = useQuery(avatarProviderQuery())
const setProvider = useSetAvatarProviderMutation()
const upload = useUploadAvatarMutation()

// LDAP and OpenID accounts can also keep the picture their provider syncs.
const authProvider = computed(() => authStore.info?.auth_provider ?? 'local')
const syncedProvider = computed<AvatarProvider | null>(() => {
	if (authProvider.value === 'ldap') {
		return 'ldap'
	}
	return authProvider.value === 'local' ? null : 'openid'
})

const options = computed(() => {
	const providers: AvatarProvider[] = ['initials', 'gravatar', 'marble', 'upload', 'default']
	if (syncedProvider.value) {
		providers.unshift(syncedProvider.value)
	}
	return providers.map(value => ({
		value,
		label: t(`settingsAccount.avatar.providers.${value}`, {provider: authProvider.value}),
		description: t(`settingsAccount.avatar.providers.${value}Description`),
	}))
})

// Picking "your picture" only shows the upload button until an image is sent.
const selected = ref<AvatarProvider>()
watch(() => providerQuery.data.value, provider => selected.value = provider, {immediate: true})

function onSaved() {
	authStore.invalidateAvatar()
	success({message: t('settings.saved')})
}

function pick(value: unknown) {
	const provider = value as AvatarProvider
	selected.value = provider
	if (provider !== 'upload' && provider !== providerQuery.data.value) {
		setProvider.mutate(provider, {onSuccess: onSaved})
	}
}

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const file = ref<File | null>(null)
const cropping = ref(false)

function onPicked(event: Event) {
	const input = event.target as HTMLInputElement
	const picked = input.files?.[0]
	// Picking the same file again must fire change.
	input.value = ''
	if (!picked) {
		return
	}
	if (!picked.type.startsWith('image/')) {
		error(t('settingsAccount.avatar.notImage'))
		return
	}
	file.value = picked
	cropping.value = true
}

function send(image: Blob) {
	upload.mutate(new File([image], 'avatar.png', {type: 'image/png'}), {
		onSuccess: () => {
			cropping.value = false
			onSaved()
		},
	})
}

// The image stays in memory only while the dialog is open.
watch(cropping, open => {
	if (!open) {
		file.value = null
	}
})
</script>

<template>
	<SettingsPage
		:title="t('settings.nav.avatar')"
		:description="t('settingsAccount.avatar.description')"
	>
		<div class="flex items-center gap-4">
			<UserAvatar
				:username="authStore.info?.username"
				:name="authStore.userDisplayName"
				size="2xl"
			/>
			<div class="min-w-0">
				<p class="truncate text-lg font-semibold">
					{{ authStore.userDisplayName }}
				</p>
				<p class="truncate font-mono text-xs text-ink-faint">
					@{{ authStore.info?.username }}
				</p>
			</div>
		</div>
		<div
			v-if="providerQuery.isPending.value"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-4 w-32" />
			<UiSkeleton
				v-for="n in 5"
				:key="n"
				class="h-12"
			/>
		</div>
		<RadioGroupRoot
			v-else
			as-child
			:model-value="selected"
			:aria-label="t('settingsAccount.avatar.source')"
			@update:modelValue="pick"
		>
			<SettingsSection :title="t('settingsAccount.avatar.source')">
				<div
					v-for="option in options"
					:key="option.value"
					class="flex items-center gap-3 py-3"
				>
					<RadioGroupItem
						:id="`avatar-provider-${option.value}`"
						:value="option.value"
						:aria-describedby="`avatar-provider-${option.value}-description`"
						class="
							grid size-4 shrink-0 cursor-pointer place-items-center rounded-full border
							border-line-strong bg-surface
							focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
							data-[state=checked]:border-accent
							pointer-coarse:size-5
						"
					>
						<RadioGroupIndicator class="size-2 rounded-full bg-accent pointer-coarse:size-2.5" />
					</RadioGroupItem>
					<label
						:for="`avatar-provider-${option.value}`"
						class="min-w-0 flex-1 cursor-pointer"
					>
						<span class="block text-base text-ink pointer-coarse:text-md">{{ option.label }}</span>
						<span
							:id="`avatar-provider-${option.value}-description`"
							class="mt-0.5 block text-sm text-pretty text-ink-muted"
						>{{ option.description }}</span>
					</label>
					<UiButton
						v-if="option.value === 'upload' && selected === 'upload'"
						:icon="ImageUp"
						:loading="upload.isPending.value"
						size="sm"
						class="pointer-coarse:h-11"
						@click="fileInput?.click()"
					>
						{{ providerQuery.data.value === 'upload' ? t('settingsAccount.avatar.replace') : t('settingsAccount.avatar.choose') }}
					</UiButton>
				</div>
			</SettingsSection>
		</RadioGroupRoot>
		<input
			ref="fileInput"
			type="file"
			accept="image/*"
			class="sr-only"
			tabindex="-1"
			aria-hidden="true"
			@change="onPicked"
		>
		<AvatarCropDialog
			v-model:open="cropping"
			:file="file"
			:saving="upload.isPending.value"
			@save="send"
		/>
	</SettingsPage>
</template>
