import {useI18n} from 'vue-i18n'
import {toast} from 'vue-sonner'

/**
 * Offers the new version when registerServiceWorker.ts reports an update. Only reloads
 * after the user opted in: clientsClaim() also fires controllerchange on the first
 * install, and reloading then would wipe whatever they were typing.
 */
export function useServiceWorkerUpdate() {
	const {t} = useI18n()
	let refreshing = false

	navigator.serviceWorker?.addEventListener('controllerchange', () => {
		if (!refreshing) {
			return
		}
		refreshing = false
		window.location.reload()
	})

	document.addEventListener('swUpdated', event => {
		const registration = (event as CustomEvent<ServiceWorkerRegistration>).detail
		toast(t('shell.update.available'), {
			id: 'sw-update',
			duration: Infinity,
			action: {
				label: t('shell.update.reload'),
				onClick: () => {
					if (!registration?.waiting) {
						return
					}
					refreshing = true
					registration.waiting.postMessage('skipWaiting')
				},
			},
		})
	}, {once: true})
}
