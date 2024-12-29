import { Delete, IconNode, Pencil, PencilOff } from 'lucide'
import { For } from 'solid-js'
import { Dynamic } from 'solid-js/web'

export const LucideIcon = (
	props: {
		icon: IconNode
	} & LucideProps,
) => {
	const [, attrs, children] = props.icon
	const svgProps = {
		'stroke-width': props.strokeWidth ?? attrs.strokeWidth ?? 2,
	}
	return (
		<svg
			{...{ ...attrs, ...svgProps }}
			style={{
				width: `${props.size ?? 24}px`,
				height: `${props.size ?? 24}px`,
			}}
			class={`icon ${props.class ?? ''}`}
		>
			<For each={children}>
				{([elementName, attrs]) => (
					<Dynamic component={elementName} {...attrs} />
				)}
			</For>
		</svg>
	)
}

export type LucideProps = {
	size?: number
	strokeWidth?: number
	class?: string
}

export const Draw = (props: LucideProps) => (
	<LucideIcon icon={Pencil} {...props} />
)
export const NoDraw = (props: LucideProps) => (
	<LucideIcon icon={PencilOff} {...props} />
)
export const Remove = (props: LucideProps) => (
	<LucideIcon icon={Delete} {...props} />
)
