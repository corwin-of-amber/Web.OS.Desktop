import * as fs from 'fs';
import { Shell } from 'basin-shell/src/shell';
import { SharedVolume } from 'wasi-kernel/src/kernel/services/shared-fs';



class WasmFsAdapter {

    volume: SharedVolume
    extensions: {[ext: string]: {mime: string}}

    constructor() {
        this.extensions = {
            '.pdf': {mime: 'application/pdf'}
        };
    }

    async readdir({path}, options: {}) { 
        path = path.replace(/^\w+:/, '');
        var ls = await this.volume.promises.readdir(path) as (string | {name: string})[];
        return ls.map(entry => {
            var fn = typeof(entry) === 'string' ? entry : entry.name;
            return {
                isDirectory: false,
                isFile: true,
                filename: fn,
                path: `${path.replace(/(\/+)?$/, '/')}${fn}`,
                size: 0,
                stat: {}
            }
        });
    }

    async readfile({path}, type: string, options: {}) {
        path = path.replace(/^\w+:/, '');
        var bytes = await this.volume.promises.readFile(path);
        return {body: bytes, mime: this.guessMimeFromFilename(path)};
    }

    guessMimeFromFilename(filename: string) {
        var mo = filename.match(/.*([.].*)$/),
            ext = mo ? mo[1] : '',
            attr = this.extensions[ext];
        return (attr && attr.mime) || 'application/octet-stream';
    }

    attach(volume: SharedVolume) {
        this.volume = volume;
    }

/*
    readfile: (path, type, options) => Promise.resolve({body: new ArrayBuffer(), mime: 'application/octet-stream'}),
    writefile: (path, data, options) => Promise.resolve(-1),
    copy: (from, to, options) => Promise.resolve(false),
    rename: (from, to, options) => Promise.resolve(false),
    mkdir: (path, options) => Promise.resolve(false),
    unlink: (path, options) => Promise.resolve(false),
    exists: (path, options) => Promise.resolve(false),
    stat: (path, options) => Promise.resolve({}),
    url: (path, options) => Promise.resolve(null),
    mount: options => Promise.resolve(true),
    unmount: options => Promise.resolve(true),
    search: (root, pattern, options) => Promise.resolve([]),
    touch: (path, options) => Promise.resolve(false)
*/
    static factory(core) {
        var adapter = new WasmFsAdapter();
        core.on('wasi/login', ({shell}: {shell: Shell}) => {
            console.log('wasi attach', shell);
            adapter.attach(shell.volume);
        });
        Object.assign(window, {adapter});
        return {
            readdir: (path, options) => adapter.readdir(path, options),
            readfile: (path, type, options) => adapter.readfile(path, type, options)
        };
    }

}


export { WasmFsAdapter }
