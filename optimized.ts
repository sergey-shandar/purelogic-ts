import * as flatten from "./flatten";
import { KeyFunc, ReduceFunc, ProductFunc } from "./bag";
import * as array from "./array";

export interface BagVisitor<T, R> {
    input(id: number): R;
    one(value: T): R;
    groupBy<K>(inputs: Links<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): R;
    product<A, B>(a: Links<A>, b: Links<B>, func: ProductFunc<A, B, T>): R;
}

export type BagImplementation<T> = <R>(visitor: BagVisitor<T, R>) => R;

export class Bag<T> {
    constructor(public implementation: BagImplementation<T>) { }
    link<O>(func: flatten.Func<T, O>): Link<O> {
        return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(this, func));
    }
    identityLink(): Link<T> {
        return this.link(flatten.identity);
    }
}

export type LinkVisitor<T, R> = <I>(bag: Bag<I>, func: flatten.Func<I, T>) => R;

export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

export class Link<T> {
    constructor(public implementation: LinkImplementation<T>) {}
    flatten<O>(func: flatten.Func<T, O>): Link<O> {
        function visitor<I>(b: Bag<I>, f: flatten.Func<I, T>): Link<O> {
            return b.link(value => array.ref(f(value)).flatten(func));
        }
        return this.implementation(visitor);
    }
    bagEqual<B>(b: Bag<B>): boolean {
        function visitor<I>(a: Bag<I>, f: flatten.Func<I, T>): boolean {
            return (<any> b) === a;
        }
        return this.implementation(visitor);
    }
    addFunc(getFunc: <I>() => flatten.Func<I, T>): Link<T> {
        function visitor<I>(a: Bag<I>, f: flatten.Func<I, T>): Link<T> {
            const fNew = getFunc<I>();
            return a.link(i => f(i).concat(fNew(i)));
        }
        return this.implementation(visitor);
    }
}

export class Links<T> {
    constructor(public array: Link<T>[]) { }
    groupBy<K>(toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): Bag<T> {
        return new Bag(<R>(visitor: BagVisitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(b: Links<B>, func: ProductFunc<T, B, O>): Bag<O> {
        return new Bag(<R>(visitor: BagVisitor<O, R>) => visitor.product(this, b, func));
    }
    flatten<O>(func: flatten.Func<T, O>): Links<O> {
        return new Links(this.array.map(link => link.flatten(func)));
    }
    disjointUnion(b: Links<T>): Links<T> {
        const aLinks: Link<T>[] = [];
        this.array.forEach(aLink => aLinks.push(aLink));
        const bLinks: Link<T>[] = [];
        b.array.forEach(bLink => {
            function bVisitor<B>(bBag: Bag<B>, f: flatten.Func<B, T>): void {
                const i = aLinks.findIndex(aLink => aLink.bagEqual(bBag));
                function getFunc<I>(): flatten.Func<I, T> { return <any> f; }
                bLinks.push(i !== undefined
                    ? array.ref(aLinks).spliceOne(i).addFunc(getFunc)
                    : bLink
                );
            }
            bLink.implementation(bVisitor);
        });
        return null;
    }
}

export function input<T>(id: number): Bag<T> {
    return new Bag(<R>(visitor: BagVisitor<T, R>) => visitor.input(id));
}

export function one<T>(value: T): Bag<T> {
    return new Bag(<R>(visitor: BagVisitor<T, R>) => visitor.one(value));
}
