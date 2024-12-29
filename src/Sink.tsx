import { Static } from '@sinclair/typebox'
import { LngLatBounds, Map as MapLibreGlMap, Marker } from 'maplibre-gl'
import polylabel from 'polylabel'
import { createEffect, onCleanup, ParentProps, Show } from 'solid-js'
import { CarbonSinkSchema, useData } from './context/Data.js'
import { useRouter } from './context/Router.js'
import { createMap } from './map/createMap.js'
import { polylabelToCoordinates } from './polylabelToCoordinates.jsx'
import { calculateSize } from './util/calculateSize.js'
import { calculateStorage } from './util/calculateStorage.js'
import { co2, hectares } from './util/format.js'
import { intToDate } from './util/intToDate.js'

const Sink = () => {
	const { path } = useRouter()
	const data = useData()
	const id = path().split('/')[1]
	const sink = data.carbonSinks.find((s) => s.id === id)
	if (sink === undefined) return null
	return <SinkDetails sink={sink} />
}

const SinkDetails = (props: { sink: Static<typeof CarbonSinkSchema> }) => {
	const location = props.sink.geolocation
	const plantedDate = intToDate(props.sink.plantedDate)
	const hasPolygon = props.sink.polygon !== undefined
	const size = hasPolygon
		? calculateSize({ polygon: props.sink.polygon! })
		: props.sink.sizeHa
	return (
		<main>
			<section>
				<h2>{props.sink.name}</h2>
				<dl>
					<dt>ID</dt>
					<dd>{props.sink.id}</dd>
					<dt>Size</dt>
					<dd>
						{hectares.format(size)} ha
						<br />
						<Show when={hasPolygon}>
							<small>calculated based on sink dimension</small>
						</Show>
					</dd>
					<dt>Planted</dt>
					<dd>{plantedDate.toISOString().slice(0, 10)}</dd>
					<dt>
						CO<sub>2</sub> stored
					</dt>
					<dd>
						<Show
							when={hasPolygon}
							fallback={co2.format(props.sink.CO2storedTons)}
						>
							{co2.format(calculateStorage(size, plantedDate))} t<br />
							<small>
								calculated based on size and age (10 tons per year per ha)
							</small>
						</Show>
					</dd>
					<dt>Owner</dt>
					<dd>
						<a href={`${import.meta.env.BASE_URL}#owner/${props.sink.ownerID}`}>
							{props.sink.owner}
						</a>
					</dd>
					<dt>Country</dt>
					<dd>{props.sink.country}</dd>
				</dl>
			</section>
			<Show when={location !== undefined}>
				<SinkMap sink={props.sink} />
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
						(bounds, coord) =>
							bounds.extend({
								lon: coord[0],
								lat: coord[1],
							}),
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
