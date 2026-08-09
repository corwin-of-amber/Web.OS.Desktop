import { System } from 'wasi-kernel';
import { ChildProcess } from 'wasi-kernel/services';
import { AsyncQueue } from '../../shell/streams';
import { Future } from '../../infra/future';


class LeanWorkerProcess {
    process: ChildProcess
    sourceFilename = "wasi:/home/knaves.lean"

    transport = new LeanWorkerTransport
    ready: Promise<void>
    _vfs: any /* osjs/vfs */

    constructor(wasik: System) {
        this.ready = this.launch(wasik);
    }

    get vfs() { return (this._vfs ??= OSjs.make('osjs/vfs')); }

    async launch(wasik: System) {
        let cp = await wasik.runWasix('/usr/bin/lean', {args: ['lean', '--worker'], stdin: {}});
        let r = cp.instance.stdout.getReader();
        this.transport.digestStream(r); // async
        (async () => {
            let r = cp.instance.stderr.getReader();
            while (true) {
                let chunk = await r.read();
                if (chunk.done) break;
                console.log(this.transport.td.decode(chunk.value));
            }
        })();
        this.process = cp;
    }

    send(msg: object) {
        this.process.write(this.transport.formatMessage(msg));
    }

    async getDoc(): Promise<any> {
        return {
            uri: this.sourceFilename,
            languageId: 'lean',
            version: 1,
            text: await this.vfs.readfile(this.sourceFilename, 'string')
        };
    }

    async *experiment() {
        this.transport.experiment(await this.getDoc());

        (async () => {
            for await (let msg of this.transport.outgoing.consume()) {
                this.send(msg);
            }
        })();

        for await (let msg of this.transport.incoming.consume()) {
            yield msg;
        }
    }

    poke(at?: {line: number, character: number}) {
        return this.transport.poke({
            textDocument: {uri: this.sourceFilename},
            position: at ?? EXAMPLE_POS
        });
    }

    onCodeMirrorPoke(ev: CodeMirrorPokeEvent) {
        if (ev.file.path == this.sourceFilename) {
            return this.poke({line: ev.pos.line - 1, character: ev.pos.ch});
        }
    }
}

interface CodeMirrorPokeEvent { file: {path: string}, pos: {line: number, ch: number} };

class LeanWorkerTransport {
    td = new TextDecoder();
    incoming = new AsyncQueue<object>()
    outgoing = new AsyncQueue<object>()
    pending = new Map<number, Future<object>>()

    _highestId: number = 0

    m = {
        init: { "jsonrpc": "2.0", "method": "initialize", "params": { "processId": null, "clientInfo": { "name": "lean-test-client", "version": "1.0.0" }, "rootUri": "file:///home/", "capabilities": { "textDocument": { "hover": { "contentFormat": ["markdown", "plaintext"] } } } } },
        didOpen: { "jsonrpc": "2.0", "method": "textDocument/didOpen", "params": { "textDocument": { "uri": "file:///home/a.lean", "languageId": "lean", "version": 1, "text": EXAMPLE_FILE } } },
        hover: { "jsonrpc": "2.0", "method": "textDocument/hover", "params": { "textDocument": { "uri": "file:///home/a.lean" }, "position": EXAMPLE_POS } },
        plainGoal: { "jsonrpc": "2.0", "method": "$/lean/plainGoal", "params": { "textDocument": { "uri": "file:///home/a.lean" }, "position": EXAMPLE_POS } }
    };

    digest(buf: Uint8Array, buflen: number) {
        let g = this.splitResponses(buf, buflen);
        while (true) {
            let msg = g.next();
            switch (msg.done) {
                case true: return msg.value;
                case false: 
                    try {
                        this._accept(this.parseResponse(msg.value));
                    }
                    catch (e) {
                        console.warn("malformed message dropped", e);
                    }
            }
        }
    }

    async digestStream(reader: ReadableStreamDefaultReader<any>) {
        let buf = new Uint8Array(1 << 20), buflen = 0;
        while (true) {
            let chunk = await reader.read();
            if (chunk.done) break;
            buf.set(chunk.value, buflen);
            buflen += chunk.value.length;
            buflen = this.digest(buf, buflen);
        }
    }

    *splitResponses(buf: Uint8Array, buflen: number) {
        while (true) {
            let hdr = this.td.decode(buf.slice(0, buf.indexOf(10) + 4));
            let mo = hdr.match(/^Content-Length:\s*(\d+)\r\n\r\n/);
            if (mo) {
                let start = mo[0].length, end = start + +mo[1];
                if (end <= buflen) {
                    yield buf.slice(start, end);
                    buf = buf.slice(end); buflen -= end;
                }
                else break;
            }
            else break;
        }
        return buflen;
    }

    parseResponse(payload: Uint8Array): object {
        return JSON.parse(this.td.decode(payload));
    }

    prepareMessage<T extends {jsonrpc?: string, id?: number}>(msg: T, kind: MessageKind = MessageKind.REQUEST) {
        msg.jsonrpc ??= "2.0";
        if (kind === MessageKind.REQUEST)
            msg.id ??= this.freshId();
        return msg as T & {jsonrpc: string, id?: number};
    }

    formatMessage(msg: object) {
        let s = JSON.stringify(msg),
            byteLength = new TextEncoder().encode(s).length;
        return `Content-Length: ${byteLength}\r\n\r\n${s}`;
    }    

    _accept(msg: any) {
        this.incoming.push(msg);
        let id = msg.id;
        if (typeof id === 'number') {
            this._highestId = Math.max(id, this._highestId);
            if (Object.hasOwn(msg, 'result')) {
                let p = this.pending.get(msg.id);
                p?.resolve(msg.result);
            }
        }
    }

    experiment(doc: LeanDocument) {
        this.outgoing.push(this.prepareMessage({...this.m.init}));
        this.outgoing.push(
            this.prepareMessage({
                ...this.m.didOpen,
                params: {textDocument: doc}
            }, MessageKind.NOTIFICATION));
    }

    poke(params: {textDocument: {uri: string}, position: {line: number, character: number}}) {
        let m = this.prepareMessage({...this.m.plainGoal, params}),
            pend = new Future<object>();
        this.pending.set(m.id, pend);
        this.outgoing.push(m);
        return pend;
    }

    freshId() {
        return ++this._highestId;
    }
}

interface Document<LangId extends string> {
    uri: string
    languageId: LangId
    version: number
    text: string
}
type LeanDocument = Document<'lean'>

enum MessageKind {
    REQUEST,
    NOTIFICATION
}

const EXAMPLE_FILE = `
module

example {P Q R : Prop} (h : P ∨ Q) (hPR : P → R) (hQR : Q → R) : R := by
  rcases h with h_1|h_1
  · exact hPR h_1
  · exact hQR h_1
`;
const EXAMPLE_POS = {line: 4, character: 22};


export { LeanWorkerProcess, LeanWorkerTransport }