import {defineSetupVue3} from '@histoire/plugin-vue'

import '@fontsource-variable/ibm-plex-sans/wght.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './styles/main.css'

import {i18n} from './i18n'

export const setupVue3 = defineSetupVue3(({app}) => {
	app.use(i18n)
})
