import { area, polygon } from '@turf/turf'
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

		createEffect(() => {
			if (drawing()) {
				map.getCanvas().style.cursor = 'crosshair'
			} else {
				map.getCanvas().style.cursor = 'default'
			}
		})
	})

	// Draw polygon
	createEffect(() => {
		if (map === undefined) return
		if (loaded() === false) return
		// Remove old drawing
		if (map.getLayer('drawing') !== undefined) map.removeLayer('drawing')
		if (map.getLayer('drawing-dots') !== undefined)
			map.removeLayer('drawing-dots')
		if (map.getLayer('drawing-label') !== undefined)
			map.removeLayer('drawing-label')
		if (map.getSource('drawing') !== undefined) map.removeSource('drawing')
		if (map.getSource('drawing-label-source') !== undefined)
			map.removeSource('drawing-label-source')
		// Nothing to draw
		if (coords().length === 0) return
		// Draw new
		if (coords().length < 3) {
			// Just draw points
			map.addSource('drawing', {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'MultiPoint',
						coordinates: coords().map((c) => [c.lng, c.lat]),
					},
				},
			})
		} else {
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
		}
		map.addLayer({
			id: 'drawing-dots',
			type: 'circle',
			source: 'drawing',
			paint: {
				'circle-color': '#80ed99',
				'circle-radius': 5,
				'circle-stroke-color': '#222222',
			},
		})
		// Add label with size
		if (coords().length >= 3) {
			const [first, ...rest] = coords().map((c) => [c.lat, c.lng])
			const p = polygon([[first, ...rest, first]])
			const a = area(p) / 10000 // Convert square meters to hectares
			const polyCenter = polylabelToCoordinates(
				polylabel([coords().map((c) => [c.lat, c.lng])], 0.000001),
			)
			map.addSource(`drawing-label-source`, {
				type: 'geojson',
				data: {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: polyCenter,
					},
					properties: {},
				},
			})
			map.addLayer({
				id: `drawing-label`,
				type: 'symbol',
				source: `drawing-label-source`,
				layout: {
					'symbol-placement': 'point',
					'text-field': `${a.toFixed(2)} ha`,
					'text-font': [glyphFonts.bold],
					'text-offset': [0, 0],
				},
				paint: {
					'text-color': '#3ace1c',
				},
			})
			console.log(
				'Polygon',
				coords()
					.map((c) => [c.lng, c.lat])
					.map((c) => c.join(' '))
					.join(', '),
			)
			console.log('Area', a, 'ha')
		}
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
