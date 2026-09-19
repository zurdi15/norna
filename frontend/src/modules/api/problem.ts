import type {NornaErrorModel} from '@/client/generated'

// With throwOnError, the generated client throws the parsed problem+json body itself.
export type ApiProblem = NornaErrorModel & {message?: string}

export function isApiProblem(error: unknown): error is ApiProblem {
	return typeof error === 'object'
		&& error !== null
		&& !(error instanceof Error)
		&& (typeof (error as ApiProblem).status === 'number' || typeof (error as ApiProblem).code === 'number')
}

export function problemStatus(error: unknown): number | undefined {
	return isApiProblem(error) ? error.status : undefined
}

export function problemCode(error: unknown): number | undefined {
	return isApiProblem(error) ? error.code : undefined
}
