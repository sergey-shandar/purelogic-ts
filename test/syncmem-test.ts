import { bag, syncmem } from "../index";
import * as chai from "chai";
import { iterableEqual } from "./iterable-helper";

chai.should();

describe("namespace syncmem", function() {
    describe("class SyncMem", function() {
        it("set()", () => {
            const syncMem = new syncmem.SyncMem();
            const input = bag.input<number>();
            const f = [123];
            syncMem.set(input, f);
            syncMem.get(input).should.equal(f);
            iterableEqual(syncMem.get(input.disjointUnion(bag.one(5))), [123, 5]);
            iterableEqual(
                syncMem.get(input.product(bag.one([1, 2, 3]).flatMap(x => x), (a, b) => [a * b])),
                [123, 246, 369]);
        });
        it("get()", () => {
            const syncMem = new syncmem.SyncMem();
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
    });
});