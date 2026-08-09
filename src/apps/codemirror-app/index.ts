//let osjs = window.OSjs;

import './index.scss';
import {name as applicationName} from './metadata.json';

import { EventEmitter } from 'events';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { lean4, leanFallbackHighlightStyle } from 'codemirror-lean4-lsp';
import { KeyMap } from '../../infra/keymap';


function createWindow(core, proc, args) {
    var win = proc.createWindow({
        title: proc.metadata.title.en_EN,
        position: {top: 0.5, left: 0.1},
        dimension: {width: 500, height: 280},
        attributes: {
            classNames: ['Window_CodeMirror']
        }
    });
    win.render();

    let cm = new EditorView({parent: win.$content});
    win.cm = cm;

    let state = new DocumentState(cm);
    win.docstate = state;

    state.on('poke', ev => core.emit('cm/poke', ev));

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

class DocumentState extends EventEmitter {
    _vfs: any /* osjs/vfs */

    constructor(public cm: EditorView, public file?: {path: string}) {
        super();
    }

    get vfs() { return (this._vfs ??= OSjs.make('osjs/vfs')); }

    async open(file: {path: string}) {
        this.file = file;
        let text = await this.vfs.readfile(this.file, 'string');
        this.cm.setState(EditorState.create({
            doc: text,
            extensions: this.languageExtensions()
        }));
    }

    async save() {
        if (this.file)
            await this.vfs
                .writefile(this.file, this.cm.state.sliceDoc());
    }

    languageExtensions() {
        let fn = this.file?.path;
        if (fn) {
            if (fn.endsWith('.lean'))
                return [
                    lean4({
                        highlightStyle: leanFallbackHighlightStyle,
                    }),
                    this.pokeListener()
                ];
        }
        return [];
    }

    pokeListener() {
        return EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
                const pos = update.state.selection.main.head;
                this.emit('poke', {
                    file: this.file,
                    pos: {offset: pos, ...this.offsetToPos(pos)}
                });
            }
        });
    }

    offsetToPos(offset: number) {
        let line = this.cm.state.doc.lineAt(offset);
        return {line: line.number, ch: offset - line.from};
    }
}

//
// OS.js application entry point
//
OSjs.register(applicationName, (core, args, options, metadata) => {

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
