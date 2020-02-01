let osjs = window.OSjs;

import './index.scss';
import {name as applicationName} from './metadata.json';


function createWindow(core, proc, args) {
    var win = proc.createWindow({
        title: proc.metadata.title.en_EN,
        dimension: {width: 320, height: 380},
        attributes: {
            gravity: 'right',
            position: {right: 10},
            classNames: ['Window_Preview']
        }
    });
    win.render();

    var iframe = document.createElement('iframe');
    win.$content.appendChild(iframe);
    win.iframe = iframe;

    if (args && args.filename) {
        (async () => {
            var blob = await osjs.make('osjs/vfs').readfile(args.filename, 'blob');
            win.iframe.src = URL.createObjectURL(blob);
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

    proc.on('attention', console.log);

    setTimeout(() => createWindow(core, proc, args), 10);

    return proc;
});
