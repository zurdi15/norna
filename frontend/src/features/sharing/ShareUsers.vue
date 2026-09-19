<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {refDebounced} from '@vueuse/core'
import {UserPlus} from '@lucide/vue'

import type {User} from '@/client/generated'
import {
	normalizeSharePermission,
	useCreateProjectUserShareMutation,
	useDeleteProjectUserShareMutation,
	useUpdateProjectUserShareMutation,
} from '@/client/queries/projectShares'
import {PERMISSIONS, type Permission} from '@/constants/permissions'
import {useUserSearch} from '@/composables/useUserSearch'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import {getDisplayName} from '@/modules/user/displayName'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiButton from '@/ui/UiButton.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

import ShareRow from './ShareRow.vue'
import {useProjectUserShares, type UserShare} from './useProjectShares'

/** The people with access to a project: its owner first, then everyone it is shared with. */
const props = defineProps<{
	projectId: number
	projectTitle: string
	owner?: User
	canManage: boolean
}>()

const {t} = useI18n()
const authStore = useAuthStore()
const {shares, isPending} = useProjectUserShares(() => props.projectId)
const create = useCreateProjectUserShareMutation()
const update = useUpdateProjectUserShareMutation()
const remove = useDeleteProjectUserShareMutation()

const myId = computed(() => authStore.info?.id)
const sortedShares = computed(() => [...shares.value]
	.sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))))

// The server searches by name, username or email.
const addOpen = ref(false)
const query = ref('')
const search = refDebounced(query, 250)
const {users, isFetching} = useUserSearch(search)
const candidates = computed(() => users.value.filter((user): user is User & {id: number, username: string} =>
	user.id !== undefined
	&& Boolean(user.username)
	&& user.id !== myId.value
	&& user.id !== props.owner?.id
	&& !shares.value.some(share => share.username === user.username)))

function add(userId: number) {
	const user = candidates.value.find(candidate => candidate.id === userId)
	if (!user) {
		return
	}
	create.mutate({projectId: props.projectId, username: user.username})
	query.value = ''
	addOpen.value = false
}

function isBusy(share: UserShare): boolean {
	return update.isPending.value && update.variables.value?.username === share.username
}

function change(share: UserShare, permission: Permission) {
	update.mutate({projectId: props.projectId, username: share.username, permission})
}

async function removeShare(share: UserShare) {
	const projectId = props.projectId
	const confirmed = await confirm({
		title: t('projectShare.people.removeTitle'),
		description: t('projectShare.people.removeDescription', {user: getDisplayName(share), project: props.projectTitle}),
		confirmLabel: t('projectShare.people.remove'),
		tone: 'danger',
	})
	if (confirmed) {
		remove.mutate({projectId, username: share.username})
	}
}
</script>

<template>
	<section class="grid gap-1">
		<UiSectionHeading
			:title="t('projectShare.people.title')"
			:count="shares.length + (owner ? 1 : 0) || undefined"
		>
			<template
				v-if="canManage"
				#actions
			>
				<UiAdaptivePopover
					v-model:open="addOpen"
					:title="t('projectShare.people.add')"
					align="end"
				>
					<template #trigger>
						<UiButton
							variant="ghost"
							size="sm"
							:icon="UserPlus"
							class="-me-2 pointer-coarse:h-11"
						>
							{{ t('projectShare.people.add') }}
						</UiButton>
					</template>
					<UiListbox
						v-model:query="query"
						:items="candidates"
						:item-key="user => user.id"
						:item-label="user => getDisplayName(user)"
						:label="t('projectShare.people.add')"
						:search-placeholder="t('teams.searchPeople')"
						:empty-text="query ? undefined : t('teams.searchHint')"
						:loading="isFetching"
						filter="none"
						class="md:w-72"
						@select="add"
					>
						<template #item="{item}">
							<UserAvatar
								:username="item.username"
								:name="item.name"
								size="xs"
							/>
							<span class="min-w-0 flex-1 truncate">{{ getDisplayName(item) }}</span>
							<span
								v-if="item.name"
								class="truncate font-mono text-2xs text-ink-faint"
							>{{ item.username }}</span>
						</template>
					</UiListbox>
				</UiAdaptivePopover>
			</template>
		</UiSectionHeading>
		<ul role="list">
			<ShareRow
				v-if="owner"
				:name="getDisplayName(owner)"
				:detail="owner.name ? owner.username : undefined"
				:permission="PERMISSIONS.ADMIN"
				:role="t('projectShare.owner')"
				:you="owner.id === myId"
				:remove-label="t('projectShare.people.remove')"
			>
				<template #avatar>
					<UserAvatar
						:username="owner.username"
						:name="owner.name"
						size="sm"
					/>
				</template>
			</ShareRow>
			<ShareRow
				v-for="share in sortedShares"
				:key="share.username"
				:name="getDisplayName(share)"
				:detail="share.name ? share.username : undefined"
				:permission="normalizeSharePermission(share.permission)"
				:you="share.id === myId"
				:editable="canManage && share.id !== myId"
				:busy="isBusy(share)"
				:remove-label="t('projectShare.people.remove')"
				@change="permission => change(share, permission)"
				@remove="removeShare(share)"
			>
				<template #avatar>
					<UserAvatar
						:username="share.username"
						:name="share.name"
						size="sm"
					/>
				</template>
			</ShareRow>
		</ul>
		<div
			v-if="isPending"
			class="grid gap-2 py-1"
			aria-hidden="true"
		>
			<UiSkeleton class="h-8" />
		</div>
		<p
			v-else-if="!shares.length"
			class="text-sm text-pretty text-ink-faint"
		>
			{{ canManage ? t('projectShare.people.emptyManage') : t('projectShare.people.empty') }}
		</p>
	</section>
</template>
