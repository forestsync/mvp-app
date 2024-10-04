import { Match, Switch, createEffect } from 'solid-js'
import { DataProvider } from './context/Data.js'
import { useRouter } from './context/Router.js'
import FullScreenMap from './FullScreenMap.js'
import Navigation from './Navigation.js'
import Owner from './Owner.jsx'
import Sink from './Sink.js'

const App = () => {
	const { path } = useRouter()

	createEffect(() => {
		const body = document.getElementsByTagName('body')[0]
		if (body === undefined) return
		body.className = (body.className ?? '') + ' ' + path().split('/')[0]
	})

	return (
		<>
			<Navigation />
			<DataProvider>
				<Switch fallback={<FullScreenMap />}>
					<Match when={path().startsWith(`carbon-sink/`)}>
						<Sink />
					</Match>
					<Match when={path().startsWith(`owner/`)}>
						<Owner />
					</Match>
				</Switch>
			</DataProvider>
		</>
	)
}

export default App
