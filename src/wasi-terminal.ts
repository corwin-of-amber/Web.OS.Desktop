import { EventEmitter } from 'events';
import { Core, Window, Application } from '@osjs/client';
import { Terminal } from 'xterm';
import { Shell, TtyShell } from 'basin-shell/src/shell';
import { ResourceBundle } from 'basin-shell/src/package-mgr';



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
                win.shell = this.createShell(win.term);
                osjs.emit('wasi/login', {shell: win.shell});
            });
        });
    }

    createShell(term: Terminal) {
        var shell = new TtyShell();
        shell.env.ENV = '/home/.dashrc';
        if (this.shell)
            shell.volume = this.shell.volume;
        else
            this.prepareVolume(shell);

        shell.attach(term);
        shell.start();
        Object.assign(window, {shell});  // for development
        return shell;
    }

    async prepareVolume(shell: Shell) {
        var div = document.createElement('div');
        div.classList.add("notification--download");
        document.body.appendChild(div);
        for (let e of Object.entries(this.distro)) {
            let [name, pkg] = e;
            div.textContent = "Downloading " + name;
            await shell.packageManager.install(pkg);
        }
        div.remove();
    }

    get shell() {
        var win = this.proc.windows[0] as ShellWindow;
        return win && win.shell;
    }

}

type ShellWindow  = Window & {term: Terminal, shell: Shell};



export { WASITerminal, ShellWindow }
