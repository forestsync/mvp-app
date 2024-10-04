import {
	Accessor,
	createContext,
	createEffect,
	createSignal,
	ParentProps,
	useContext,
} from 'solid-js'
export const RouterContext = createContext<{ path: Accessor<string> }>(
	undefined as any,
)
export const useRouter = () => {
	const context = useContext(RouterContext)

	if (!context) {
		throw new Error('useRouter: cannot find a DataContext')
	}
	return context
}

export const RouterProvider = (props: ParentProps) => {
	const [path, setPath] = createSignal<string>(document.location.hash.slice(1))

	createEffect(() => {
		const hashChange = () => {
			setPath(document.location.hash.slice(1))
		}
		window.addEventListener('hashchange', hashChange)
		return () => {
			window.removeEventListener('hashchange', hashChange)
		}
	})

	return (
		<RouterContext.Provider value={{ path }}>
			{props.children}
		</RouterContext.Provider>
	)
}
