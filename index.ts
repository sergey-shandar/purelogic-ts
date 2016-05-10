export interface DeferredDisposable<T> {
    using<R>(f: (value: T) => Promise<R>): Promise<R>;
    map<R>(f: (value: T) => R): DeferredDisposable<R>;
    and<R>(f: (value: T) => DeferredDisposable<R>): DeferredDisposable<R>;
}

export function deferredDisposable<T>(init: () => Promise<T>, dispose: (value: T) => Promise<void>):
    DeferredDisposable<T> {
    
    return null;
}
