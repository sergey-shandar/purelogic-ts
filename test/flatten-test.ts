import "mocha";
import { flatten } from "../index";
import * as chai from "chai";

chai.should();

describe("namespace flatten", function() {
    it("identity()", () => flatten.identity(5).should.deep.equal([5]));
});