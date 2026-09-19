<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {keepPreviousData, useInfiniteQuery} from '@tanstack/vue-query'
import {refDebounced} from '@vueuse/core'
import {Search, UserPlus, Users} from '@lucide/vue'

import {
	adminUsersQuery,
	useSendPasswordResetMutation,
	useSetUserAdminMutation,
	useSetUserStatusMutation,
	USER_STATUS,
	type AdminUserWithId,
} from '@/client/queries/admin'
import AdminListFooter from '@/features/admin/AdminListFooter.vue'
import AdminUserRow from '@/features/admin/AdminUserRow.vue'
import CreateUserDialog from '@/features/admin/CreateUserDialog.vue'
import DeleteUserDialog from '@/features/admin/DeleteUserDialog.vue'
import SetPasswordDialog from '@/features/admin/SetPasswordDialog.vue'
import {useAuthStore} from '@/stores/auth'
import {confirm} from '@/ui/confirm'
import UiAlert from '@/ui/UiAlert.vue'
import UiButton from '@/ui/UiButton.vue'
import UiEmptyState from '@/ui/UiEmptyState.vue'
import UiIcon from '@/ui/UiIcon.vue'
import UiInput from '@/ui/UiInput.vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'

/** Every account on the instance: find one, create one, and manage access, passwords and deletion. */
defineOptions({inheritAttrs: false})

const {t} = useI18n()
const authStore = useAuthStore()

const search = ref('')
const debouncedSearch = refDebounced(search, 250)
const users = useInfiniteQuery(computed(() => ({
	...adminUsersQuery(debouncedSearch.value),
	placeholderData: keepPreviousData,
})))
const list = computed(() => users.data.value?.pages.flatMap(page => page.items) ?? [])
const total = computed(() => users.data.value?.pages[0]?.total ?? 0)

const setAdmin = useSetUserAdminMutation()
const setStatus = useSetUserStatusMutation()
const sendReset = useSendPasswordResetMutation()

const createOpen = ref(false)
const passwordOpen = ref(false)
const deleteOpen = ref(false)
const target = ref<AdminUserWithId | null>(null)

async function toggleAdmin(user: AdminUserWithId) {
	const makeAdmin = !user.is_admin
	const confirmed = await confirm({
		title: t(makeAdmin ? 'admin.users.makeAdminTitle' : 'admin.users.removeAdminTitle', {username: user.username}),
		description: t(makeAdmin ? 'admin.users.makeAdminDescription' : 'admin.users.removeAdminDescription'),
		confirmLabel: t(makeAdmin ? 'admin.users.actions.makeAdmin' : 'admin.users.actions.removeAdmin'),
		tone: makeAdmin ? 'default' : 'danger',
	})
	if (confirmed) {
		setAdmin.mutate({id: user.id, isAdmin: makeAdmin})
	}
}

async function toggleStatus(user: AdminUserWithId) {
	if ((user.status ?? USER_STATUS.ACTIVE) !== USER_STATUS.ACTIVE) {
		setStatus.mutate({id: user.id, status: USER_STATUS.ACTIVE})
		return
	}
	const confirmed = await confirm({
		title: t('admin.users.disableTitle', {username: user.username}),
		description: t('admin.users.disableDescription'),
		confirmLabel: t('admin.users.actions.disable'),
		tone: 'danger',
	})
	if (confirmed) {
		setStatus.mutate({id: user.id, status: USER_STATUS.DISABLED})
	}
}

function openPassword(user: AdminUserWithId) {
	target.value = user
	passwordOpen.value = true
}

function openDelete(user: AdminUserWithId) {
	target.value = user
	deleteOpen.value = true
}
</script>

<template>
	<div class="@container mx-auto max-w-4xl pb-10">
		<div class="flex items-center gap-2 px-4 pt-4 pb-2 md:pt-6 @2xl:px-6">
			<UiInput
				v-model="search"
				type="search"
				:placeholder="t('admin.users.search')"
				:aria-label="t('admin.users.search')"
				class="min-w-0 flex-1"
			>
				<template #leading>
					<UiIcon :icon="Search" />
				</template>
			</UiInput>
			<UiButton
				variant="primary"
				:icon="UserPlus"
				@click="createOpen = true"
			>
				{{ t('admin.users.new') }}
			</UiButton>
		</div>

		<UiAlert
			v-if="users.isError.value"
			tone="danger"
			class="mx-4 mt-2 @2xl:mx-6"
		>
			{{ t('admin.loadFailed') }}
		</UiAlert>
		<div
			v-else-if="users.isPending.value"
			class="grid gap-4 px-4 pt-4 @2xl:px-6"
			aria-hidden="true"
		>
			<UiSkeleton
				v-for="index in 5"
				:key="index"
				class="h-10"
			/>
		</div>
		<UiEmptyState
			v-else-if="!list.length"
			:title="debouncedSearch ? t('admin.users.noMatchTitle') : t('admin.users.emptyTitle')"
			:description="debouncedSearch ? t('admin.users.noMatchDescription', {query: debouncedSearch}) : undefined"
			class="py-16"
		>
			<template #illustration>
				<UiIcon
					:icon="Users"
					size="xl"
					class="mb-4 text-ink-faint"
				/>
			</template>
		</UiEmptyState>
		<template v-else>
			<ul
				role="list"
				:aria-label="t('admin.nav.users')"
				class="divide-y divide-line border-y border-line"
			>
				<li
					v-for="user in list"
					:key="user.id"
				>
					<AdminUserRow
						:user="user"
						:is-self="user.id === authStore.info?.id"
						@toggleAdmin="toggleAdmin(user)"
						@toggleStatus="toggleStatus(user)"
						@setPassword="openPassword(user)"
						@sendReset="sendReset.mutate({id: user.id, username: user.username ?? ''})"
						@delete="openDelete(user)"
					/>
				</li>
			</ul>
			<AdminListFooter
				:shown="list.length"
				:total="total"
				:has-more="users.hasNextPage.value"
				:loading="users.isFetchingNextPage.value"
				@more="users.fetchNextPage()"
			/>
		</template>
	</div>

	<CreateUserDialog v-model:open="createOpen" />
	<SetPasswordDialog
		v-model:open="passwordOpen"
		:user="target"
	/>
	<DeleteUserDialog
		v-model:open="deleteOpen"
		:user="target"
	/>
</template>
