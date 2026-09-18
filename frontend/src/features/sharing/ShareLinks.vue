<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {Plus} from '@lucide/vue'

import {createLinkShareDraft, useCreateLinkShareMutation, useDeleteLinkShareMutation} from '@/client/queries/linkShares'
import {useConfigStore} from '@/stores/config'
import {confirm} from '@/ui/confirm'
import UiButton from '@/ui/UiButton.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import LinkShareForm from './LinkShareForm.vue'
import LinkShareRow from './LinkShareRow.vue'
import {useLinkShares, type LinkShare} from './useProjectShares'

/** Public links that open the project without an account. */
const props = defineProps<{
	projectId: number
}>()

const {t} = useI18n()
const configStore = useConfigStore()
const {shares, isPending} = useLinkShares(() => props.projectId)
const create = useCreateLinkShareMutation()
const remove = useDeleteLinkShareMutation()

const creating = ref(false)
const draft = ref(createLinkShareDraft())

// Another project's half-filled form (and its password) must not carry over.
watch(() => props.projectId, () => {
	creating.value = false
	draft.value = createLinkShareDraft()
})

const base = computed(() => {
	const url = configStore.frontend_url || `${window.location.origin}/`
	return url.endsWith('/') ? url : `${url}/`
})

function linkFor(share: LinkShare): string {
	return `${base.value}share/${share.hash}/auth`
}

function cancel() {
	creating.value = false
	draft.value = createLinkShareDraft()
}

async function submit() {
	const projectId = props.projectId
	try {
		await create.mutateAsync({projectId, share: draft.value})
	} catch {
		return
	} finally {
		// Drops the plaintext password from the mutation cache.
		create.reset()
	}
	if (projectId === props.projectId) {
		cancel()
	}
}

async function removeLink(share: LinkShare) {
	const projectId = props.projectId
	const confirmed = await confirm({
		title: t('projectShare.links.deleteTitle'),
		description: t('projectShare.links.deleteDescription'),
		confirmLabel: t('projectShare.links.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId, id: share.id})
	}
}
</script>

<template>
	<section class="grid gap-1">
		<UiSectionHeading
			:title="t('projectShare.links.title')"
			:count="shares.length || undefined"
		>
			<template
				v-if="!creating"
				#actions
			>
				<UiButton
					variant="ghost"
					size="sm"
					:icon="Plus"
					class="-me-2 pointer-coarse:h-11"
					@click="creating = true"
				>
					{{ t('projectShare.links.new') }}
				</UiButton>
			</template>
		</UiSectionHeading>
		<p class="text-sm text-pretty text-ink-muted">
			{{ t('projectShare.links.description') }}
		</p>
		<LinkShareForm
			v-if="creating"
			v-model="draft"
			class="mt-2"
			:loading="create.isPending.value"
			@submit="submit"
			@cancel="cancel"
		/>
		<ul
			v-if="shares.length"
			role="list"
			class="divide-y divide-line"
		>
			<LinkShareRow
				v-for="share in shares"
				:key="share.id"
				:share="share"
				:url="linkFor(share)"
				removable
				@remove="removeLink(share)"
			/>
		</ul>
		<UiSkeleton
			v-else-if="isPending"
			class="mt-1 h-12"
		/>
	</section>
</template>
