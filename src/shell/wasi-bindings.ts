import { System } from 'wasi-kernel';
import { ChildProcess, Pty, PtyMode } from 'wasi-kernel/services';
import { AsyncQueue, DuplexStream } from './streams';


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

    withTerminal(term: TerminalInterface) {
        term.options.convertEol = true;
        term.onData(data => this.write(data));
        (async () => {
            for await (let data of this.read()) term.write(data);
        })();
        return this;
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

class PtyChildProcessStreamAdapter extends PtyStreamAdapter {
    process: ChildProcess

    withProcess(process: ChildProcess) {
        this.process = process;
        this.pump();
        /** @todo this should be determined by the process */
        this.pty.setOpts({mode: PtyMode.RAW, echo: false});
        return this;
    }

    async pump() {
        this.pty.on('data', data => this.process.write(data));
        for await (let chunk of this.process.readRaw()) {
            this.data.push(chunk.value);
        }        
    }
}

/**
 * To interface with xterm app
 */
interface TerminalInterface {
    options: any
    write(data: Uint8Array | string): void;
    onData(handler: (data: Uint8Array | string) => void): void;
}

const wasik = new System('node_modules/wasi-kernel/');


export { DummyTerminal, PtyChildProcessStreamAdapter, wasik }