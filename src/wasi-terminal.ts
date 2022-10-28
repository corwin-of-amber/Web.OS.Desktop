import { EventEmitter } from 'events';
import { Core, Window, Application } from '@osjs/client';
import { Terminal } from 'xterm';
//import { ResourceBundle } from 'basin-shell/src/package-mgr';
import { Shell } from 'wasi-kernel/extra/shell';
import { ResourceBundle } from 'wasi-kernel/services';

import { TtyShell } from 'basin-shell/src/tty-shell';
import { init, SharedVolume } from 'wasi-kernel';


class WASITerminal {

    proc: Application
    distro: {[name: string]: ResourceBundle}

    constructor(osjs: Core, distro: {[name: string]: ResourceBundle}) {
        this.distro = distro;
        this.start(osjs as Core & EventEmitter);
    }

    async start(osjs: Core & EventEmitter) {
        this.proc = await osjs.run('Terminal');
        this.proc.on('create-window', (win: ShellWindow) => {
            win.on('render', async () => {
                win.shell = await this.createShell(win.term);
                osjs.emit('wasi/login', {shell: win.shell});
            });
        });
    }

    async createShell(term: Terminal) {
        var shell = new TtyShell();
        shell.pool.opts = {workerScriptUri: new URL('worker.js', location.href)};
        shell.env.ENV = '/home/.dashrc';
        if (this.shell)
            shell.volume = this.shell.volume;
        else
            shell.volume = await this.prepareVolume(shell);

        shell.attach(term);
        shell.spawn('/bin/dash.wasm', []);
        //shell.start();
        Object.assign(window, {shell});  // for development
        return shell;
    }

    async prepareVolume(shell: Shell) {
        await init();
        let volume = new SharedVolume(new ArrayBuffer(1 << 26));
        var div = document.createElement('div');
        div.classList.add("notification--download");
        document.body.appendChild(div);
        for (let e of Object.entries(this.distro)) {
            let [name, pkg] = e;
            div.textContent = "Downloading " + name;
            //await shell.packageManager.install(pkg);
        }
        div.remove();
        return volume;
    }

    get shell() {
        var win = this.proc.windows[0] as ShellWindow;
        return win && win.shell;
    }

}

type ShellWindow  = Window & {term: Terminal, shell: Shell};



export { WASITerminal, ShellWindow }
