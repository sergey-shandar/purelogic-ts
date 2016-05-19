export interface Visitor<T, R> {
    flatten<S>(input: Bag<S>, func: (value: S) => [T]): R;
    disjointUnion(a: Bag<T>, b: Bag<T>): R;
    one(value: T): R;
    input(): R;
}
export interface Accept<T> {
    <R>(visitor: Visitor<T, R>): R;
}
export interface Bag<T> {
    accept: Accept<T>;
    flatten<N>(func: (value: T) => [N]): Bag<N>;
    disjointUnion(b: Bag<T>): Bag<T>;
    map<N>(func: (value: T) => N): Bag<N>;
}
export declare function bag<T>(accept: Accept<T>): Bag<T>;
export declare function one<T>(value: T): Bag<T>;
export declare function input<T>(): Bag<T>;
