<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {refDebounced} from '@vueuse/core'
import {Ellipsis, LogOut, ShieldCheck, ShieldOff, Trash2, UserMinus, UserPlus} from '@lucide/vue'

import type {User} from '@/client/generated'
import {
	useAddTeamMemberMutation,
	useDeleteTeamMutation,
	useLeaveTeamMutation,
	useRemoveTeamMemberMutation,
	useToggleTeamMemberAdminMutation,
	useUpdateTeamMutation,
} from '@/client/queries/teams'
import {useTeam} from '@/composables/useTeams'
import {useTitle} from '@/composables/useTitle'
import {useUserSearch} from '@/composables/useUserSearch'
import PageHeader from '@/features/shell/PageHeader.vue'
import UserAvatar from '@/features/shell/UserAvatar.vue'
import TeamForm, {type TeamFormValue} from '@/features/teams/TeamForm.vue'
import {getDisplayName} from '@/modules/user/displayName'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import type {UiMenuEntry} from '@/ui/menu'
import UiAdaptivePopover from '@/ui/UiAdaptivePopover.vue'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiIconButton from '@/ui/UiIconButton.vue'
import UiListbox from '@/ui/UiListbox.vue'
import UiMenu from '@/ui/UiMenu.vue'
import UiSectionHeading from '@/ui/UiSectionHeading.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** One team: its details, its members and, for admins, the controls over both. */
const props = defineProps<{
	teamId: number
}>()

defineOptions({inheritAttrs: false})

const {t} = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const {data: team, isPending} = useTeam(() => props.teamId)
const update = useUpdateTeamMutation()
const addMember = useAddTeamMemberMutation()
const removeMember = useRemoveTeamMemberMutation()
const toggleAdmin = useToggleTeamMemberAdminMutation()
const leave = useLeaveTeamMutation()
const remove = useDeleteTeamMutation()

useTitle(() => team.value?.name ?? t('teams.title'))

const me = computed(() => team.value?.members?.find(member => member.id === authStore.info?.id))
const isAdmin = computed(() => me.value?.admin ?? false)
// Teams synced from an identity provider are managed there.
const external = computed(() => Boolean(team.value?.external_id))
const canManage = computed(() => isAdmin.value && !external.value)
const members = computed(() => [...(team.value?.members ?? [])]
	.sort((a, b) => Number(b.admin) - Number(a.admin) || getDisplayName(a).localeCompare(getDisplayName(b))))

const draft = ref<TeamFormValue>({name: '', description: '', is_public: false})
watch(team, current => {
	if (current) {
		draft.value = {name: current.name ?? '', description: current.description ?? '', is_public: current.is_public ?? false}
	}
}, {immediate: true})

function save() {
	update.mutate({id: props.teamId, team: {...draft.value, name: draft.value.name.trim()}})
}

// Adding people: the server searches by name, username or email.
const addOpen = ref(false)
const query = ref('')
const search = refDebounced(query, 250)
const {users, isFetching} = useUserSearch(search)
const candidates = computed(() => users.value.filter((user): user is User & {id: number} =>
	user.id !== undefined && !members.value.some(member => member.id === user.id)))

function add(userId: number) {
	const user = candidates.value.find(candidate => candidate.id === userId)
	if (user?.username) {
		addMember.mutate({teamId: props.teamId, username: user.username})
		query.value = ''
		addOpen.value = false
	}
}

function memberMenu(member: User & {admin?: boolean}): UiMenuEntry[] {
	const username = member.username ?? ''
	return [
		{
			label: member.admin ? t('teams.makeMember') : t('teams.makeAdmin'),
			icon: member.admin ? ShieldOff : ShieldCheck,
			onSelect: () => toggleAdmin.mutate({teamId: props.teamId, username}),
		},
		{type: 'separator'},
		{
			label: t('teams.removeMember'),
			icon: UserMinus,
			tone: 'danger',
			onSelect: async () => {
				const confirmed = await confirm({
					title: t('teams.removeMemberTitle'),
					description: t('teams.removeMemberDescription', {user: getDisplayName(member)}),
					confirmLabel: t('teams.removeMember'),
					tone: 'danger',
				})
				if (confirmed) {
					removeMember.mutate({teamId: props.teamId, username})
				}
			},
		},
	]
}

async function leaveTeam() {
	const confirmed = await confirm({
		title: t('teams.leaveTitle'),
		description: t('teams.leaveDescription', {team: team.value?.name}),
		confirmLabel: t('teams.leave'),
		tone: 'danger',
	})
	if (confirmed && me.value?.username) {
		await leave.mutateAsync({teamId: props.teamId, username: me.value.username})
		await router.replace({name: 'teams.index'})
	}
}

async function deleteTeam() {
	const confirmed = await confirm({
		title: t('teams.deleteTitle'),
		description: t('teams.deleteDescription', {team: team.value?.name}),
		confirmLabel: t('teams.delete'),
		tone: 'danger',
	})
	if (confirmed) {
		await remove.mutateAsync(props.teamId)
		await router.replace({name: 'teams.index'})
	}
}
</script>

<template>
	<PageHeader
		:title="team?.name ?? ''"
		:back="{name: 'teams.index'}"
	/>
	<div class="mx-auto grid max-w-2xl gap-8 px-4 py-6 md:px-6">
		<div
			v-if="isPending"
			class="grid gap-3"
			aria-hidden="true"
		>
			<UiSkeleton class="h-9" />
			<UiSkeleton class="h-16" />
		</div>
		<template v-else-if="team">
			<UiAlert
				v-if="external"
				tone="info"
			>
				{{ t('teams.external') }}
			</UiAlert>

			<section class="grid gap-4">
				<UiSectionHeading :title="t('teams.details')" />
				<TeamForm
					v-model="draft"
					form-id="team-edit"
					:disabled="!canManage"
					@submit="save"
				/>
				<UiButton
					v-if="canManage"
					type="submit"
					form="team-edit"
					variant="primary"
					class="justify-self-end"
					:loading="update.isPending.value"
				>
					{{ t('projectSettings.save') }}
				</UiButton>
			</section>

			<section class="grid gap-2">
				<UiSectionHeading
					:title="t('teams.members')"
					:count="members.length"
				>
					<template
						v-if="canManage"
						#actions
					>
						<UiAdaptivePopover
							v-model:open="addOpen"
							:title="t('teams.addMember')"
							align="end"
						>
							<template #trigger>
								<UiButton
									variant="ghost"
									size="sm"
									:icon="UserPlus"
									class="-me-2"
								>
									{{ t('teams.addMember') }}
								</UiButton>
							</template>
							<UiListbox
								v-model:query="query"
								:items="candidates"
								:item-key="user => user.id"
								:item-label="user => getDisplayName(user)"
								:label="t('teams.addMember')"
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
									<span class="truncate font-mono text-2xs text-ink-faint">{{ item.username }}</span>
								</template>
							</UiListbox>
						</UiAdaptivePopover>
					</template>
				</UiSectionHeading>
				<ul role="list">
					<li
						v-for="member in members"
						:key="member.id"
						class="flex min-h-12 items-center gap-3"
					>
						<UserAvatar
							:username="member.username"
							:name="member.name"
							size="sm"
						/>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-base">
								{{ getDisplayName(member) }}
								<span
									v-if="member.id === me?.id"
									class="text-ink-faint"
								>· {{ t('teams.you') }}</span>
							</span>
							<span class="block truncate font-mono text-2xs text-ink-faint">{{ member.username }}</span>
						</span>
						<span
							v-if="member.admin"
							class="rounded-sm bg-accent-subtle px-1.5 py-0.5 font-mono text-3xs tracking-wide text-accent uppercase"
						>{{ t('teams.admin') }}</span>
						<UiMenu
							v-if="canManage && member.id !== me?.id"
							:items="memberMenu(member)"
							:title="getDisplayName(member)"
						>
							<template #trigger>
								<UiIconButton
									:icon="Ellipsis"
									:label="t('teams.memberActions', {user: getDisplayName(member)})"
									size="sm"
								/>
							</template>
						</UiMenu>
					</li>
				</ul>
			</section>

			<section
				v-if="!external"
				class="grid gap-3 border-t border-line pt-6"
			>
				<div class="flex flex-wrap gap-2">
					<UiButton
						v-if="me"
						variant="secondary"
						:icon="LogOut"
						@click="leaveTeam"
					>
						{{ t('teams.leave') }}
					</UiButton>
					<UiButton
						v-if="isAdmin"
						variant="danger"
						:icon="Trash2"
						@click="deleteTeam"
					>
						{{ t('teams.delete') }}
					</UiButton>
				</div>
			</section>
		</template>
	</div>
</template>
