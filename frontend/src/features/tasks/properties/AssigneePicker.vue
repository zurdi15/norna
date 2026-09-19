<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {refDebounced} from '@vueuse/core'

import type {User} from '@/client/generated'
import {useAddAssigneeMutation, useRemoveAssigneeMutation} from '@/client/queries/taskAssignees'
import {useProjectUserSearch} from '@/composables/useUserSearch'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {getDisplayName} from '@/modules/user/displayName'
import {matchesSearch} from '@/ui/search'
import UiListbox from '@/ui/UiListbox.vue'

type UserWithId = User & {id: number}

/** Assigns the people who can see the task's project; the search runs on the server. */
const props = defineProps<{
	taskId: number
	projectId: number
	selected: readonly User[]
}>()

const {t} = useI18n()
const addAssignee = useAddAssigneeMutation()
const removeAssignee = useRemoveAssigneeMutation()

const query = ref('')
const search = refDebounced(query, 200)
const {users, isFetching} = useProjectUserSearch(() => props.projectId, search, true)

const selectedIds = ref<number[]>([])
watch(() => props.selected, current => {
	selectedIds.value = current.map(user => user.id).filter((id): id is number => id !== undefined)
}, {immediate: true})

// Current assignees first, so they can be removed without searching for them.
const items = computed(() => {
	const assigned = props.selected.filter((user): user is UserWithId =>
		user.id !== undefined && matchesSearch(`${getDisplayName(user)} ${user.username ?? ''}`, query.value))
	const found = users.value.filter((user): user is UserWithId =>
		user.id !== undefined && !assigned.some(existing => existing.id === user.id))
	return [...assigned, ...found]
})

function toggle(id: number) {
	const user = items.value.find(candidate => candidate.id === id)
	if (!user) {
		return
	}
	if (selectedIds.value.includes(id)) {
		selectedIds.value = selectedIds.value.filter(selectedId => selectedId !== id)
		removeAssignee.mutate({taskId: props.taskId, user})
	} else {
		selectedIds.value = [...selectedIds.value, id]
		addAssignee.mutate({taskId: props.taskId, user})
	}
}
</script>

<template>
	<UiListbox
		v-model:query="query"
		:model-value="selectedIds"
		:items="items"
		:item-key="user => user.id"
		:item-label="user => getDisplayName(user)"
		:label="t('taskDetail.properties.assignees')"
		:search-placeholder="t('taskDetail.searchPeople')"
		:loading="isFetching"
		filter="none"
		multiple
		class="md:w-72"
		@select="toggle"
	>
		<template #item="{item}">
			<UserAvatar
				:username="item.username"
				:name="item.name"
				size="xs"
			/>
			<span class="min-w-0 flex-1 truncate">{{ getDisplayName(item) }}</span>
			<span
				v-if="item.name && item.username"
				class="truncate font-mono text-2xs text-ink-faint"
			>{{ item.username }}</span>
		</template>
	</UiListbox>
</template>
