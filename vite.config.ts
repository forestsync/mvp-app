import { fromEnv } from '@bifravst/from-env'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

const { maptilerAPIKey } = fromEnv({
	maptilerAPIKey: 'MAPTILER_API_KEY',
})(process.env)

export default defineConfig({
	plugins: [solid()],
	define: {
		MAPTILER_API_KEY: JSON.stringify(maptilerAPIKey),
	},
})
