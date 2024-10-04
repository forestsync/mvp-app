import { Show } from 'solid-js'
import { useData } from './context/Data.js'
import { useRouter } from './context/Router.js'

const Owner = () => {
	const { path } = useRouter()
	const data = useData()
	const id = path().split('/')[1]
	const Owner = data.owners.find((s) => s.id === id)
	return (
		<main>
			<section>
				<h2>{Owner!.name}</h2>
				<dl>
					<dt>ID</dt>
					<dd>{id}</dd>
					<Show when={Owner !== undefined}>
						<dt>Country</dt>
						<dd>{Owner!.country}</dd>
					</Show>
				</dl>
			</section>
		</main>
	)
}

export default Owner
