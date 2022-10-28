//import { Shell } from 'basin-shell/src/shell';
import { SharedVolume } from 'wasi-kernel';



class WasmFsAdapter {

    volume: SharedVolume
    extensions: {[ext: string]: {mime: string}}

    constructor() {
        this.extensions = {
            '.pdf': {mime: 'application/pdf'},
            '.py': {mime: 'text/python'},
            '.ml': {mime: 'text/ocaml'},
            '.tex': {mime: 'text/tex'}
        };
    }

    async readdir({path}, options: {}) { 
        var physical = path.replace(/^\w+:/, '');
        var ls = await this.volume.promises.readdir(physical) as (string | {name: string})[];
        return ls.map(entry => {
            var fn = typeof(entry) === 'string' ? entry : entry.name,
                stat = this.statPhysical({path: `${physical}/${fn}`});
            return {
                isDirectory: stat && stat.isDirectory(),
                isFile: stat && stat.isFile(),
                filename: fn,
                path: `${path.replace(/(\/+)?$/, '/')}${fn}`,
                size: stat ? stat.size : 0,
                mime: this.guessMimeFromFilename(fn),
                stat: stat
            }
        });
    }

    async readfile({path}, type: string, options: {}) {
        path = path.replace(/^\w+:/, '');
        var bytes = await this.volume.promises.readFile(path);
        return {body: bytes, mime: this.guessMimeFromFilename(path)};
    }

    async writefile({path}, data: Blob, options) {
        path = path.replace(/^\w+:/, '');
        var buf = new Uint8Array(await data.arrayBuffer());
        await this.volume.writeFile(path, buf, () => {});
        return 0;
    }

    async stat({path}) {
        var physical = path.replace(/^\w+:/, ''),
            stat = await this.volume.promises.stat(physical);
        return {
            isDirectory: stat && stat.isDirectory(),
            isFile: stat && stat.isFile(),
            path: path,
            size: stat ? stat.size : 0,
            mime: this.guessMimeFromFilename(physical),
            stat: stat
        };
    }

    statSync({path}) {
        var physical = path.replace(/^\w+:/, '');
        return this.volume.statSync(physical);
    }

    statPhysical(filename) {
        try {
            return this.statSync(filename);
        }
        catch (e) { return undefined; }
    }

    guessMimeFromFilename(filename: string) {
        var mo = filename.match(/.*([.].*)$/),
            ext = mo ? mo[1] : '',
            attr = this.extensions[ext];
        return (attr && attr.mime) || 'application/octet-stream';
    }

    attach(volume: SharedVolume) {
        this.volume = volume;
        volume.mkdirSync('/home', {recursive: true});
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
            readfile: (file, type, options) => adapter.readfile(file, type, options),
            writefile: (file, data, options) => adapter.writefile(file, data, options),
            stat: (filename) => adapter.stat(filename)
        };
    }

}


export { WasmFsAdapter }
