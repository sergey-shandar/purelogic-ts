import { flatten, array, bag } from "./index";

export interface NodeVisitor<T, R> {
    input(): R;
    one(value: T): R;
    groupBy(inputs: Bag<T>, toKey: bag.KeyFunc<T>, reduce: bag.ReduceFunc<T>): R;
    product<A, B>(a: Bag<A>, b: Bag<B>, func: bag.ProductFunc<A, B, T>): R;
}

export type NodeImplementation<T> = <R>(visitor: NodeVisitor<T, R>) => R;

export class Node<T> {

    constructor(
        public readonly id: string,
        public readonly implementation: NodeImplementation<T>) {
    }

    link<O>(func: flatten.Func<T, O>): Link<O> {
        const value = new LinkValue(this, func);
        return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(value));
    }

    bag(): Bag<T> {
        return new Bag(this.id, [this.link(flatten.identity)]);
    }
}

export class LinkValue<T, I> {
    constructor(
        public readonly node: Node<I>,
        public readonly func: flatten.Func<I, T>) {
    }
}

export type LinkVisitor<T, R> = <I>(value: LinkValue<T, I>) => R;

export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

export class Link<T> {

    constructor(public readonly implementation: LinkImplementation<T>) {}

    nodeId(): string {
        return this.implementation(<I>(x: LinkValue<T, I>) => x.node.id);
    }

    flatten<O>(func: flatten.Func<T, O>): Link<O> {
        function visitor<I>(x: LinkValue<T, I>): Link<O> {
            const f = x.func;
            const newFunc = f !== flatten.identity
                ? (value: I) => array.ref(f(value)).flatten(func)
                : <flatten.Func<I, O>> <any> func;
            return x.node.link(newFunc);
        }
        return this.implementation(visitor);
    }

    addFunc(getFunc: <I>() => flatten.Func<I, T>): Link<T> {
        function visitor<I>(link: LinkValue<T, I>): Link<T> {
            const f = link.func;
            const fNew = getFunc<I>();
            return link.node.link(i => f(i).concat(fNew(i)));
        }
        return this.implementation(visitor);
    }
}

export class Bag<T> {

    constructor(
        public readonly id: string,
        public readonly array: Link<T>[]) {
    }

    groupBy(id: string, toKey: bag.KeyFunc<T>, reduce: bag.ReduceFunc<T>): Bag<T> {
        return new Node(
                id,
                <R>(visitor: NodeVisitor<T, R>) => visitor.groupBy(this, toKey, reduce))
            .bag();
    }

    product<B, O>(id: string, b: Bag<B>, func: bag.ProductFunc<T, B, O>): Bag<O> {
        return new Node(id, <R>(visitor: NodeVisitor<O, R>) => visitor.product(this, b, func))
            .bag();
    }

    flatten<O>(id: string, func: flatten.Func<T, O>): Bag<O> {
        return new Bag(id, this.array.map(link => link.flatten(func)));
    }

    disjointUnion(id: string, b: Bag<T>): Bag<T> {
        const aLinks: Link<T>[] = [];
        this.array.forEach(aLink => aLinks.push(aLink));
        const bLinks: Link<T>[] = [];
        b.array.forEach(bLink => {
            function bVisitor<B>(x: LinkValue<T, B>): void {
                const i = aLinks.findIndex(aLink => aLink.nodeId() === x.node.id);
                function getFunc<I>(): flatten.Func<I, T> { return <any> x.func; }
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

export function input<T>(id: string): Bag<T> {
    return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.input()).bag();
}

export function one<T>(id: string, value: T): Bag<T> {
    return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.one(value)).bag();
}
