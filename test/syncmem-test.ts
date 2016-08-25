import { bag, SyncMem } from "../index";
import * as iterable from "iterable-ts";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("class SyncMem", function() {
    it("set()", () => {
        const syncMem = new SyncMem();
        const input = bag.input<number>();
        const f = [123];
        syncMem.set(input, f);
        iterableEqual(syncMem.get(input), [123]);
        iterableEqual(syncMem.get(input.disjointUnion(bag.one(5))), [123, 5]);
        iterableEqual(
            syncMem.get(input.product(bag.one([1, 2, 3]).flatMap(x => x), (a, b) => [a * b])),
            [123, 246, 369]);
    });
    it("get()", () => {
        const syncMem = new SyncMem();
        const r = bag.one("Hello world!");

        const a = bag.one(["Hello world!", "42", "42"]).flatMap(x => x);
        const b = bag.one([42, 42]).flatMap(x => x);

        const j = a.join(b, x => x, x => x.toString(), (x, y) => x + y, (x, y) => x + y);

        iterableEqual(syncMem.get(r), ["Hello world!"]);
        iterableEqual(
            syncMem.get(r.flatMap(x => [x, x]).reduce((a, b) => a + b)),
            ["Hello world!Hello world!"]);
        const input = bag.input<string>();
        syncMem.set(input, ["abc", "def"]);
        const x = syncMem.get(input);
        iterableEqual(x, ["abc", "def"]);
        iterableEqual(
            syncMem.get(j),
            [
                { key: "42", a: "4242", b: 84 },
                { key: "Hello world!", a: "Hello world!", b: undefined }
            ]);

        const unknownBag = bag.input<string>();
        function getUnknownBag() { return syncMem.get(unknownBag); }
        getUnknownBag.should.throw();
    });
    it("cache reduce", () => {
        let counter = 0;
        const r = bag.range(100, 102).reduce((a, b) => {
            ++counter;
            return a + b;
        });

        const m = new SyncMem();

        iterable.toArray(m.get(r)).should.deep.equal([201]);
        iterable.toArray(m.get(r)).should.deep.equal([201]);

        counter.should.equal(1);
    });
});