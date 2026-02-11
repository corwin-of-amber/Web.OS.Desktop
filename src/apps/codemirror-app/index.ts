let osjs = window.OSjs;

import './index.scss';
import {name as applicationName} from './metadata.json';

import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';


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
    
    if (args && args.file) {
        win.setTitle(args.file.path);
        (async () => {
            var text = await osjs.make('osjs/vfs').readfile(args.file, 'string');
            cm.setState(EditorState.create({doc: text}));
            cm.focus();
        })();
    }

    return win;
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

    console.log('codemirror start', args, options);

    if (options?.open !== false)
        setTimeout(() => createWindow(core, proc, args), 10);

    return proc;
});
