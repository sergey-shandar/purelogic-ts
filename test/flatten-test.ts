import "mocha";
import { identity } from "../flatten";
import * as chai from "chai";

chai.should();

describe("flatten.ts", function() {
    it("identity()", () => identity(5).should.deep.equal([5]));
});