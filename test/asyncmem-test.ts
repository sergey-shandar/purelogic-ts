import { bag, asyncmem } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace asyncmem", function() {
    describe("class AsyncMem", function() {
        it("set()", async () => {
            const asyncMem = new asyncmem.AsyncMem();
            const input = bag.input<number>();
            const f = Promise.resolve([123]);
            asyncMem.set(input, f);
            asyncMem.get(input).should.equal(f);
            (await asyncMem.get(input.disjointUnion(bag.one(5)))).should.deep.equal([123, 5]);
            (await asyncMem.get(
                    input.product(bag.one([1, 2, 3]).flatMap(x => x), (a, b) => [a * b])))
                .should.deep.equal([123, 246, 369]);
        });
        it("get()", async () => {
            const asyncMem = new asyncmem.AsyncMem();
            const r = bag.one("Hello world!");

            const a = bag.one(["Hello world!", "42", "42"]).flatMap(x => x);
            const b = bag.one([42, 42]).flatMap(x => x);

            const j = a.join(b, x => x, x => x.toString(), (x, y) => x + y, (x, y) => x + y);

            (await asyncMem.get(r)).should.deep.equal(["Hello world!"]);
            (await asyncMem.get(r.flatMap(x => [x, x]).reduce((a, b) => a + b)))
                .should.deep.equal(["Hello world!Hello world!"]);
            const input = bag.input<string>();
            asyncMem.set(input, Promise.resolve(["abc", "def"]));
            const x = asyncMem.get(input);
            (await x).should.deep.equal(["abc", "def"]);
            (await asyncMem.get(j)).should.deep.equal([
                { key: "42", a: "4242", b: 84 },
                { key: "Hello world!", a: "Hello world!", b: undefined }]);

            const unknownBag = bag.input<string>();
            function getUnknownBag() { return asyncMem.get(unknownBag); }
            getUnknownBag.should.throw();
        });
    });
});