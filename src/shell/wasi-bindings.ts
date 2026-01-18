import { Future } from "../infra/future";
import { Pty } from "wasi-kernel/services";


interface DuplexStream<In, Out=In> {
    write(data: In): void
    read(): AsyncGenerator<Awaited<Out>>
}

type PtyDuplexStream = DuplexStream<Uint8Array | string, Uint8Array>;

class PtyStreamAdapter implements PtyDuplexStream {
    pty = new Pty
    data = new AsyncQueue<Uint8Array>

    constructor() {
        this.pty.on('term:data', data => this.data.push(data));
    }

    write(data: Uint8Array | string) {
        this.pty.termWrite(data);
    }

    read() {
        return this.data.consume();
    }
}

class DummyTerminal extends PtyStreamAdapter {

    PS1 = '@> '

    constructor() {
        super();
        this.ps1();
    }

    ps1() { this.pty.termWrite(this.PS1); }

    write(data: Uint8Array | string): void {
        super.write(data);
        for (let c of data) {
            console.log(c)
            if (c == 13 || c == '\r') this.ps1();
        }
    }
}


class AsyncQueue<E> {
    elems: E[] = []
    reads: Future<void>[] = []

    push(e: E) {
        this.elems.push(e);
        let p: Future<void>;
        while (p = this.reads.pop())
            p.resolve();
    }

    async pop(): Promise<E> {
        while (this.elems.length === 0) {
            let fut = new Future<void>;
            this.reads.push(fut);
            await fut;
        }
        return this.elems.shift();
    }

    async *consume(): AsyncGenerator<E> {
        while (true) {
            yield await this.pop();
        }
    }
}


export { DuplexStream, DummyTerminal, AsyncQueue }