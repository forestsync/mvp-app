/* @refresh reload */
import { render } from 'solid-js/web'
import App from './App'
import { RouterProvider } from './context/Router'

import './base.css'

const root = document.getElementById('root')

render(
	() => (
		<RouterProvider>
			<App />
		</RouterProvider>
	),
	root!,
)
