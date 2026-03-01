let osjs = window.OSjs;

import './index.scss';
import {name as applicationName} from './metadata.json';

import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { KeyMap } from '../../infra/keymap';


function createWindow(core, proc, args) {
    var win = proc.createWindow({
        title: proc.metadata.title.en_EN,
        dimension: {width: 500, height: 280},
        attributes: {
            gravity: 'bottom',
            classNames: ['Window_CodeMirror']
        }
    });
    win.render();

    let cm = new EditorView({parent: win.$content});
    win.cm = cm;

    let state = new DocumentState(cm);
    win.docstate = state;

    let km = new KeyMap({
        'Mod-S': () => { state.save(); return true; }
    })
    km.attach(win.$element);
    
    if (args && args.file) {
        win.setTitle(args.file.path);
        state.open(args.file);
    }
    
    cm.focus();
    return win;
}

class DocumentState {
    _vfs: any /* osjs/vfs */

    constructor(public cm: EditorView, public file?: {path: string}) {
    }

    get vfs() { return (this._vfs ??= osjs.make('osjs/vfs')); }

    async open(file: {path: string}) {
        this.file = file;
        var text = await this.vfs
            .readfile(this.file, 'string');
        this.cm.setState(EditorState.create({doc: text}));
    }

    async save() {
        if (this.file)
            await this.vfs
                .writefile(this.file, this.cm.state.sliceDoc());
    }
}

//
// OS.js application entry point
//
osjs.register(applicationName, (core, args, options, metadata) => {

    const proc = core.make('osjs/application', {args, options, metadata});

    proc.on('destroy-window', () => {
        if (!proc.windows.length) {
            proc.destroy();
        }
    });

    proc.on('attention', (args, options) => {
        console.log('codemirror attention', args, options);
        setTimeout(() => createWindow(core, proc, args), 10);
    });

    if (options?.open !== false)
        setTimeout(() => createWindow(core, proc, args), 10);

    return proc;
});
