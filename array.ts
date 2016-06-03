import { FlattenFunc } from "./bag";

export class Ref<T> {

    constructor(public array: T[]) {}

    flatten<O>(f: FlattenFunc<T, O>): O[] {
        const result: O[] = [];
        return result.concat(...this.array.map(f));
    }

    remove(i: number): T {
        return this.array.splice(i, 1)[0];
    }
}

export function ref<T>(array: T[]): Ref<T> {
    return new Ref(array);
}