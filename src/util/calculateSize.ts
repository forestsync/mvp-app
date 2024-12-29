import { area, polygon } from '@turf/turf'

export const calculateSize = (sink: { polygon: Array<[number, number]> }) => {
	const [first, ...rest] = sink.polygon.map((c) => [c[1], c[0]])
	const p = polygon([[first, ...rest, first]])
	return area(p) / 10000 // Convert square meters to hectares
}
