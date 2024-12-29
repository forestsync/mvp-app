import { LngLat, Map as MapLibreGlMap, Marker, Popup } from 'maplibre-gl'
import polylabel from 'polylabel'
import { createEffect, createSignal, onCleanup, Show } from 'solid-js'
import { useData } from './context/Data.js'
import { Draw, NoDraw, Remove } from './LucideIcon.jsx'
import { createMap } from './map/createMap.js'
import { polylabelToCoordinates } from './polylabelToCoordinates.jsx'

import './FullScreenMap.css'

const asNumber = (s: string, fallback: number) => {
	const n = Number(s)
	if (isNaN(n)) {
		return fallback
	}
	return n
}

const FullScreenMap = () => {
	const data = useData()
	const [drawing, setDrawing] = createSignal(false)
	const [coords, setCoords] = createSignal<Array<LngLat>>([])
	const [loaded, setLoaded] = createSignal(false)

	let ref!: HTMLDivElement
	let map: MapLibreGlMap

	createEffect(() => {
		const startState = window.location.hash.match(
			/#map\/([^/]+)\/([^/]+)\/([^/]+)/,
		)
		const [_, lat, lng, zoom] = startState ?? []
		map = createMap(
			ref,
			{
				lat: asNumber(lat, 59.91750699564229),
				lng: asNumber(lng, 10.740165846009115),
			},
			{ zoom: asNumber(zoom, 8) },
		)

		map.on('load', () => {
			setLoaded(true)
			for (const sink of data.carbonSinks) {
				const polyCenter =
					sink.polygon !== undefined
						? polylabelToCoordinates(polylabel([sink.polygon], 0.000001))
						: undefined
				const [lat, lng] = polyCenter ?? sink.geolocation
				try {
					new Marker()
						.setLngLat({ lng, lat })
						.setPopup(
							new Popup({ offset: 25 }).setHTML(
								[
									`<h3>${sink.name}</h3>`,
									`<p>${sink.CO2storedTons} tons of CO2 stored.</p>`,
									`<p><a href="${import.meta.env.BASE_URL}#carbon-sink/${sink.id}">Details</a></p>`,
								].join(''),
							),
						)
						.addTo(map)
				} catch (err) {
					console.error(err)
				}
				// Polygons
				if (sink.polygon !== undefined) {
					map.addSource(sink.id, {
						type: 'geojson',
						data: {
							type: 'Feature',
							properties: {},
							geometry: {
								type: 'Polygon',
								coordinates: [sink.polygon],
							},
						},
					})
					map.addLayer({
						id: sink.id,
						type: 'fill',
						source: sink.id,
						layout: {},
						paint: {
							'fill-color': '#088',
							'fill-opacity': 0.8,
						},
					})
					// Label
					map.addSource(`${sink.id}-label-source`, {
						type: 'geojson',
						data: {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [lng, lat],
							},
							properties: {},
						},
					})
					map.addLayer({
						id: `${sink.id}-label`,
						type: 'symbol',
						source: `${sink.id}-label-source`,
						layout: {
							'symbol-placement': 'point',
							'text-field': `${sink.name}\n${sink.CO2storedTons} tons`,
							'text-font': [glyphFonts.bold],
							'text-offset': [0, 0],
						},
						paint: {
							'text-color': '#3ace1c',
						},
					})
				}
			}
		})

		map.on('moveend', () => {
			const { lng, lat } = map.getCenter()
			window.history.replaceState(
				undefined,
				'',
				`${import.meta.env.BASE_URL}#map/${lat.toFixed(6)}/${lng.toFixed(6)}/${map.getZoom()}`,
			)
		})

		map.on('click', (e) => {
			if (drawing()) {
				setCoords([...coords(), e.lngLat])
			}
		})
	})

	// Draw first point
	createEffect(() => {
		if (map === undefined) return
		if (loaded() === false) return
		if (map.getSource('start-point') !== undefined) {
			map.removeLayer('start-point-drawing')
			map.removeSource('start-point')
		}
		if (coords().length === 1) {
			const point = coords()[0]
			map.addSource('start-point', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'Point',
						coordinates: [point.lng, point.lat],
					},
				},
			})
			map.addLayer({
				id: 'start-point-drawing',
				type: 'circle',
				source: 'start-point',
				paint: {
					'circle-color': '#80ed99',
					'circle-radius': 10,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#222222',
				},
			})
		}
	})

	// Draw polygon
	createEffect(() => {
		if (map === undefined) return
		if (loaded() === false) return
		if (coords().length < 1) return
		if (map.getSource('drawing') !== undefined) {
			map.removeLayer('drawing')
			map.removeLayer('drawing-dots')
			map.removeSource('drawing')
		}
		map.addSource('drawing', {
			type: 'geojson',
			data: {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Polygon',
					coordinates: [coords().map((c) => [c.lng, c.lat])],
				},
			},
		})
		map.addLayer({
			id: 'drawing',
			type: 'fill',
			source: 'drawing',
			layout: {},
			paint: {
				'fill-color': '#088',
				'fill-opacity': 0.8,
			},
		})
		map.addLayer({
			id: 'drawing-dots',
			type: 'circle',
			source: 'drawing',
			paint: {
				'circle-color': '#80ed99',
				'circle-radius': 10,
				'circle-stroke-width': 2,
				'circle-stroke-color': '#222222',
			},
		})
	})

	onCleanup(() => {
		map?.remove()
	})

	return (
		<div id="map-container">
			<nav>
				<Show
					when={drawing()}
					fallback={
						<button onClick={() => setDrawing(true)}>
							<Draw />
						</button>
					}
				>
					<button onClick={() => setDrawing(false)}>
						<NoDraw />
					</button>
					<button onClick={() => setCoords(coords().slice(0, -1))}>
						<Remove />
					</button>
				</Show>
			</nav>
			<div id="map" ref={ref} />
		</div>
	)
}

export default FullScreenMap

// See https://docs.aws.amazon.com/location/latest/developerguide/esri.html for available fonts
export const glyphFonts = {
	regular: 'Ubuntu Regular',
	bold: 'Ubuntu Medium',
} as const
