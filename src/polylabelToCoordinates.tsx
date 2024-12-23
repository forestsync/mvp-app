import polylabel from 'polylabel'

export const polylabelToCoordinates = (label: ReturnType<typeof polylabel>) => {
	return [label[1], label[0]]
}
