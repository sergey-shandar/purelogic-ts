import "mocha";
import * as chai from "chai";
import { lazy } from "../index";

chai.should();

it("lazy()", () => {
    let counter = 0;
    const lazyFunc = lazy(() => { ++counter; return counter; });
    lazyFunc().should.equal(1);
    lazyFunc().should.equal(1);
    counter.should.equal(1);
});
