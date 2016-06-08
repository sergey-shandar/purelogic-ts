import * as bag from "./bag";
import * as dag from "./dag";

class SyncMem {
    constructor(private d: dag.Dag) {}
    set<T>(input: Bag<T>, array: T[]): void {}
    get<T>(b: Bag<T>): T[] {}
}