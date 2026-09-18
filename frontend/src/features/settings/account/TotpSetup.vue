<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'
import {Check, Copy, ShieldCheck} from '@lucide/vue'

import {totpQrCodeQuery} from '@/client/queries/totp'
import {useCopyFeedback} from '@/composables/useCopyToClipboard'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiField from '@/ui/UiField.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/**
 * The second half of the setup: add Norna to an authenticator app (QR code or the key
 * by hand), then prove it works with the code it shows.
 */
const props = withDefaults(defineProps<{
	secret: string
	confirming?: boolean
	// Set by the page when the server rejected the code.
	error?: string
}>(), {
	confirming: false,
	error: undefined,
})

const emit = defineEmits<{
	confirm: [passcode: string]
	input: []
}>()

const {t} = useI18n()

const qrCode = useQuery(totpQrCodeQuery())
const qrUrl = ref<string>()
watch(() => qrCode.data.value, image => {
	if (qrUrl.value) {
		URL.revokeObjectURL(qrUrl.value)
	}
	qrUrl.value = image ? URL.createObjectURL(image) : undefined
}, {immediate: true})
onBeforeUnmount(() => qrUrl.value && URL.revokeObjectURL(qrUrl.value))

// Groups of four are easier to type into an app by hand.
const groupedSecret = computed(() => props.secret.match(/.{1,4}/g)?.join(' ') ?? props.secret)

const {copied, copy: copyText} = useCopyFeedback()

function copy() {
	void copyText(props.secret)
}

const passcode = ref('')
const touched = ref(false)
const codeError = computed(() => props.error
	?? (touched.value && !/^\d{6}$/.test(passcode.value.replace(/\s/g, '')) ? t('settingsAccount.totp.codeInvalid') : undefined))

function submit() {
	touched.value = true
	if (/^\d{6}$/.test(passcode.value.replace(/\s/g, ''))) {
		emit('confirm', passcode.value)
	}
}
</script>

<template>
	<div class="grid gap-5 py-4">
		<div class="grid gap-3">
			<p class="text-base text-pretty">
				<span class="me-1.5 font-mono text-xs text-ink-faint">1</span>{{ t('settingsAccount.totp.scan') }}
			</p>
			<!-- The image brings its own white margin, which scanners need in dark mode too. -->
			<div class="grid size-44 place-items-center overflow-hidden rounded-lg border border-line bg-surface">
				<img
					v-if="qrUrl"
					:src="qrUrl"
					:alt="t('settingsAccount.totp.qrAlt')"
					class="size-full object-contain"
				>
				<UiSkeleton
					v-else
					class="size-full"
				/>
			</div>
			<div class="grid gap-1">
				<p class="text-sm text-ink-muted">
					{{ t('settingsAccount.totp.manual') }}
				</p>
				<div class="flex items-center gap-1">
					<code class="font-mono text-sm tracking-wide break-all text-ink select-all">{{ groupedSecret }}</code>
					<UiIconButton
						:icon="copied ? Check : Copy"
						:label="copied ? t('settingsAccount.totp.keyCopied') : t('settingsAccount.totp.copyKey')"
						size="sm"
						class="pointer-coarse:size-11"
						@click="copy"
					/>
				</div>
			</div>
		</div>
		<form
			class="grid gap-3 md:max-w-sm"
			novalidate
			@submit.prevent="submit"
		>
			<p class="text-base text-pretty">
				<span class="me-1.5 font-mono text-xs text-ink-faint">2</span>{{ t('settingsAccount.totp.enterCode') }}
			</p>
			<UiField
				:label="t('settingsAccount.totp.code')"
				:error="codeError"
			>
				<UiInput
					v-model="passcode"
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength="7"
					class="w-36 font-mono tracking-widest tabular-nums"
					@input="emit('input')"
				/>
			</UiField>
			<UiAlert tone="info">
				{{ t('settingsAccount.totp.signOutNotice') }}
			</UiAlert>
			<div>
				<UiButton
					type="submit"
					variant="primary"
					:icon="ShieldCheck"
					:loading="confirming"
				>
					{{ t('settingsAccount.totp.turnOn') }}
				</UiButton>
			</div>
		</form>
	</div>
</template>
