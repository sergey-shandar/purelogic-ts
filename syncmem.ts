import * as optimized from "./optimized";
import * as bag from "./bag";
import * as dag from "./dag";
import * as array from "./array";
import * as flatten from "./flatten";

export type GetArray<T> = () => T[];

export class SyncMem {

    private _map: { [id: string]: GetArray<any> } = {};

    private _dag: dag.Dag = new dag.Dag();

    set<T>(input: bag.Bag<T>, getArray: GetArray<T>): void {
        this._map[input.id] = getArray;
    }

    get<T>(b: bag.Bag<T>): GetArray<T> {
        const id = b.id;
        let result = this._map[id];
        if (result !== undefined) {
            return result;
        }
        const links = this._dag.get(b).array
            .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                // NOTE: possible optimization:
                // if (f === flatten.identity) { return nodeFunc; }
                const f = value.func;
                const nodeFunc = this._fromNode(value.node);
                return () => array.ref(nodeFunc()).flatten(f);
            }));
        result = this._map[id];
        if (result !== undefined) {
            return result;
        }

        // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
        const refLinks = array.ref(links);
        const newResult = () => refLinks.flatten(f => f());

        this._map[b.id] = newResult;
        return newResult;
    }

    private _get<T>(o: optimized.Bag<T>): GetArray<T> {
        const id = o.id;
        const links = o.array
            .map(link => link.implementation(<I>(value: optimized.LinkValue<T, I>) => {
                // NOTE: possible optimization:
                // if (f === flatten.identity) { return nodeFunc; }
                const f = value.func;
                const nodeFunc = this._fromNode(value.node);
                return () => array.ref(nodeFunc()).flatten(f);
            }));
        const result = this._map[id];
        if (result !== undefined) {
            return result;
        }

        // NOTE: possible optimization: if (links.lenght === 1) { newResult = links[0]; }
        const refLinks = array.ref(links);
        const newResult = () => refLinks.flatten(f => f());

        this._map[id] = newResult;
        return newResult;
    }

    private _fromNode<T>(n: optimized.Node<T>): GetArray<T> {
        const id = n.id;
        const map = this._map;
        const result = map[id];
        if (result !== undefined) {
            return result;
        }
        const get = <I>(b: optimized.Bag<I>) => this._get(b);
        class Visitor implements optimized.NodeVisitor<T, GetArray<T>> {

            input(): GetArray<T> { return () => map[id](); }

            one(value: T): GetArray<T> { return () => [value]; }

            groupBy(
                input: optimized.Bag<T>, toKey: bag.KeyFunc<T>, reduce: bag.ReduceFunc<T>
            ): GetArray<T> {
                const inputLazyArray = get(input);
                return () => {
                    // NOTE: possible optimization: we can cache the result of the function.
                    const map: { [id: string]: T; } = {};
                    inputLazyArray().forEach(value => {
                        const key = toKey(value);
                        const current = map[key];
                        map[key] = current !== undefined ? reduce(current, value) : value;
                    });
                    return Object.keys(map).map(k => map[k]);
                };
            }

            product<A, B>(
                a: optimized.Bag<A>, b: optimized.Bag<B>, func: bag.ProductFunc<A, B, T>
            ): GetArray<T> {
                const getA = get(a);
                const getB = get(b);
                return () => {
                    // NOTE: possible optimization: we can cache the result of the function.
                    const aArray = array.ref(getA());
                    const bArray = array.ref(getB());
                    return aArray.flatten(av => bArray.flatten(bv => func(av, bv)));
                };
            }
        }
        const newResult = n.implementation(new Visitor());
        map[id] = newResult;
        return newResult;
    }
}