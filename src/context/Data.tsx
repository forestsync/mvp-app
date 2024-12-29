import { Static, Type } from '@sinclair/typebox'
import {
	createContext,
	createResource,
	Show,
	useContext,
	type ParentProps,
} from 'solid-js'
import { typedFetch } from '../util/typedFetch'

const ID = Type.String({
	minLength: 1,
	example: ['c5e6bc75-aa93-41e3-9899-f1de5222e564'],
	title: 'UUIDv4',
})

const GeoCoordinates = Type.Tuple(
	[
		Type.Number({ minimum: -90, maximum: 90, title: 'Latitude' }),
		Type.Number({ minimum: -180, maximum: 180, title: 'Longitude' }),
	],
	{ title: 'GeoCoordinates' },
)

export const CarbonSinkSchema = Type.Object(
	{
		id: Type.String({
			minLength: 1,
			example: ['c5e6bc75-aa93-41e3-9899-f1de5222e564	'],
		}),
		name: Type.String({ minLength: 1, example: ['Aberdeen 6 wood'] }),
		owner: Type.String({ minLength: 1, example: ['Sophia Mitchell'] }),
		ownerID: ID,
		country: Type.String({ minLength: 1, example: ['UK'] }),
		sizeHa: Type.Number({ minimum: 0, example: [2.7] }),
		plantedDate: Type.Integer({ minimum: 0, example: [43840] }),
		CO2storedTons: Type.Number({
			minimum: 0,
			example: [108],
			title: 'CO2 stored (tons)',
			description: 'Amount of CO2 stored in tons.',
		}),
		geolocation: GeoCoordinates,
		polygon: Type.Optional(Type.Array(GeoCoordinates)),
	},
	{ title: 'Carbon Sink' },
)

const OwnerSchema = Type.Object(
	{
		id: Type.String({
			minLength: 1,
			example: ['c5e6bc75-aa93-41e3-9899-f1de5222e564	'],
		}),
		name: Type.String({ minLength: 1, example: ['Aberdeen 6 wood'] }),
		country: Type.String({ minLength: 1, example: ['UK'] }),
	},
	{ title: 'Owner' },
)

export type Data = {
	carbonSinks: Array<Static<typeof CarbonSinkSchema>>
	owners: Array<Static<typeof OwnerSchema>>
}

export const fetchData = (indexURL: URL) => async (): Promise<Data> => {
	try {
		const index = await typedFetch(
			Type.Array(
				Type.Object({
					sheetId: Type.Integer({ minimum: 0 }),
					title: Type.String({ minLength: 1, examples: ['polluter'] }),
					link: Type.String({ minLength: 1, examples: ['./polluter.json'] }),
				}),
			),
		)(indexURL)

		const data: Data = {
			carbonSinks: [],
			owners: [],
		}

		await Promise.all([
			// fetch sources
			(async () => {
				const carbonSinksSource = index.find(
					(sheet) => sheet.title === 'carbon sink',
				)
				if (carbonSinksSource === undefined) {
					console.error(`Carbon sinks link not found.`)
				} else {
					const carbonSinks = await typedFetch(Type.Array(CarbonSinkSchema))(
						new URL(carbonSinksSource.link, indexURL),
					)

					data.carbonSinks = carbonSinks ?? []
				}
			})(),
			// fetch owners
			(async () => {
				const ownersSource = index.find((sheet) => sheet.title === 'landowner')
				if (ownersSource === undefined) {
					console.error(`Owners link not found.`)
				} else {
					const owners = await typedFetch(Type.Array(OwnerSchema))(
						new URL(ownersSource.link, indexURL),
					)

					data.owners = owners ?? []
				}
			})(),
		])

		return data
	} catch (err) {
		console.error(err)
		throw new Error(
			`Failed to fetch parameters from registry (${indexURL.toString()}): ${
				(err as Error).message
			}!`,
		)
	}
}

export const DataContext = createContext<Data>(undefined as any)
export const useData = () => {
	const context = useContext(DataContext)

	if (!context) {
		throw new Error('useData: cannot find a DataContext')
	}
	return context
}

export const DataProvider = (props: ParentProps) => {
	const [parameters] = createResource(
		fetchData(new URL('https://forestsync.github.io/mvp-data/')),
	)

	return (
		<Show when={parameters() !== undefined} fallback={<p>Loading ...</p>}>
			<DataContext.Provider value={parameters()}>
				{props.children}
			</DataContext.Provider>
		</Show>
	)
}
