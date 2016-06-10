import * as flatten from "./flatten";

export type KeyFunc<T> = (value: T) => string;

export type ReduceFunc<T> = (a: T, b: T) => T;

export type ProductFunc<A, B, O> = (a: A, b: B) => O[];

export class Flatten<T, I> {
    constructor(
        public input: Bag<I>,
        public func: flatten.Func<I, T>) {}
}

export class DisjointUnion<T> {
    constructor(
        public a: Bag<T>,
        public b: Bag<T>) {}
}

export class GroupBy<T> {
    constructor(
        public input: Bag<T>,
        public toKey: KeyFunc<T>,
        public reduce: ReduceFunc<T>) {}
}

export class Product<T, A, B> {
    constructor(
        public a: Bag<A>,
        public b: Bag<B>,
        public func: ProductFunc<A, B, T>) {}
}

export interface Visitor<T, R> {
    /**
     * LINQ: SelectMany
     */
    flatten<I>(value: Flatten<T, I>): R;
    disjointUnion(value: DisjointUnion<T>): R;
    one(value: T): R;
    input(): R;
    /**
     * LINQ: GroupBy
     */
    groupBy(value: GroupBy<T>): R;
    product<A, B>(value: Product<T, A, B>): R;
}

export type Implementation<T> = <R>(visitor: Visitor<T, R>) => R;

export class Dif<T> {
    constructor(public value: T, public a: number, public b: number) { }
}

export function one<T>(value: T): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
}

export function input<T>(): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input());
}

let bagCounter: number = 0;

export class Bag<T> {

    id: string;

    constructor(public implementation: Implementation<T>) {
        this.id = bagCounter.toString();
        ++bagCounter;
    }

    /**
     * LINQ: SelectMany
     */
    flatten<O>(func: flatten.Func<T, O>): Bag<O> {
        return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatten(new Flatten(this, func)));
    }
    disjointUnion(b: Bag<T>): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) =>
            visitor.disjointUnion(new DisjointUnion(this, b)));
    }
    /**
     * LINQ: GroupBy
     */
    groupBy<K>(toKey: KeyFunc<T>, reduce: ReduceFunc<T>): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) =>
            visitor.groupBy(new GroupBy(this, toKey, reduce)));
    }
    product<B, O>(b: Bag<B>, func: ProductFunc<T, B, O>): Bag<O> {
        return new Bag(<R>(visitor: Visitor<O, R>) => visitor.product(new Product(this, b, func)));
    }

    /**
     * LINQ: Select
     */
    map<O>(func: (value: T) => O): Bag<O> {
        return this.flatten(value => [func(value)]);
    }
    /**
     * LINQ: Where
     */
    filter(func: (value: T) => boolean): Bag<T> {
        return this.flatten(value => func(value) ? [value] : []);
    }
    compact(): Bag<T> {
        return this.filter(Boolean);
    }
    /**
     * LINQ: Accumulate
     */
    reduce(func: ReduceFunc<T>): Bag<T> {
        return this.groupBy(() => null, func);
    }
    dif(b: Bag<T>): Bag<Dif<T>> {
        const toDif = (bag: Bag<T>, a: number, b: number) =>
            bag.map(v => new Dif(v, a, b));
        const aDif = toDif(this, 1, 0);
        const bDif = toDif(b, 0, 1);
        return aDif.disjointUnion(bDif).groupBy(
            v => JSON.stringify(v.value),
            (x, y) => new Dif(x.value, x.a + y.a, x.b + y.b));
    }
}
