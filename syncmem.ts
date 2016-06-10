import * as O from "./optimized";
import * as B from "./bag";
import * as D from "./dag";
import * as A from "./array";
import * as F from "./flatten";

type LazyArray<T> = () => T[];

class SyncMem {

    private _map: { [id: string]: LazyArray<any> } = {};

    private _dag: D.Dag = new D.Dag();

    set<T>(input: B.Bag<T>, lazyArray: LazyArray<T>): void {
        this._map[input.id] = lazyArray;
    }

    get<T>(b: B.Bag<T>): LazyArray<T> {
        const id = b.id;
        let result = this._map[id];
        if (result !== undefined) {
            return result;
        }
        const links = this._dag.get(b).array
            .map(link => link.implementation(<I>(value: O.LinkValue<T, I>) => {
                // NOTE: possible optimization:
                // if (f === flatten.identity) { return nodeFunc; }
                const f = value.func;
                const nodeFunc = this._fromNode(value.node);
                return () => A.ref(nodeFunc()).flatten(f);
            }));
        result = this._map[id];
        if (result !== undefined) {
            return result;
        }

        // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
        const refLinks = A.ref(links);
        const newResult = () => refLinks.flatten(f => f());

        this._map[b.id] = newResult;
        return newResult;
    }

    private _get<T>(o: O.Bag<T>): LazyArray<T> {
        const id = o.id;
        const links = o.array
            .map(link => link.implementation(<I>(value: O.LinkValue<T, I>) => {
                // NOTE: possible optimization:
                // if (f === flatten.identity) { return nodeFunc; }
                const f = value.func;
                const nodeFunc = this._fromNode(value.node);
                return () => A.ref(nodeFunc()).flatten(f);
            }));
        const result = this._map[id];
        if (result !== undefined) {
            return result;
        }

        // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
        const refLinks = A.ref(links);
        const newResult = () => refLinks.flatten(f => f());

        this._map[id] = newResult;
        return newResult;
    }

    private _fromNode<T>(n: O.Node<T>): LazyArray<T> {
        const id = n.id;
        const map = this._map;
        const result = map[id];
        if (result !== undefined) {
            return result;
        }
        const get = <I>(b: O.Bag<I>) => this._get(b);
        class Visitor implements O.NodeVisitor<T, LazyArray<T>> {

            input(): LazyArray<T> { return () => map[id](); }

            one(value: T): LazyArray<T> { return () => [value]; }

            groupBy<K>(
                input: O.Bag<T>, toKey: B.KeyFunc<T, K>, reduce: B.ReduceFunc<T>
            ): LazyArray<T> {
                const map = new Map<K, T>();
                const inputLazyArray = get(input);
                return () => {
                    inputLazyArray().forEach(value => {
                        const key = toKey(value);
                        const current = map.get(key);
                    });
                    return null;
                };
            }

            product<A, B>(
                a: O.Bag<A>, b: O.Bag<B>, func: B.ProductFunc<A, B, T>
            ): LazyArray<T> {
                return null;
            }
        }
        const newResult = n.implementation(new Visitor());
        map[id] = newResult;
        return newResult;
    }
}