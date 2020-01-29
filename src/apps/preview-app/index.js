let osjs = window.OSjs;

import './index.scss';
import {name as applicationName} from './metadata.json';


function createWindow(core, proc) {
    var win = proc.createWindow({
        title: proc.metadata.title.en_EN,
        dimension: {width: 320, height: 380},
        attributes: {
            classNames: ['Window_Preview']
        }
    });
    win.render();

    var iframe = document.createElement('iframe');
    win.$content.appendChild(iframe);
    win.iframe = iframe;
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

    setTimeout(() => createWindow(core, proc), 10);

    return proc;
});
