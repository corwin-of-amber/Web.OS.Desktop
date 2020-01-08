import { Core } from '@osjs/client';
import {TtyShell} from 'basin-shell/src/shell';
import { Terminal } from 'xterm';



async function startx(osjs: Core) {
    (<any>window).xterm = await import('./xterm-app');

    var proc = await osjs.run('Terminal');
    setTimeout(() => {
        var term = (<{term: Terminal}><unknown>proc.windows[0]).term;
        var t = new TtyShell();
        t.attach(term);
        t.start();
    }, 1000);
}


export { startx }