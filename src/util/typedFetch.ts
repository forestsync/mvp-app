import { Static, type TSchema } from '@sinclair/typebox'
import { TypeCompiler, ValueError } from '@sinclair/typebox/compiler'

/**
 * A wrapper for fetch that validates the response against a schema using TypeBox.
 *
 * @see https://github.com/sinclairzx81/typebox
 */
export const typedFetch = <Schema extends TSchema>(schema: Schema) => {
	const C = TypeCompiler.Compile(schema)

	return async (args: Parameters<typeof fetch>[0]): Promise<Static<Schema>> => {
		const res = await fetch(args)
		const body = await res.json()
		const firstError = C.Errors(body).First()
		if (firstError !== undefined) {
			throw new ValidationError([...C.Errors(body)])
		}
		return body as Static<typeof schema>
	}
}

export class ValidationError extends Error {
	errors: ValueError[]

	constructor(errors: ValueError[]) {
		super('Validation Error')
		this.errors = errors
		this.name = 'ValidationError'
	}
}
