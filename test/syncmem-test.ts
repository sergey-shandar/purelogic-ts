import { SyncMem } from "../syncmem";
import { bag } from "../index";
import * as chai from "chai";

chai.should();

describe("syncmem.ts", function() {
    describe("class SyncMem", function() {
        it("set()", () => {
            const syncMem = new SyncMem();
            const input = bag.input<number>();
            const f = () => [123];
            syncMem.set(input, f);
            syncMem.get(input).should.equal(f);
            syncMem.get(input.disjointUnion(bag.one(5)))().should.deep.equal([123, 5]);
            syncMem.get(input.product(bag.one([1, 2, 3]).flatten(x => x), (a, b) => [a * b]))()
                .should.deep.equal([123, 246, 369]);
        });
        it("get()", () => {
            const syncMem = new SyncMem();
            const r = bag.one("Hello world!");
            syncMem.get(r)().should.deep.equal(["Hello world!"]);
            syncMem.get(r.flatten(x => [x, x]).reduce((a, b) => a + b))().should.deep
                .equal(["Hello world!Hello world!"]);
            const input = bag.input<string>();
            const x = syncMem.get(input);
            syncMem.set(input, () => ["abc", "def"]);
            x().should.deep.equal(["abc", "def"]);
        });
    });
});