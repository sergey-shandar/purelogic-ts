import { FlattenFunc, KeyFunc, ReduceFunc, ProductFunc } from "./bag";

interface Visitor<T, R> {
    input(id: number): R;
    one(value: T): R;
    groupBy<K>(inputs: Links<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): R;
    product<A, B>(a: Links<A>, b: Links<B>, func: ProductFunc<A, B, T>): R;
}

type Implementation<T> = <R>(visitor: Visitor<T, R>) => R;

function flattenIdentity<T>(value: T): T[] {
    return [value];
}

class Bag<T> {
    constructor(public implementation: Implementation<T>) { }
    toLinks(): Links<T> {
        return new Links([link(this, flattenIdentity)]);
    }
}

type LinkVisitor<T, R> = <I>(bag: Bag<I>, func: FlattenFunc<I, T>) => R;

type Link<T> = <R>(visitor: LinkVisitor<T, R>) => R;

function link<I, O>(bag: Bag<I>, func: FlattenFunc<I, O>): Link<O> {
    return <R>(visitor: LinkVisitor<O, R>) => visitor(bag, func);
}

function arrayFlatten<I, O>(a: I[], f: FlattenFunc<I, O>): O[] {
    const result: O[] = [];
    return result.concat(...a.map(f));
}

class Links<T> {
    constructor(public array: Link<T>[]) { }
    groupBy<K>(toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(b: Links<B>, func: ProductFunc<T, B, O>): Bag<O> {
        return new Bag(<R>(visitor: Visitor<O, R>) => visitor.product(this, b, func));
    }
    flatten<O>(func: FlattenFunc<T, O>): Links<O> {
        function visitor<I>(b: Bag<I>, f: FlattenFunc<I, T>): Link<O> {
            return link(b, value => arrayFlatten(f(value), func));
        }
        return new Links(this.array.map(x => x(visitor)));
    }
}

function input<T>(id: number): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input(id));
}

function one<T>(value: T): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
}
