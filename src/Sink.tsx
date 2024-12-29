import { Static } from '@sinclair/typebox'
import { LngLatBounds, Map as MapLibreGlMap, Marker } from 'maplibre-gl'
import polylabel from 'polylabel'
import { createEffect, onCleanup, ParentProps, Show } from 'solid-js'
import { CarbonSinkSchema, useData } from './context/Data.js'
import { useRouter } from './context/Router.js'
import { createMap } from './map/createMap.js'
import { polylabelToCoordinates } from './polylabelToCoordinates.jsx'
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
				<SinkMap sink={sink!} />
			</Show>
		</main>
	)
}

const SinkMap = (
	props: ParentProps<{
		sink: Static<typeof CarbonSinkSchema>
	}>,
) => {
	let ref!: HTMLDivElement
	let map: MapLibreGlMap

	createEffect(() => {
		const polyCenter =
			props.sink.polygon !== undefined
				? polylabelToCoordinates(polylabel([props.sink.polygon], 0.000001))
				: undefined
		const [lat, lng] = polyCenter ?? props.sink.geolocation

		map = createMap(ref, { lat, lng }, { zoom: 10, attributionControl: false })

		map.on('load', () => {
			new Marker().setLngLat({ lat, lng }).addTo(map)

			if ((props.sink.polygon?.length ?? 0) > 2) {
				map.addSource(props.sink.id, {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'Polygon',
							coordinates: [props.sink.polygon!],
						},
					},
				})
				map.addLayer({
					id: props.sink.id,
					type: 'fill',
					source: props.sink.id,
					layout: {},
					paint: {
						'fill-color': '#088',
						'fill-opacity': 0.8,
					},
				})

				try {
					const first = props.sink.polygon![0]
					const bounds = props.sink.polygon!.reduce(
						(bounds, coord) => {
							console.log(bounds, coord)
							return bounds.extend({
								lon: coord[0],
								lat: coord[1],
							})
						},
						new LngLatBounds({ lat: first[0], lon: first[1] }),
					)

					map.fitBounds(bounds, {
						padding: 20,
					})
				} catch (err) {
					console.error(err)
				}
			}
		})

		onCleanup(() => {
			map?.remove()
		})
	})

	return <div ref={ref} class="map" />
}

export default Sink
