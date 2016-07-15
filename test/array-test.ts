import "mocha";
import { ref } from "../array";
import * as chai from "chai";

chai.should();

describe("array.ts", function() {
    it("ref()", () => {
        const a: number[] = [3, 4, 5];
        ref(a).array.should.equal(a);
    });
    describe("class Ref", function() {
        it("flatten()", () =>
            ref([3, 4, 5]).flatten(x => [x, x * 2]).should.deep.equal([3, 6, 4, 8, 5, 10])
        );
        it("spliceOne()", () => {
            const a: string[] = ["x", "y", "z"];
            ref(a).spliceOne(1).should.equal("y");
            a.should.deep.equal(["x", "z"]);
        });
    });
});