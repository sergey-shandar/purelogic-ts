import * as flatten from "./flatten";

export class Ref<T> {

    constructor(public readonly array: T[]) {}

    flatten<O>(f: flatten.Func<T, O>): O[] {
        const result: O[] = [];
        return result.concat(...this.array.map(f));
    }

    spliceOne(i: number): T {
        return this.array.splice(i, 1)[0];
    }
}

export function ref<T>(array: T[]): Ref<T> {
    return new Ref(array);
}