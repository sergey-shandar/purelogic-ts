import "ts-helpers";

export function lazy<T>(f: () => T): () => T {
    let called = false;
    let result: T;
    return () => {
        if (!called) {
            result = f();
            called = true;
        }
        return result;
    };
}

export class Map<T> {

    private readonly _map: { [id: string]: T } = {};

    set(id: string, value: T): void {
        this._map[id] = value;
    }

    get<X extends T>(id: string, create: () => X): X {
        const result = this._map[id];
        if (result === undefined) {
            const newResult = create();
            this._map[id] = newResult;
            return newResult;
        }
        return <X> result;
    }
}

/**
 * Iterable utilities.
 */
export namespace iterable {

    export abstract class Stateless<T> implements Iterable<T> {

        abstract toArray(): T[];

        abstract [Symbol.iterator](): Iterator<T>;
    }

    class FromArray<T> extends Stateless<T> {
        constructor(private readonly _array: T[]) { super(); }

        toArray() { return this._array; }
        [Symbol.iterator]() { return this._array[Symbol.iterator](); }
    }

    class FromIterator<T> extends Stateless<T> {
        constructor(private readonly _f: () => Iterator<T>) { super(); }

        toArray() { return Array.from(this); }
        [Symbol.iterator]() { return this._f(); }
    }

    export type I<T> = Stateless<T> | (() => IterableIterator<T>) | T[];

    export function stateless<T>(i: I<T>): Stateless<T> {
        if (i instanceof Stateless) {
            return i;
        } else if (i instanceof Array) {
            return new FromArray(i);
        } else {
            return new FromIterator(i);
        }
    }

    export function toArray<T>(i: I<T>): T[] {
        return stateless(i).toArray();
    }

    export function lazyArray<T>(a: () => T[]): I<T> {
        const x = lazy(a);
        return stateless(() => x()[Symbol.iterator]());
    }

    export type FlatMapFunc<I, O> = (value: I) => iterable.I<O>;

    export function flatMapIdentity<T>(value: T): iterable.I<T> {
        return [value];
    }

    export function flatMap<T, R>(a: I<T>, f: (v: T) => I<R>): I<R> {
        function *result() {
            for (const cv of stateless(a)) {
                yield* stateless(f(cv));
            }
        }
        return stateless(result);
    }

    export function concat<T>(a: I<T>, b: I<T>): I<T> {
        function *result() {
            yield *stateless(a);
            yield *stateless(b);
        }
        return stateless(result);
    }

    export function flatten<T>(c: I<I<T>>): I<T> {
        return flatMap(c, v => v);
    }

    export function forEach<T>(c: I<T>, f: (v: T) => void) {
        for (const v of stateless(c)) {
            f(v);
        }
    }

    export type KeyFunc<T> = (value: T) => string;

    export type ReduceFunc<T> = (a: T, b: T) => T;
}

/**
 * Array utilities.
 */
export namespace array {

    export function spliceOne<T>(array: T[], i: number): T {
        return array.splice(i, 1)[0];
    }
}

/**
 * Bag type and related functions.
 */
export namespace bag {

    export type ProductFunc<A, B, O> = (a: A, b: B) => O[];

    export class FlatMap<T, I> {
        constructor(
            public readonly input: Bag<I>,
            public readonly func: iterable.FlatMapFunc<I, T>) {}
    }

    export class DisjointUnion<T> {
        constructor(
            public readonly a: Bag<T>,
            public readonly b: Bag<T>) {}
    }

    export class GroupBy<T> {
        constructor(
            public readonly input: Bag<T>,
            public readonly toKey: iterable.KeyFunc<T>,
            public readonly reduce: iterable.ReduceFunc<T>) {}
    }

    export class Product<T, A, B> {
        constructor(
            public readonly a: Bag<A>,
            public readonly b: Bag<B>,
            public readonly func: ProductFunc<A, B, T>) {}
    }

    export interface Visitor<T, R> {
        /**
         * LINQ: SelectMany
         */
        flatMap<I>(value: FlatMap<T, I>): R;
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
        constructor(
            public readonly value: T,
            public readonly a: number,
            public readonly b: number) {}
    }

    export function one<T>(value: T): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.one(value));
    }

    export function input<T>(): Bag<T> {
        return new Bag(<R>(visitor: Visitor<T, R>) => visitor.input());
    }

    let bagCounter: number = 0;

    export class Join<A, B> {
        constructor(
            public readonly key: string,
            public readonly a: A|undefined,
            public readonly b: B|undefined) {}
    }

    export class Bag<T> {

        readonly id: string;

        constructor(
            public readonly implementation: Implementation<T>) {

            this.id = bagCounter.toString();
            ++bagCounter;
        }

        /**
         * LINQ: SelectMany
         */
        flatMap<O>(func: iterable.FlatMapFunc<T, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatMap(new FlatMap(this, func)));
        }

        disjointUnion(b: Bag<T>): Bag<T> {
            return new Bag(<R>(visitor: Visitor<T, R>) =>
                visitor.disjointUnion(new DisjointUnion(this, b)));
        }

        /**
         * LINQ: GroupBy
         */
        groupBy(toKey: iterable.KeyFunc<T>, reduce: iterable.ReduceFunc<T>): Bag<T> {
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
            return this.flatMap(value => [func(value)]);
        }

        /**
         * LINQ: Where
         */
        filter(func: (value: T) => boolean): Bag<T> {
            return this.flatMap(value => func(value) ? [value] : []);
        }

        compact(): Bag<T> {
            return this.filter(Boolean);
        }

        /**
         * LINQ: Accumulate
         */
        reduce(func: iterable.ReduceFunc<T>): Bag<T> {
            return this.groupBy(() => "", func);
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

        join<B>(
            b: Bag<B>,
            keyT: iterable.KeyFunc<T>,
            keyB: iterable.KeyFunc<B>,
            reduceT: iterable.ReduceFunc<T>,
            reduceB: iterable.ReduceFunc<B>):
                Bag<Join<T, B>> {

            function join(k: string, t: T|undefined, b: B|undefined) {
                return new Join(k, t, b);
            }

            const bagT = this.map(x => join(keyT(x), x, undefined));
            const bagB = b.map(x => join(keyB(x), undefined, x));
            const bagC = bagT.disjointUnion(bagB);

            function reduceOptional<M>(reduce: iterable.ReduceFunc<M>) {
                return (x: M|undefined, y: M|undefined) => {
                    if (x === undefined) { return y; }
                    if (y === undefined) { return x; }
                    return reduce(x, y);
                };
            }

            return bagC.groupBy(
                x => x.key,
                (x, y) => join(
                    x.key,
                    reduceOptional(reduceT)(x.a, y.a),
                    reduceOptional(reduceB)(x.b, y.b)));
        }
    }
}

/**
 * Optimized graph.
 */
export namespace optimized {

    export interface NodeVisitor<T, R> {
        input(): R;
        one(value: T): R;
        groupBy(inputs: Bag<T>, toKey: iterable.KeyFunc<T>, reduce: iterable.ReduceFunc<T>): R;
        product<A, B>(a: Bag<A>, b: Bag<B>, func: bag.ProductFunc<A, B, T>): R;
    }

    export type NodeImplementation<T> = <R>(visitor: NodeVisitor<T, R>) => R;

    export class Node<T> {

        constructor(
            public readonly id: string,
            public readonly implementation: NodeImplementation<T>) {}

        link<O>(func: iterable.FlatMapFunc<T, O>): Link<O> {
            const value = new LinkValue(this, func);
            return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(value));
        }

        bag(): Bag<T> {
            return new Bag(this.id, [this.link(iterable.flatMapIdentity)]);
        }
    }

    export class LinkValue<T, I> {
        constructor(
            public readonly node: Node<I>,
            public readonly func: iterable.FlatMapFunc<I, T>) {}
    }

    export type LinkVisitor<T, R> = <I>(value: LinkValue<T, I>) => R;

    export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

    export class Link<T> {

        constructor(
            public readonly implementation: LinkImplementation<T>) {}

        nodeId(): string {
            return this.implementation(<I>(x: LinkValue<T, I>) => x.node.id);
        }

        flatMap<O>(func: iterable.FlatMapFunc<T, O>): Link<O> {
            function visitor<I>(x: LinkValue<T, I>): Link<O> {
                const f = x.func;
                const newFunc = f !== iterable.flatMapIdentity
                    ? (value: I) => iterable.toArray(iterable.flatMap(f(value), func))
                    : <iterable.FlatMapFunc<I, O>> <any> func;
                return x.node.link(newFunc);
            }
            return this.implementation(visitor);
        }

        addFunc(getFunc: <I>() => iterable.FlatMapFunc<I, T>): Link<T> {
            function visitor<I>(link: LinkValue<T, I>): Link<T> {
                const f = link.func;
                const fNew = getFunc<I>();
                return link.node.link(i => iterable.concat(f(i), fNew(i)));
            }
            return this.implementation(visitor);
        }
    }

    export class Bag<T> {

        constructor(
            public readonly id: string,
            public readonly array: Link<T>[]) {}

        groupBy(id: string, toKey: iterable.KeyFunc<T>, reduce: iterable.ReduceFunc<T>): Bag<T> {
            return new Node(
                    id,
                    <R>(visitor: NodeVisitor<T, R>) => visitor.groupBy(this, toKey, reduce))
                .bag();
        }

        product<B, O>(id: string, b: Bag<B>, func: bag.ProductFunc<T, B, O>): Bag<O> {
            return new Node(id, <R>(visitor: NodeVisitor<O, R>) => visitor.product(this, b, func))
                .bag();
        }

        flatMap<O>(id: string, func: iterable.FlatMapFunc<T, O>): Bag<O> {
            return new Bag(id, this.array.map(link => link.flatMap(func)));
        }

        disjointUnion(id: string, b: Bag<T>): Bag<T> {
            const aLinks: Link<T>[] = [];
            this.array.forEach(aLink => aLinks.push(aLink));
            const bLinks: Link<T>[] = [];
            b.array.forEach(bLink => {
                function bVisitor<B>(x: LinkValue<T, B>): void {
                    const i = aLinks.findIndex(aLink => aLink.nodeId() === x.node.id);
                    function getFunc<I>(): iterable.FlatMapFunc<I, T> { return <any> x.func; }
                    bLinks.push(i !== -1
                        ? array.spliceOne(aLinks, i).addFunc(getFunc)
                        : bLink);
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
}

/**
 * DAG
 */
export namespace dag {

    export class Dag {

        private readonly _map = new Map<any>();

        get<T>(bag: bag.Bag<T>): optimized.Bag<T> {
            const id = bag.id;
            return this._map.get(id, () => {
                const getOpimized = <I>(b: bag.Bag<I>) => this.get(b);
                class Visitor implements bag.Visitor<T, optimized.Bag<T>> {
                    flatMap<I>(value: bag.FlatMap<T, I>): optimized.Bag<T> {
                        return getOpimized(value.input).flatMap(id, value.func);
                    }
                    disjointUnion(value: bag.DisjointUnion<T>): optimized.Bag<T> {
                        return getOpimized(value.a).disjointUnion(id, getOpimized(value.b));
                    }
                    one(value: T): optimized.Bag<T> {
                        return optimized.one(id, value);
                    }
                    input(): optimized.Bag<T> {
                        return optimized.input<T>(id);
                    }
                    groupBy(value: bag.GroupBy<T>): optimized.Bag<T> {
                        return getOpimized(value.input).groupBy(id, value.toKey, value.reduce);
                    }
                    product<A, B>(value: bag.Product<T, A, B>): optimized.Bag<T> {
                        return getOpimized(value.a).product(id, getOpimized(value.b), value.func);
                    }
                }
                return bag.implementation(new Visitor());
            });
        }
    }
}

/**
 * Synchronous memory back-end.
 */
export namespace syncmem {

    export class InputError implements Error {
        readonly name: string = "InputError";
        readonly message: string;
        constructor(public readonly bagId: string) {
            this.message = `InputError: input bag ${bagId} is not defined`;
        }
    }

    export class SyncMem {

        private readonly _map = new Map<iterable.I<any>>();

        private readonly _dag: dag.Dag = new dag.Dag();

        set<T>(input: bag.Bag<T>, factory: iterable.I<T>): void {
           this._map.set(input.id, factory);
        }

        get<T>(b: bag.Bag<T>): iterable.I<T> {
            return this._get(this._dag.get(b));
        }

        private _get<T>(o: optimized.Bag<T>): iterable.I<T> {
            const id = o.id;
            return this._map.get(id, () => {
                const links = o.array
                    .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                        // NOTE: possible optimization:
                        // if (f === flatMap.identity) { return nodeFunc; }
                        const f = value.func;
                        const nodeFunc = this._fromNode(value.node);
                        return iterable.flatMap(nodeFunc, f);
                    }));
                // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
                return iterable.flatten(links);
            });
        }

        private _fromNode<T>(n: optimized.Node<T>): iterable.I<T> {
            const id = n.id;
            const map = this._map;
            return map.get(id, () => {
                const get = <I>(b: optimized.Bag<I>) => this._get(b);

                class Visitor implements optimized.NodeVisitor<T, iterable.I<T>> {

                    /**
                     * when input is not defined yet.
                     */
                    input(): never { throw new InputError(id); }

                    one(value: T): iterable.I<T> { return [value]; }

                    groupBy(
                        input: optimized.Bag<T>,
                        toKey: iterable.KeyFunc<T>,
                        reduce: iterable.ReduceFunc<T>):
                            iterable.I<T> {

                        const inputLazyArray = get(input);
                        return iterable.lazyArray(() => {
                            const map: { [id: string]: T; } = {};
                            iterable.forEach(inputLazyArray, value => {
                                const key = toKey(value);
                                const current = map[key];
                                map[key] = current !== undefined ? reduce(current, value) : value;
                            });
                            return Object.keys(map).map(k => map[k]);
                        });
                    }

                    product<A, B>(
                        a: optimized.Bag<A>, b: optimized.Bag<B>, func: bag.ProductFunc<A, B, T>
                    ): iterable.I<T> {
                        const getA = get(a);
                        const getB = get(b);
                        return iterable.flatMap(
                            getA, av => iterable.flatMap(getB, bv => func(av, bv)));
                    }
                }
                return n.implementation(new Visitor());
            });
        }
    }
}

export namespace asyncmem {

    export type GetArray<T> = Promise<iterable.I<T>>;

    export class AsyncMem {

        private readonly _map = new Map<GetArray<any>>();

        private readonly _dag: dag.Dag = new dag.Dag();

        set<T>(input: bag.Bag<T>, getArray: Promise<iterable.I<T>>): void {
           this._map.set(input.id, getArray);
        }

        get<T>(b: bag.Bag<T>): GetArray<T> {
            return this._get(this._dag.get(b));
        }

        private _get<T>(o: optimized.Bag<T>): GetArray<T> {
            const id = o.id;
            return this._map.get(id, () => {
                const linkPromises = o.array
                    .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                        // NOTE: possible optimization:
                        // if (f === flatMap.identity) { return nodeFunc; }
                        const f = value.func;
                        return this._fromNode(value.node)
                            .then(x => iterable.flatMap(x, f));
                    }));
                // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
                return Promise.all(linkPromises).then(iterable.flatten);
            });
        }

        private _fromNode<T>(n: optimized.Node<T>): GetArray<T> {
            const id = n.id;
            const map = this._map;
            return map.get(id, () => {
                const get = <I>(b: optimized.Bag<I>) => this._get(b);

                class Visitor implements optimized.NodeVisitor<T, GetArray<T>> {

                    input(): never { throw new syncmem.InputError(id); }

                    async one(value: T): GetArray<T> { return [value]; }

                    async groupBy(
                        input: optimized.Bag<T>,
                        toKey: iterable.KeyFunc<T>,
                        reduce: iterable.ReduceFunc<T>):
                            GetArray<T> {

                        const inputLazyArray = await get(input);

                        const map: { [id: string]: T; } = {};
                        iterable.forEach(inputLazyArray, value => {
                            const key = toKey(value);
                            const current = map[key];
                            map[key] = current !== undefined ? reduce(current, value) : value;
                        });
                        return Object.keys(map).map(k => map[k]);
                    }

                    async product<A, B>(
                        a: optimized.Bag<A>,
                        b: optimized.Bag<B>,
                        func: bag.ProductFunc<A, B, T>):
                            GetArray<T> {

                        const getA = await get(a);
                        const getB = await get(b);
                        return iterable.flatMap(
                            getA, av => iterable.flatMap(getB, bv => func(av, bv)));
                    }
                }
                return n.implementation(new Visitor());
            });
        }
    }
}