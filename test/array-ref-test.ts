import "mocha";
import { arrayRef } from "../array-ref";
import * as chai from "chai";

chai.should();

describe("array-ref.ts", function() {
    it("arrayRef()", () => {
        const a: number[] = [3, 4, 5];
        arrayRef(a).array.should.equal(a); 
    });
    describe("class ArrayRef", function() {
        it("flatten()", () => 
            arrayRef([3, 4, 5]).flatten(x => [x, x * 2]).should.deep.equal([3, 6, 4, 8, 5, 10])
        );
        it("remove()", () => {
            const a: string[] = ["x", "y", "z"]; 
            arrayRef(a).remove(1).should.equal("y");
            a.should.deep.equal(["x", "z"]); 
        });
    });
});