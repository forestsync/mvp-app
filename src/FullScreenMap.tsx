import { Map as MapLibreGlMap, Marker, Popup } from 'maplibre-gl'
import { createEffect, onCleanup } from 'solid-js'
import { useData } from './context/Data.js'
import { createMap } from './map/createMap.js'

import './FullScreenMap.css'

const FullScreenMap = () => {
	const data = useData()

	let ref!: HTMLDivElement
	let map: MapLibreGlMap

	createEffect(() => {
		map = createMap(
			ref,
			{ lat: 59.91750699564229, lng: 10.740165846009115 },
			{ zoom: 8 },
		)

		map.on('load', () => {
			for (const sink of data.carbonSinks) {
				const [lat, lng] = sink.geolocation
					.split(',')
					.map((s) => parseFloat(s.trim()))
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
			}
		})
	})

	onCleanup(() => {
		map?.remove()
	})

	return <div id="map" ref={ref} />
}

export default FullScreenMap
