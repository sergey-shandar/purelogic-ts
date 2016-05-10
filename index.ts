export function deferredDisposable<T>(init: () => Promise<T>, dispose: (value: T) => Promise<void>):
    <R>(f: (value: T) => Promise<R>) => Promise<R> {
    
    return null;
}
