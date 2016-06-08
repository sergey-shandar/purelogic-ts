import * as B from "./bag";
import * as D from "./dag";

class SyncMem {
    private _dag: D.Dag = new D.Dag();
    set<T>(input: B.Bag<T>, array: T[]): void {
        const optimizedBag = this._dag.get();
    }
    get<T>(b: B.Bag<T>): T[] {}
}