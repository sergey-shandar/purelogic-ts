/**
 * I - input
 * O - output
 */
export class Input<O, I> {
    bag: BagImplementation<I>;
    func: (value: I) => O[];
}

/**
 * O - output
 * R - result
 */
export interface InputVisitor<O, R> {
    /**
     * I - input
     */
    <I>(input: Input<O, I>): R;
}

/**
 * O - output
 */
export interface InputImplementation<O> {
    <R>(visitor: InputVisitor<O, R>): R;
}

/**
 * 
 */
export function inputImplementation<O, I>(input: Input<O, I>): InputImplementation<O> {
    return <R>(visitor: InputVisitor<O, R>) => visitor(input);
}

export interface BagVisitor<O, R> {
    <I>(bag: Bag<O, I>): R;
}

export interface BagImplementation<O> {
    <R>(visitor: BagVisitor<O, R>): R;
}

export function bagImplementation<O, I>(bag: Bag<O, I>): BagImplementation<O> {
    return <R>(visitor: BagVisitor<O, R>) => visitor(bag);
}

/**
 * - one(value: T): R;
 * - input(): R;
 * - groupBy<K>(input: Bag<T>, toKey: (value: T) => K, reduce: (a: T, b: T) => T): R;
 * - product<A, B>(a: Bag<A>, b: Bag<B>, func: (a: A, b: B) => T[]): R;
 */
export class Bag<O, I> {
    inputs: InputImplementation<I>[];
    constructor(inputs: InputImplementation<I>[]) {
        this.inputs = inputs;
    }
}
