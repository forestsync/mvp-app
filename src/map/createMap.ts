import {
	Map as MapLibreGlMap,
	ScaleControl,
	type MapOptions,
} from 'maplibre-gl'

export const createMap = (
	container: HTMLDivElement,
	{ lng, lat }: { lat: number; lng: number },
	options?: Partial<MapOptions>,
): MapLibreGlMap => {
	const map = new MapLibreGlMap({
		container,
		center: [lng, lat],
		refreshExpiredTiles: false,
		trackResize: true,
		keyboard: false,
		renderWorldCopies: true,
		zoom: options?.zoom ?? 4,
		...options,
		style: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_API_KEY}`,
	})
	map.addControl(
		new ScaleControl({
			maxWidth: 100,
			unit: 'metric',
		}),
	)
	return map
}
