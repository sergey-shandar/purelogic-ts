import * as chai from "chai";

chai.should();

export function iterableEqual<T>(a: Iterable<T>, b: Iterable<T>) {
    Array.from(a).should.deep.equal(Array.from(b));
}