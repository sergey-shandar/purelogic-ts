import * as chai from "chai";
import * as iterable from "iterable-ts";

chai.should();

export function iterableEqual<T>(a: iterable.I<T>, b: iterable.I<T>) {
    iterable.toArray(a).should.deep.equal(iterable.toArray(b));
}