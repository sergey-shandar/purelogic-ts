export class Input<T, I> {
    input: BagImplementation<I>;
    func: (value: I) => T[];
}

export interface InputVisitor<T, R> {
    <I>(input: Input<T, I>): R;
}

export interface InputImplementation<T> {
    <R>(visitor: InputVisitor<T, R>): R;
}

export function inputImplementation<T, I>(input: Input<T, I>): InputImplementation<T> {
    return <R>(visitor: InputVisitor<T, R>) => visitor(input);
}

export interface BagVisitor<T, R> {
    <I>(bag: Bag<T, I>): R;
}

export interface BagImplementation<T> {
    <R>(visitor: BagVisitor<T, R>): R;
}

export function bagImplementation<T, I>(input: Bag<T, I>): BagImplementation<T> {
    return <R>(visitor: BagVisitor<T, R>) => visitor(input);
}

export class Bag<T, I> {
    inputs: InputImplementation<I>[];
    constructor(inputs: InputImplementation<I>[]) {
        this.inputs = inputs;
    }
}
