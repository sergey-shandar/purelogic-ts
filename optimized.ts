import * as flatten from "./flatten";
import { KeyFunc, ReduceFunc, ProductFunc } from "./bag";
import * as array from "./array";

export interface NodeVisitor<T, R> {
    input(): R;
    one(value: T): R;
    groupBy<K>(inputs: Bag<T>, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): R;
    product<A, B>(a: Bag<A>, b: Bag<B>, func: ProductFunc<A, B, T>): R;
}

export type NodeImplementation<T> = <R>(visitor: NodeVisitor<T, R>) => R;

export class Node<T> {
    constructor(public id: number, public implementation: NodeImplementation<T>) { }
    link<O>(func: flatten.Func<T, O>): Link<O> {
        return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(this, func));
    }
    bag(): Bag<T> {
        return new Bag(this.id, [this.link(flatten.identity)]);
    }
}

export type LinkVisitor<T, R> = <I>(bag: Node<I>, func: flatten.Func<I, T>) => R;

export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

export class Link<T> {
    constructor(public implementation: LinkImplementation<T>) {}
    flatten<O>(func: flatten.Func<T, O>): Link<O> {
        function visitor<I>(b: Node<I>, f: flatten.Func<I, T>): Link<O> {
            const newFunc = f !== flatten.identity
                ? (value: I) => array.ref(f(value)).flatten(func)
                : <flatten.Func<I, O>> <any> func;
            return b.link(newFunc);
        }
        return this.implementation(visitor);
    }
    /**
     * nodes with the same ids are equal.
     */
    nodeEqual<B>(b: Node<B>): boolean {
        function visitor<I>(a: Node<I>, f: flatten.Func<I, T>): boolean {
            return b.id === a.id;
        }
        return this.implementation(visitor);
    }
    addFunc(getFunc: <I>() => flatten.Func<I, T>): Link<T> {
        function visitor<I>(a: Node<I>, f: flatten.Func<I, T>): Link<T> {
            const fNew = getFunc<I>();
            return a.link(i => f(i).concat(fNew(i)));
        }
        return this.implementation(visitor);
    }
}

export class Bag<T> {
    constructor(public id: number, public array: Link<T>[]) { }
    groupBy<K>(id: number, toKey: KeyFunc<T, K>, reduce: ReduceFunc<T>): Node<T> {
        return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.groupBy(this, toKey, reduce));
    }
    product<B, O>(id: number, b: Bag<B>, func: ProductFunc<T, B, O>): Node<O> {
        return new Node(id, <R>(visitor: NodeVisitor<O, R>) => visitor.product(this, b, func));
    }
    flatten<O>(id: number, func: flatten.Func<T, O>): Bag<O> {
        return new Bag(id, this.array.map(link => link.flatten(func)));
    }
    disjointUnion(id: number, b: Bag<T>): Bag<T> {
        const aLinks: Link<T>[] = [];
        this.array.forEach(aLink => aLinks.push(aLink));
        const bLinks: Link<T>[] = [];
        b.array.forEach(bLink => {
            function bVisitor<B>(bBag: Node<B>, f: flatten.Func<B, T>): void {
                const i = aLinks.findIndex(aLink => aLink.nodeEqual(bBag));
                function getFunc<I>(): flatten.Func<I, T> { return <any> f; }
                bLinks.push(i !== -1
                    ? array.ref(aLinks).spliceOne(i).addFunc(getFunc)
                    : bLink
                );
            }
            bLink.implementation(bVisitor);
        });
        return new Bag(id, aLinks.concat(bLinks));
    }
}

export function input<T>(id: number): Bag<T> {
    return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.input()).bag();
}

export function one<T>(id: number, value: T): Bag<T> {
    return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.one(value)).bag();
}
