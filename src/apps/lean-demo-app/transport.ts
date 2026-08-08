import { System } from 'wasi-kernel';
import { ChildProcess } from 'wasi-kernel/services';
import { AsyncQueue } from '../../shell/streams';


class LeanWorkerProcess {
    process: ChildProcess

    transport = new LeanWorkerTransport
    ready: Promise<void>

    constructor(wasik: System) {
        this.ready = this.launch(wasik);
    }

    async launch(wasik: System) {
        let cp = await wasik.runWasix('/usr/bin/lean', {args: ['lean', '--worker'], stdin: {}});
        let buf = new Uint8Array(1 << 20), buflen = 0;
        (async () => {
            let r = cp.instance.stdout.getReader();
            while (true) {
                let chunk = await r.read();
                if (chunk.done) break;
                buf.set(chunk.value, buflen);
                buflen += chunk.value.length;
                buflen = this.transport.consume(buf, buflen);
            }
        })();
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
        this.process.write(this.transport.formatRequest(msg));
    }

    async *experiment() {
        this.send(this.transport.m.init);
        this.send(this.transport.m.didOpen);
        for await (let msg of this.transport.incoming.consume()) {
            yield msg;
        }
    }

    poke() {
        this.transport.m.hover.id++;
        this.send(this.transport.m.hover);
    }
}

class LeanWorkerTransport {
    td = new TextDecoder();
    incoming = new AsyncQueue<object>();

    m = {
        init: { "jsonrpc": "2.0", "id": 0, "method": "initialize", "params": { "processId": null, "clientInfo": { "name": "lean-test-client", "version": "1.0.0" }, "rootUri": "file:///home/", "capabilities": { "textDocument": { "hover": { "contentFormat": ["markdown", "plaintext"] } } } } },
        didOpen: { "jsonrpc": "2.0", "method": "textDocument/didOpen", "params": { "textDocument": { "uri": "file:///home/a.lean", "languageId": "lean", "version": 1, "text": "def x : Nat := 0" } } },
        hover: { "jsonrpc": "2.0", "id": 100, "method": "textDocument/hover", "params": { "textDocument": { "uri": "file:///home/a.lean" }, "position": { "line": 0, "character": 9 } } }
    };

    consume(buf: Uint8Array, buflen: number) {
        let g = this.splitResponses(buf, buflen);
        while (true) {
            let msg = g.next();
            switch (msg.done) {
                case true: return msg.value;
                case false: 
                    try {
                        this.incoming.push(this.parseResponse(msg.value));
                    }
                    catch (e) {
                        console.warn("malformed message dropped", e);
                    }
            }
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

    formatRequest(msg: object) {
        let s = JSON.stringify(msg);
        return `Content-Length: ${s.length}\r\n\r\n${s}`;
    }
}


export { LeanWorkerProcess, LeanWorkerTransport }