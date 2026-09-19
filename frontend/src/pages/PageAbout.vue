<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'

import NornaMark from '@/features/shell/NornaMark.vue'
import ModalPage from '@/features/shell/ModalPage.vue'
import {useConfigStore} from '@/stores/config'
import UiButton from '@/ui/UiButton.vue'
import {SOURCE_CODE} from '@/urls'
import {VERSION as frontendVersion} from '@/version.json'

/** Which Norna this is: the versions of the app and of the server it talks to. */
withDefaults(defineProps<{
	inModal?: boolean
}>(), {
	inModal: false,
})

const emit = defineEmits<{
	close: []
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const configStore = useConfigStore()
const apiVersion = computed(() => configStore.version)
const legal = computed(() => configStore.legal)
</script>

<template>
	<ModalPage
		:title="t('about.title')"
		:in-modal="inModal"
	>
		<div class="flex items-center gap-3">
			<NornaMark class="size-10 rounded-lg" />
			<div>
				<p class="text-lg font-semibold tracking-tight">
					Norna
				</p>
				<p class="text-sm text-ink-muted">
					{{ t('about.tagline') }}
				</p>
			</div>
		</div>
		<dl class="grid divide-y divide-line border-y border-line">
			<div class="flex items-center justify-between gap-4 py-2.5">
				<dt class="text-sm text-ink-muted">
					{{ t('about.app') }}
				</dt>
				<dd class="font-mono text-sm">
					{{ frontendVersion }}
				</dd>
			</div>
			<div class="flex items-center justify-between gap-4 py-2.5">
				<dt class="text-sm text-ink-muted">
					{{ t('about.server') }}
				</dt>
				<dd class="font-mono text-sm break-all">
					{{ apiVersion || '—' }}
				</dd>
			</div>
		</dl>
		<!-- The AGPL asks a network service to offer its source to everyone using it. -->
		<p class="text-sm text-pretty text-ink-muted">
			{{ t('about.license') }}
			<a
				:href="SOURCE_CODE"
				target="_blank"
				rel="noopener"
				class="text-accent underline-offset-2 hover:underline"
			>{{ t('about.source') }}</a>
		</p>
		<p
			v-if="legal.imprint_url || legal.privacy_policy_url"
			class="flex gap-4 text-sm"
		>
			<a
				v-if="legal.imprint_url"
				:href="legal.imprint_url"
				target="_blank"
				rel="noopener"
				class="text-ink-muted hover:text-ink"
			>{{ t('auth.imprint') }}</a>
			<a
				v-if="legal.privacy_policy_url"
				:href="legal.privacy_policy_url"
				target="_blank"
				rel="noopener"
				class="text-ink-muted hover:text-ink"
			>{{ t('auth.privacy') }}</a>
		</p>
		<template
			v-if="inModal"
			#actions
		>
			<UiButton
				variant="secondary"
				@click="emit('close')"
			>
				{{ t('ui.close') }}
			</UiButton>
		</template>
	</ModalPage>
</template>
