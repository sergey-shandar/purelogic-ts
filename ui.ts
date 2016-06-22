import * as bag from "./bag";
import * as syncmem from "./syncmem";

class Account {
    constructor(public name: string, public total: number) {
    }
}

const accountsBag = bag.input<Account>();

const sumBug = accountsBag.map(account => account.total).reduce((a, b) => a + b);

const accountsArray = [
    new Account("First Account", 123.00),
    new Account("Second Account", 123.45),
];

const engine = new syncmem.SyncMem();

engine.set(accountsBag, () => accountsArray);

export const total = engine.get(sumBug)()[0];