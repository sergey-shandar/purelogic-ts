import { bag, syncmem } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace syncmem", function() {
    describe("class SyncMem", function() {
        it("set()", () => {
            const syncMem = new syncmem.SyncMem();
            const input = bag.input<number>();
            const f = () => [123];
            syncMem.set(input, f);
            syncMem.get(input).should.equal(f);
            syncMem.get(input.disjointUnion(bag.one(5)))().should.deep.equal([123, 5]);
            syncMem.get(input.product(bag.one([1, 2, 3]).flatten(x => x), (a, b) => [a * b]))()
                .should.deep.equal([123, 246, 369]);
        });
        it("get()", () => {
            const syncMem = new syncmem.SyncMem();
            const r = bag.one("Hello world!");

            const a = bag.one(["Hello world!", "42", "42"]).flatten(x => x);
            const b = bag.one([42, 42]).flatten(x => x);

            const j = a.join(b, x => x, x => x.toString(), (x, y) => x + y, (x, y) => x + y);

            syncMem.get(r)().should.deep.equal(["Hello world!"]);
            syncMem.get(r.flatten(x => [x, x]).reduce((a, b) => a + b))().should.deep
                .equal(["Hello world!Hello world!"]);
            const input = bag.input<string>();
            const x = syncMem.get(input);
            syncMem.set(input, () => ["abc", "def"]);
            x().should.deep.equal(["abc", "def"]);
            syncMem.get(j)().should.deep.equal([
                { key: "42", a: "4242", b: 84 },
                { key: "Hello world!", a: "Hello world!", b: undefined }]);
        });
    });
});