<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {keepPreviousData, useInfiniteQuery} from '@tanstack/vue-query'
import {refDebounced} from '@vueuse/core'

import {adminUsersQuery, useChangeProjectOwnerMutation, type AdminProject} from '@/client/queries/admin'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import UiButton from '@/ui/UiButton.vue'
import UiDialog from '@/ui/UiDialog.vue'
import UiListbox from '@/ui/UiListbox.vue'

/** Hands a project to another account, the one thing its own settings can't do. */
const props = defineProps<{
	project: AdminProject | null
}>()

const open = defineModel<boolean>('open', {default: false})

const {t} = useI18n()
const change = useChangeProjectOwnerMutation()

const query = ref('')
const search = refDebounced(query, 250)
const users = useInfiniteQuery(computed(() => ({
	...adminUsersQuery(search.value),
	enabled: open.value,
	placeholderData: keepPreviousData,
})))
const candidates = computed(() => (users.data.value?.pages[0]?.items ?? [])
	.filter(user => user.id !== props.project?.owner?.id))

const ownerId = ref<number>()

watch(open, isOpen => {
	if (isOpen) {
		query.value = ''
		ownerId.value = undefined
	}
})

async function submit() {
	if (!props.project || ownerId.value === undefined) {
		return
	}
	try {
		await change.mutateAsync({id: props.project.id, ownerId: ownerId.value})
		open.value = false
	} catch {
		// Reported by the mutation.
	}
}
</script>

<template>
	<UiDialog
		v-model:open="open"
		:title="t('admin.projects.changeOwnerTitle', {title: project?.title ?? ''})"
		:description="project?.owner?.username ? t('admin.projects.currentOwner', {username: project.owner.username}) : undefined"
		body-class="px-0 pb-2"
	>
		<UiListbox
			v-model="ownerId"
			v-model:query="query"
			:items="candidates"
			:item-key="user => user.id"
			:item-label="user => user.username ?? ''"
			:label="t('admin.projects.newOwner')"
			:search-placeholder="t('admin.users.search')"
			:loading="users.isFetching.value"
			filter="none"
		>
			<template #item="{item}">
				<UserAvatar
					:username="item.username"
					:name="item.name || item.username"
					size="sm"
				/>
				<span class="min-w-0 flex-1 truncate">
					{{ item.name || item.username }}
					<span
						v-if="item.name"
						class="font-mono text-xs text-ink-faint"
					>@{{ item.username }}</span>
				</span>
			</template>
		</UiListbox>
		<template #footer="{close}">
			<UiButton
				variant="ghost"
				@click="close"
			>
				{{ t('ui.cancel') }}
			</UiButton>
			<UiButton
				variant="primary"
				:disabled="ownerId === undefined"
				:loading="change.isPending.value"
				@click="submit"
			>
				{{ t('admin.projects.changeOwner') }}
			</UiButton>
		</template>
	</UiDialog>
</template>
