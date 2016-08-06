import { bag, asyncmem } from "../index";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("namespace asyncmem", function() {
    describe("class AsyncMem", function() {
        it("set()", async () => {
            const asyncMem = new asyncmem.AsyncMem();
            const input = bag.input<number>();
            const f = Promise.resolve([123]);
            asyncMem.set(input, f);
            iterableEqual(await asyncMem.get(input), [123]);
            iterableEqual(await asyncMem.get(input.disjointUnion(bag.one(5))), [123, 5]);
            iterableEqual(
                await asyncMem.get(
                    input.product(bag.one([1, 2, 3]).flatMap(x => x), (a, b) => [a * b])),
                [123, 246, 369]);
        });
        it("get()", async () => {
            const asyncMem = new asyncmem.AsyncMem();
            const r = bag.one("Hello world!");

            const a = bag.one(["Hello world!", "42", "42"]).flatMap(x => x);
            const b = bag.one([42, 42]).flatMap(x => x);

            const j = a.join(b, x => x, x => x.toString(), (x, y) => x + y, (x, y) => x + y);

            iterableEqual(await asyncMem.get(r), ["Hello world!"]);
            iterableEqual(
                await asyncMem.get(r.flatMap(x => [x, x]).reduce((a, b) => a + b)),
                ["Hello world!Hello world!"]);
            const input = bag.input<string>();
            asyncMem.set(input, Promise.resolve(["abc", "def"]));
            const x = asyncMem.get(input);
            iterableEqual(await x, ["abc", "def"]);
            iterableEqual(
                await asyncMem.get(j),
                [
                    { key: "42", a: "4242", b: 84 },
                    { key: "Hello world!", a: "Hello world!", b: undefined }
                ]);

            const unknownBag = bag.input<string>();
            function getUnknownBag() { return asyncMem.get(unknownBag); }
            getUnknownBag.should.throw();
        });
    });
});