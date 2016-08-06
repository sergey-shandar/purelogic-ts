import { iterable } from "purelogic-ts";

console.log("start");

// iterable.toArray(iterable.range(0, 10000000));

function immediate(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

async function asyncForEach<T>(c: iterable.I<T>, f: (v: T) => void): Promise<void> {
    for (const v of iterable.stateless(c)) {
        f(v);
        await immediate();
    }
}

async function asyncGroupBy<T>(
    c: iterable.I<T>, key: iterable.KeyFunc<T>, reduce: iterable.ReduceFunc<T>
): Promise<iterable.Map<T>> {
    const result: iterable.Map<T> = {};
    await asyncForEach(c, v => {
        const k = key(v);
        const old = result[k];
        result[k] = old === undefined ? v : reduce(old, v);
    });
    return result;
}

async function x(): Promise<void> {
    console.log("x.start()");
    await immediate();
    await asyncGroupBy(iterable.range(0, 10000), x => x.toString(), (a, _) => a);
    await immediate();
    console.log("x.end()");
    await immediate();
    flag = true;
}

let flag = false;

async function r(): Promise<void> {
    console.log("r.start()");
    while (!flag) {
        await immediate();
        console.log(".");
    }
    console.log("r.end()");
}

Promise.all([r(), x()]);