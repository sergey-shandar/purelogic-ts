import "mocha";
import { array } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace array", function() {
    it("ref()", () => {
        const a: number[] = [3, 4, 5];
        array.ref(a).array.should.equal(a);
    });
    describe("class Ref", function() {
        it("flatMap()", () =>
            array.ref([3, 4, 5]).flatMap(x => [x, x * 2]).should.deep.equal([3, 6, 4, 8, 5, 10])
        );
        it("spliceOne()", () => {
            const a: string[] = ["x", "y", "z"];
            array.ref(a).spliceOne(1).should.equal("y");
            a.should.deep.equal(["x", "z"]);
        });
    });
});