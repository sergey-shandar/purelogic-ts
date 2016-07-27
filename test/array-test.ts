import "mocha";
import { array } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace array", function() {
    it("spliceOne()", () => {
        const a: string[] = ["x", "y", "z"];
        array.spliceOne(a, 1).should.equal("y");
        a.should.deep.equal(["x", "z"]);
    });
});