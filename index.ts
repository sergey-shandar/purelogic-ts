import "tslib";
import * as _ from "iterable-ts";

export class CacheMap<T> {

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
 * Bag type and related functions.
 */
export namespace bag {

    export class FlatMap<T, I> {
        constructor(
            public readonly input: Bag<I>,
            public readonly func: _.FlatMapFunc<I, T>) {}
    }

    export class DisjointUnion<T> {
        constructor(
            public readonly a: Bag<T>,
            public readonly b: Bag<T>) {}
    }

    export class GroupBy<T> {
        constructor(
            public readonly input: Bag<T>,
            public readonly toKey: _.KeyFunc<T>,
            public readonly reduce: _.ReduceFunc<T>) {}
    }

    export class Product<T, A, B> {
        constructor(
            public readonly a: Bag<A>,
            public readonly b: Bag<B>,
            public readonly func: _.ProductFunc<A, B, T>) {}
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

    export function range(a: number, b: number): Bag<number> {
        return one(null).flatMap(() => _.range(a, b));
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
        flatMap<O>(func: _.FlatMapFunc<T, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) => visitor.flatMap(new FlatMap(this, func)));
        }

        disjointUnion(b: Bag<T>): Bag<T> {
            return new Bag(<R>(visitor: Visitor<T, R>) =>
                visitor.disjointUnion(new DisjointUnion(this, b)));
        }

        /**
         * LINQ: GroupBy
         */
        groupBy(toKey: _.KeyFunc<T>, reduce: _.ReduceFunc<T>): Bag<T> {
            return new Bag(<R>(visitor: Visitor<T, R>) =>
                visitor.groupBy(new GroupBy(this, toKey, reduce)));
        }

        product<B, O>(b: Bag<B>, func: _.ProductFunc<T, B, O>): Bag<O> {
            return new Bag(<R>(visitor: Visitor<O, R>) =>
                visitor.product(new Product(this, b, func)));
        }

        /**
         * LINQ: Select
         */
        map<O>(func: _.MapFunc<T, O>): Bag<O> {
            return this.flatMap(value => [func(value)]);
        }

        /**
         * LINQ: Where
         */
        filter(func: _.FilterFunc<T>): Bag<T> {
            return this.flatMap(_.filterFuncToFlatMapFunc(func));
        }

        compact(): Bag<T> {
            return this.filter(Boolean);
        }

        /**
         * LINQ: Accumulate
         */
        reduce(func: _.ReduceFunc<T>): Bag<T> {
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
            keyT: _.KeyFunc<T>,
            keyB: _.KeyFunc<B>,
            reduceT: _.ReduceFunc<T>,
            reduceB: _.ReduceFunc<B>
        ): Bag<Join<T, B>> {

            function join(k: string, t: T|undefined, b: B|undefined) {
                return new Join(k, t, b);
            }

            const bagT = this.map(x => join(keyT(x), x, undefined));
            const bagB = b.map(x => join(keyB(x), undefined, x));
            const bagC = bagT.disjointUnion(bagB);

            function reduceOptional<M>(reduce: _.ReduceFunc<M>) {
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
        groupBy(inputs: Bag<T>, toKey: _.KeyFunc<T>, reduce: _.ReduceFunc<T>): R;
        product<A, B>(a: Bag<A>, b: Bag<B>, func: _.ProductFunc<A, B, T>): R;
    }

    export type NodeImplementation<T> = <R>(visitor: NodeVisitor<T, R>) => R;

    export class Node<T> {

        constructor(
            public readonly id: string,
            public readonly implementation: NodeImplementation<T>) {}

        link<O>(func: _.FlatMapFunc<T, O>): Link<O> {
            const value = new LinkValue(this, func);
            return new Link(<R>(visitor: LinkVisitor<O, R>) => visitor(value));
        }

        bag(): Bag<T> {
            return new Bag(this.id, [this.link(_.flatMapIdentity)]);
        }
    }

    export class LinkValue<T, I> {
        constructor(
            public readonly node: Node<I>,
            public readonly func: _.FlatMapFunc<I, T>) {}
    }

    export type LinkVisitor<T, R> = <I>(value: LinkValue<T, I>) => R;

    export type LinkImplementation<T> = <R>(visitor: LinkVisitor<T, R>) => R;

    export class Link<T> {

        constructor(
            public readonly implementation: LinkImplementation<T>) {}

        nodeId(): string {
            return this.implementation(<I>(x: LinkValue<T, I>) => x.node.id);
        }

        flatMap<O>(func: _.FlatMapFunc<T, O>): Link<O> {
            function visitor<I>(x: LinkValue<T, I>): Link<O> {
                const f = x.func;
                const newFunc = f !== _.flatMapIdentity
                    ? (value: I) => _.toArray(_.flatMap(f(value), func))
                    : <_.FlatMapFunc<I, O>> <any> func;
                return x.node.link(newFunc);
            }
            return this.implementation(visitor);
        }

        addFunc(getFunc: <I>() => _.FlatMapFunc<I, T>): Link<T> {
            function visitor<I>(link: LinkValue<T, I>): Link<T> {
                const f = link.func;
                const fNew = getFunc<I>();
                return link.node.link(i => _.concat(f(i), fNew(i)));
            }
            return this.implementation(visitor);
        }
    }

    export class Bag<T> {

        constructor(
            public readonly id: string,
            public readonly links: Link<T>[]) {}

        linksMap<R>(visitor: LinkVisitor<T, R>): R[] {
            return this.links.map(link => link.implementation(visitor));
        }

        groupBy(id: string, toKey: _.KeyFunc<T>, reduce: _.ReduceFunc<T>): Bag<T> {
            return new Node(
                    id,
                    <R>(visitor: NodeVisitor<T, R>) => visitor.groupBy(this, toKey, reduce))
                .bag();
        }

        product<B, O>(id: string, b: Bag<B>, func: _.ProductFunc<T, B, O>): Bag<O> {
            return new Node(id, <R>(visitor: NodeVisitor<O, R>) => visitor.product(this, b, func))
                .bag();
        }

        flatMap<O>(id: string, func: _.FlatMapFunc<T, O>): Bag<O> {
            return new Bag(id, this.links.map(link => link.flatMap(func)));
        }

        disjointUnion(id: string, b: Bag<T>): Bag<T> {
            const c = _.concat(this.links, b.links);
            const g = _.groupBy(
                c,
                x => x.nodeId(),
                (x, y) => {
                    function visitor<B>(v: LinkValue<T, B>): Link<T> {
                        function getFunc<I>(): _.FlatMapFunc<I, T> { return <any> v.func; }
                        return x.addFunc(getFunc);
                    }
                    return y.implementation(visitor);
                });
            return new Bag(id, _.toArray(_.values(g)));
        }
    }

    export function input<T>(id: string): Bag<T> {
        return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.input()).bag();
    }

    export function one<T>(id: string, value: T): Bag<T> {
        return new Node(id, <R>(visitor: NodeVisitor<T, R>) => visitor.one(value)).bag();
    }

    /**
     * DAG
     */
    export class Dag {

        private readonly _map = new CacheMap<any>();

        get<T>(b: bag.Bag<T>): Bag<T> {
            const id = b.id;
            return this._map.get(id, () => {
                const getOpimized = <I>(b: bag.Bag<I>) => this.get(b);
                class Visitor implements bag.Visitor<T, Bag<T>> {
                    flatMap<I>(value: bag.FlatMap<T, I>): Bag<T> {
                        return getOpimized(value.input).flatMap(id, value.func);
                    }
                    disjointUnion(value: bag.DisjointUnion<T>): Bag<T> {
                        return getOpimized(value.a).disjointUnion(id, getOpimized(value.b));
                    }
                    one(value: T): Bag<T> {
                        return optimized.one(id, value);
                    }
                    input(): Bag<T> {
                        return optimized.input<T>(id);
                    }
                    groupBy(value: bag.GroupBy<T>): Bag<T> {
                        return getOpimized(value.input).groupBy(id, value.toKey, value.reduce);
                    }
                    product<A, B>(value: bag.Product<T, A, B>): Bag<T> {
                        return getOpimized(value.a).product(id, getOpimized(value.b), value.func);
                    }
                }
                return b.implementation(new Visitor());
            });
        }
    }
}

export class InputError implements Error {
    readonly name: string = "InputError";
    readonly message: string;
    constructor(public readonly bagId: string) {
        this.message = `InputError: input bag ${bagId} is not defined`;
    }
}

export abstract class Mem<T> {
    protected readonly _map = new CacheMap<T>();
    protected readonly _dag: optimized.Dag = new optimized.Dag();
}

/**
 * Synchronous memory back-end.
 */
export class SyncMem extends Mem<_.I<any>> {

    set<T>(input: bag.Bag<T>, factory: _.I<T>): void {
        this._map.set(input.id, factory);
    }

    get<T>(b: bag.Bag<T>): _.I<T> {
        return this._get(this._dag.get(b));
    }

    private _get<T>(o: optimized.Bag<T>): _.I<T> {
        const id = o.id;
        return this._map.get(id, () => {
            // NOTE: possible optimization:
            // if (value.func === flatMap.identity) { return nodeFunc; }
            const links = o.linksMap(<I>(value: optimized.LinkValue<T, I>) =>
                _.flatMap(this._fromNode(value.node), value.func));
            // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
            return _.flatten(links);
        });
    }

    private _fromNode<T>(n: optimized.Node<T>): _.I<T> {
        const id = n.id;
        const map = this._map;
        return map.get(id, () => {
            const get = <I>(b: optimized.Bag<I>) => this._get(b);

            class Visitor implements optimized.NodeVisitor<T, _.I<T>> {

                /**
                 * when input is not defined yet.
                 */
                input(): never { throw new InputError(id); }

                one(value: T): _.I<T> { return [value]; }

                groupBy(
                    input: optimized.Bag<T>,
                    toKey: _.KeyFunc<T>,
                    reduce: _.ReduceFunc<T>
                ): _.I<T> {
                    return _.values(_.groupBy(get(input), toKey, reduce));
                }

                product<A, B>(
                    a: optimized.Bag<A>, b: optimized.Bag<B>, func: _.ProductFunc<A, B, T>
                ): _.I<T> {
                    return _.product(get(a), get(b), func);
                }
            }
            return n.implementation(new Visitor());
        });
    }
}

export class AsyncMem extends Mem<Promise<_.I<any>>> {

    set<T>(input: bag.Bag<T>, getArray: Promise<_.I<T>>): void {
        this._map.set(input.id, getArray);
    }

    get<T>(b: bag.Bag<T>): Promise<_.I<T>> {
        return this._get(this._dag.get(b));
    }

    private _get<T>(o: optimized.Bag<T>): Promise<_.I<T>> {
        const id = o.id;
        return this._map.get(id, async () => {
            // NOTE: possible optimization:
            // if (value.func === flatMap.identity) { return nodeFunc; }
            const linkPromises = o.linksMap(async <I>(value: optimized.LinkValue<T, I>) =>
                _.flatMap(await this._fromNode(value.node), value.func));
            // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
            return _.flatten(await Promise.all(linkPromises));
        });
    }

    private _fromNode<T>(n: optimized.Node<T>): Promise<_.I<T>> {
        const id = n.id;
        const map = this._map;
        return map.get(id, () => {
            const get = <I>(b: optimized.Bag<I>) => this._get(b);

            class Visitor implements optimized.NodeVisitor<T, Promise<_.I<T>>> {

                input(): Promise<_.I<T>> { return Promise.reject(new InputError(id)); }

                async one(value: T): Promise<_.I<T>> { return [value]; }

                async groupBy(
                    input: optimized.Bag<T>,
                    toKey: _.KeyFunc<T>,
                    reduce: _.ReduceFunc<T>
                ): Promise<_.I<T>> {
                    const i = await get(input);
                    return _.values(await _.async.groupBy(i, toKey, reduce));
                }

                async product<A, B>(
                    a: optimized.Bag<A>,
                    b: optimized.Bag<B>,
                    func: _.ProductFunc<A, B, T>
                ): Promise<_.I<T>> {
                    return _.product(await get(a), await get(b), func);
                }
            }
            return n.implementation(new Visitor());
        });
    }
}
