import * as flatten from "./flatten";

export type KeyFunc<I, K> = (value: I) => K;

export type ReduceFunc<T> = (a: T, b: T) => T;

export type ProductFunc<A, B, O> = (a: A, b: B) => O[];

export interface Visitor<T, R> {
    /**
     * LINQ: SelectMany
     */
    flatten<I>(input: Bag<I>, func: flatten.Func<I, T>): R;
    disjointUnion(a: Bag<T>, b: Bag<T>): R;
    one(value: T): R;
    input(): R;
    /**
     * LINQ: GroupBy
     */
    groupBy<K>(input: Bag<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): R;
    product<A, B>(a: Bag<A>, b: Bag<B>, func: ProductFunc<A, B, T>): R;
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

    id: number;

    constructor(public implementation: Implementation<T>) {
        this.id = bagCounter;
        ++bagCounter;
    }

    /**
     * LINQ: SelectMany
     */
    flatten<O>(func: flatten.Func<T, O>): Bag<O> {
        return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatten(this, func));
    }
    disjointUnion(b: Bag<T>): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.disjointUnion(this, b));
    }
    /**
     * LINQ: GroupBy
     */
    groupBy<K>(toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(b: Bag<B>, func: ProductFunc<T, B, O>): Bag<O> {
        return new Bag(<R>(visitor: Visitor<O, R>) => visitor.product(this, b, func));
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
        return aDif.disjointUnion(bDif)
            .groupBy(v => v.value, (x, y) => new Dif(x.value, x.a + y.a, x.b + y.b));
    }
}
