export type Func<I, O> = (value: I) => O[];

export function identity<T>(value: T): T[] { return [value]; }
