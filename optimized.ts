import { FlattenFunc, KeyFunc, ReduceFunc, ProductFunc } from "./bag";
import { arrayRef } from "./array-ref";

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

type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R; 

class Link<T> {
    constructor(public implementation: LinkImplementation<T>) {}
    flatten<O>(func: FlattenFunc<T, O>): Link<O> {
        function visitor<I>(b: Bag<I>, f: FlattenFunc<I, T>): Link<O> {
            return link(b, value => arrayRef(f(value)).flatten(func));
        }
        return this.implementation(visitor);        
    }
}

function link<I, O>(bag: Bag<I>, func: FlattenFunc<I, O>): Link<O> {
    return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(bag, func));
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
        return new Links(this.array.map(link => link.flatten(func)));
    }
    /*
    disjointUnion(b: Links<T>): Links<T> {
        const aLinks: Link<T>[] = [];
        this.array.forEach(aLink => aLinks.push(aLink));
        const bLinks: Link<T>[] = [];        
        b.array.forEach(bLink => {
            function bVisitor<B>(bBag: Bag<B>, f: FlattenFunc<B, T>): void {
                function bagEqual<A>(aBag: Bag<A>, f: FlattenFunc<A, T>): boolean {
                    return <any> bBag === aBag;
                }
                const i = aLinks.findIndex(aLink => aLink.implementation(bagEqual));
                bLinks.push(bLink);
            }            
            bLink.implementation(bVisitor);
        });
        return null;
    }
    */
}

function input<T>(id: number): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input(id));
}

function one<T>(value: T): Bag<T> {
    return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
}
