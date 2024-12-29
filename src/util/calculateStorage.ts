export const calculateStorage = (sizeHa: number, plantedDate: Date) =>
	Math.max(
		0,
		(new Date().getFullYear() - plantedDate.getFullYear()) * 10 * sizeHa,
	)
