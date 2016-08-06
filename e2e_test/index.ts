import { iterable } from "purelogic-ts";

console.log("start");

// iterable.toArray(iterable.range(0, 10000000));

iterable.groupBy(iterable.range(0, 10000000), x => x.toString(), (a, _) => a);

console.log("end");