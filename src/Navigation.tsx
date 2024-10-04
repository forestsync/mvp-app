import './Navigation.css'

const Navigation = () => (
	<nav>
		<a href={`${import.meta.env.BASE_URL}#`}>
			<h1>Forest Sync</h1>
		</a>
	</nav>
)

export default Navigation
