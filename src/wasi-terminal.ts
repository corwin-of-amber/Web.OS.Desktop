import { Core, Window, Application } from '@osjs/client';
import { Terminal } from 'xterm';
import { Shell, TtyShell } from 'basin-shell/src/shell';
import { ResourceBundle } from 'basin-shell/src/package-mgr';



class WASITerminal {

    proc: Application
    distro: {[name: string]: ResourceBundle}

    constructor(osjs: Core, distro: {[name: string]: ResourceBundle}) {
        this.distro = distro;
        this.start(osjs);
    }

    async start(osjs: Core) {
        this.proc = await osjs.run('Terminal');
        this.proc.on('create-window', (win: ShellWindow) => {
            win.on('render', async () => {
                win.shell = this.createShell(win.term);
            });
        });
    }

    createShell(term: Terminal) {
        var shell = new TtyShell();
        if (this.shell)
            shell.volume = this.shell.volume;
        else
            this.prepareVolume(shell);

        shell.attach(term);
        shell.start();
        Object.assign(window, {shell});  // for development
        return shell;
    }

    prepareVolume(shell: Shell) {
        for (let pkg of Object.values(this.distro))
            shell.packageManager.install(pkg);
    }

    get shell() {
        var win = this.proc.windows[0] as ShellWindow;
        return win && win.shell;
    }

}

type ShellWindow  = Window & {term: Terminal, shell: Shell};



export { WASITerminal, ShellWindow }
