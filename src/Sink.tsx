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

			// Add planet.com data
			fetch(`/data/planet.com/${props.sink.id}-2024-03-21.json`)
				.then((res) => res.json() as Promise<Array<PlanetCarbonData>>)
				.then((pixels) =>
					pixels.filter((p) => p.aboveground_live_carbon_density ?? 0 > 0),
				)
				.then((pixels) => {
					for (const pixelId in pixels) {
						const pixel = pixels[pixelId]
						map.addSource(`pixel-${pixelId}`, {
							type: 'geojson',
							data: {
								type: 'Feature',
								properties: {},
								geometry: {
									type: 'Polygon',
									coordinates: [pixel.pixel_boundary.coordinates[0]],
								},
							},
						})
						map.addLayer({
							id: `pixel-${pixelId}`,
							type: 'fill',
							source: `pixel-${pixelId}`,
							layout: {},
							paint: {
								'fill-color': '#0f0',
								'fill-opacity': pixel.aboveground_live_carbon_density / 100,
							},
						})
					}
				})
				.catch(console.error)
		})

		onCleanup(() => {
			map?.remove()
		})
	})

	return <div ref={ref} class="map" />
}

export default Sink

type PlanetCarbonData = {
	aoi_id: string // e.g. "efdd1bd4-118f-442e-8eb8-39a05f2fed51",
	data_request_id: string // e.g. "2aa0a4cc-8e04-4042-ac16-deb51a8a2ca2",
	crs: string // e.g. "EPSG:4326",
	date: string // e.g. "2024-03-21",
	x: number // e.g. 8.1412875,
	y: number // e.g. 45.1471875,
	pixel_boundary: {
		coordinates: Array<Array<[number, number]>> /* e.g [
			[
				[8.141275, 45.1472],
				[8.141275, 45.147175],
				[8.141300000000001, 45.147175],
				[8.141300000000001, 45.1472],
				[8.141275, 45.1472]
			]
		] */
		type: 'Polygon'
	}
	aboveground_live_carbon_density: number // e.g. 0,
	aboveground_live_carbon_density_uncertainty_lower_bound: number // e.g. 0,
	aboveground_live_carbon_density_uncertainty_upper_bound: number // e.g. 65,
	canopy_cover: number // e.g. 0,
	canopy_cover_uncertainty_lower_bound: number // e.g. 0,
	canopy_cover_uncertainty_upper_bound: number // e.g. 10,
	canopy_height: number // e.g. 0,
	canopy_height_uncertainty_lower_bound: number // e.g. 0,
	canopy_height_uncertainty_upper_bound: number // e.g. 1
}
