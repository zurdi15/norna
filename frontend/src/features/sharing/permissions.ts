import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {Eye, PencilLine, ShieldCheck} from '@lucide/vue'

import {normalizeSharePermission} from '@/client/queries/projectShares'
import {PERMISSIONS, type Permission} from '@/constants/permissions'

const OPTIONS = [
	{value: PERMISSIONS.READ, key: 'read', icon: Eye},
	{value: PERMISSIONS.READ_WRITE, key: 'readWrite', icon: PencilLine},
	{value: PERMISSIONS.ADMIN, key: 'admin', icon: ShieldCheck},
] as const

/** The three levels of access to a project, labelled for pickers and rows. */
export function usePermissions() {
	const {t} = useI18n()

	const options = computed(() => OPTIONS.map(option => ({
		value: option.value as Permission,
		label: t(`projectShare.permission.${option.key}`),
		icon: option.icon,
	})))

	function labelFor(permission: unknown): string {
		const value = normalizeSharePermission(permission)
		return options.value.find(option => option.value === value)?.label ?? ''
	}

	return {options, labelFor}
}
