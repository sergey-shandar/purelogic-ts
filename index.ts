export function createDisposable<T>(init: () => Promise<T>, dispose: (value: T) => Promise<void>): <R>(value: T) => Promise<R> {
    return null;
}
