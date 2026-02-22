// Primarily for utility types that are applicable even in static assets

export type DeepReadonly<T> =
	T extends Array<infer U>
		? ReadonlyArray<DeepReadonly<U>>
		: T extends object
			? { readonly [K in keyof T]: DeepReadonly<T[K]> }
			: T;
