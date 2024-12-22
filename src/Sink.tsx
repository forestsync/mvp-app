import { Map as MapLibreGlMap, Marker } from 'maplibre-gl'
import { createEffect, onCleanup, ParentProps, Show } from 'solid-js'
import { useData } from './context/Data.js'
import { useRouter } from './context/Router.js'
import { createMap } from './map/createMap.js'
import { intToDate } from './util/intToDate.js'

const Sink = () => {
	const { path } = useRouter()
	const data = useData()
	const id = path().split('/')[1]
	const sink = data.carbonSinks.find((s) => s.id === id)
	const location = sink?.geolocation
	return (
		<main>
			<section>
				<h2>{sink!.name}</h2>
				<dl>
					<dt>ID</dt>
					<dd>{id}</dd>
					<Show when={sink !== undefined}>
						<dt>Owner</dt>
						<dd>
							<a href={`${import.meta.env.BASE_URL}#owner/${sink!.ownerID}`}>
								{sink!.owner}
							</a>
						</dd>
						<dt>Country</dt>
						<dd>{sink!.country}</dd>
						<dt>Size</dt>
						<dd>{sink!.sizeHa} ha</dd>
						<dt>Planted</dt>
						<dd>{intToDate(sink!.plantedDate).toISOString().slice(0, 10)}</dd>
						<dt>
							CO<sub>2</sub>
						</dt>
						<dd>{sink!.CO2storedTons} t</dd>
					</Show>
				</dl>
			</section>
			<Show when={location !== undefined}>
				<SinkMap lat={location![0]} lon={location![1]} />
			</Show>
		</main>
	)
}

const SinkMap = (
	props: ParentProps<{
		lat: number
		lon: number
	}>,
) => {
	let ref!: HTMLDivElement
	let map: MapLibreGlMap

	createEffect(() => {
		map = createMap(
			ref,
			{ lat: props.lat, lng: props.lon },
			{ zoom: 10, attributionControl: false },
		)

		map.on('load', () => {
			new Marker().setLngLat({ lat: props.lat, lng: props.lon }).addTo(map)
		})

		onCleanup(() => {
			map?.remove()
		})
	})

	return <div ref={ref} class="map" />
}

export default Sink
