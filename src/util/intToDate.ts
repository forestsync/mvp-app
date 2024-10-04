// Create a new Date object using the integer date value as the number of days since December 30, 1899
export const intToDate = (days: number): Date => {
	const baseDate = new Date(1899, 11, 30) // December 30, 1899
	const millisecondsPerDay = 24 * 60 * 60 * 1000
	return new Date(baseDate.getTime() + days * millisecondsPerDay)
}
