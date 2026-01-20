import { Future } from "../infra/future";


interface DuplexStream<In, Out=In> {
    write(data: In): void
    read(): AsyncGenerator<Awaited<Out>>
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


export { DuplexStream, AsyncQueue }