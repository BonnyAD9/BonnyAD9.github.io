class FSItem {
    /** @type {Path} */
    path;
    /** @type {String} */
    type;
    /** @type {String | [String: FSItem] | function(Env): [Number]} */
    value;
    /** @type {Boolean} */
    exe = false;

    /**
     *
     * @param {String} name
     * @returns {FSItem | null}
     */
    createFile(name) {
        createFile(this, name);
    }

    /**
     *
     * @param {String} name
     * @returns {FSItem | null}
     */
    createDir(name) {
        createDir(this, name);
    }
}

function htmlText(s) {
    let lookup = {
        '&': "&amp;",
        '"': "&quot;",
        '\'': "&apos;",
        '<': "&lt;",
        '>': "&gt;"
    };
    return s.replace( /[&"'<>]/g, c => lookup[c] );
}

/**
 *
 * @param {FSItem} dir
 * @param {String} name
 * @returns {FSItem | null}
 */
function createFile(dir, name) {
    if (dir.type !== 'dir') {
        return null;
    }

    if (dir.value[name]) {
        return null;
    }

    dir.value[name] = {
        path: dir.path.join(new Path(name)),
        type: 'file',
        value: "",
    };
    return dir.value[name];
}

/**
 *
 * @param {FSItem} dir
 * @param {String} name
 * @returns {FSItem | null}
 */
function createDir(dir, name) {
    if (dir.type !== 'dir') {
        return null;
    }

    if (dir.value[name]) {
        return null;
    }

    dir.value[name] = {
        path: dir.path.join(new Path(name)),
        type: 'dir',
        value: "",
    };

    dir.value[name].createFile = n => createFile(dir.value[name], n);
    dir.value[name].createDir = n => createDir(dir.value[name], n);
    return dir.value[name];
}

class Env {
    /** @type {Path} */
    cwd;
    /** @type {[String]} */
    args;
    /** @type {Object} */
    vars = {};
    /** @type {function(...String)} */
    stdout;
    /** @type {function(...String)} */
    stderr;

    /**
     * Creates new environment
     * @param {Path} cwd current working directory
     * @param {[String]} args command line arguments
     * @param {function(...String)} stdout standard output
     * @param {function(...String)} stderr standard error output
     */
    constructor(cwd, args, stdout, stderr) {
        this.cwd = cwd;
        this.args = args;
        this.stdout = stdout;
        this.stderr = stderr;
    }

    /**
     * Prints to the standard output
     * @param  {...any} vals values to print
     */
    print(...vals) {
        this.stdout(...vals);
    }

    /**
     * Prints to the standard output and appends newline.
     * @param  {...any} vals values to print
     */
    println(...vals) {
        this.stdout(...vals, "\n");
    }

    /**
     * Prints to the standard error output
     * @param  {...any} vals values to print
     */
    eprint(...vals) {
        this.stderr(...vals);
    }

    /**
     * Prints to the standard error output and appends newline.
     * @param  {...any} vals values to print
     */
    eprintln(...vals) {
        this.stderr(...vals, "\n");
    }

    /**
     * prints error message
     * @param  {...any} vals error message
     */
    error(...vals) {
        this.stderr(col('r', "error: "), ...vals, "\n");
    }

    /**
     * inerits this environment with the given arguments
     * @param {[String]} args command line arguments
     * @returns new environtment
     */
    inherit(args) {
        return new Env(this.cwd, args, this.stdout, this.stderr);
    }

    getVar(name) {
        if (this.vars[name]) {
            return vars[name];
        }
        if (jinux.env[name]) {
            return jinux.env[name];
        }
        return null;
    }
}

class CharReader {
    /** @type {[String]} */
    chars;

    /**
     *
     * @param {String} str
     */
    constructor(str) {
        this.chars = str.split("").reverse();
    }

    /**
     *
     * @returns {String | null}
     */
    cur() {
        return this.chars.length == 0 ? null : this.chars[this.chars.length - 1];
    }

    /**
     *
     * @returns {String | null}
     */
    next() {
        this.chars.pop();
        return this.cur();
    }

    /**
     *
     * @param {String} str
     */
    prepend(str) {
        str.split("").reverse().forEach(c => this.chars.push(c));
    }
}

class Command {
    /** @type {Env} */
    env;
    /** @type {String} */
    cmd;
    /** @type {Command | null} */
    //next = null;
    /** @type {String | null} */
    //next_type = null;
    /** @type {String | null} */
    stdout = null;
    /** @type {String | null} */
    // stderr = null;

    /**
     *
     * @param {Env} env
     * @param {String | [String]} arg
     * @returns
     */
    constructor(env, arg) {
        if (arg.constructor === Array) {
            let [cmd, ags] = arg;
            this.cmd = cmd;
            this.env = env;
            this.env.args = ags;
            return;
        }

        let args = new CharReader(arg);

        /**
         *
         * @param {CharReader} args
         */
        const readQuote = args => {
            /** @type {String} */
            let res = "";
            while (args.next()) {
                switch (args.cur()) {
                    case "'":
                        args.next();
                        return res;
                    default:
                        res += args.cur();
                        break;
                }
            }
            return res;
        };

        /**
         *
         * @param {CharReader} args
         */
        const readVariable = args => {
            /** @type {String} */
            let name = "";
            args.next();

            if (args.cur() === "{") {
                while (args.next()) {
                    if (args.cur() === "}") {
                        args.next();
                        return env.getVar(name) ?? "";
                    }
                    name += args.cur();
                }
                return env.getVar(name) ?? "";
            }

            while (args.cur()) {
                let code = args.cur().charCodeAt(0);
                if (!(code > 47 && code < 58) && // numeric (0-9)
                    !(code > 64 && code < 91) && // upper alpha (A-Z)
                    !(code > 96 && code < 123)   // lower alpha (a-z)
                ) {
                    return env.getVar(name) ?? "";
                }

                name += args.cur();
                args.next();
            }

            return env.getVar(name) ?? "";
        };

        /**
         *
         * @param {CharReader} args
         */
        const readDQuote = args => {
            /**
             *
             * @param {CharReader} args
             */
            const escDQuote = args => {
                /** @type {String} */
                switch (args.next()) {
                    case "\\":
                        return "\\";
                    case "\"":
                        return "\"";
                    case "\\$":
                        return "$";
                    case null:
                        return "\\";
                    default:
                        return "\\" + args.cur();
                }
            }

            /** @type {String} */
            let res = "";
            while (args.next()) {
                switch (args.cur()) {
                    case "\"":
                        args.next();
                        return res;
                    case "\\":
                        res += escDQuote(args);
                        break;
                    case "$":
                        res += readVariable(args);
                        break;
                    default:
                        res += args.cur();
                        break;
                }
            }

            return res;
        };

        /**
         *
         * @param {CharReader} args
         */
        const readEsc = args => {
            let c = args.next();
            args.next();
            return c ? c : "";
        }

        /**
         *
         * @param {CharReader} args
         */
        const readRedirect = args => {
            args.next();
            while (args.cur() === " ") {
                args.next();
            }

            if (!args.cur()) {
                return;
            }

            this.stdout = readItem(args);
        }

        /**
         *
         * @param {CharReader} args
         */
        const readItem = args => {
            /** @type {String} */
            let cur = "";

            while (args.cur() && args.cur() !== " ") {
                switch (args.cur()) {
                    case "'":
                        cur += readQuote(args);
                        break;
                    case "\"":
                        cur += readDQuote(args);
                        break;
                    case "$":
                        args.prepend(readVariable(args));
                        break;
                    case "\\":
                        cur += readEsc(args);
                        break;
                    default:
                        cur += args.cur();
                        args.next();
                        break;
                }
            }

            return cur;
        }

        /** @type {[String]} */
        let parted = [];

        while (args.cur()) {
            while (args.cur() === " ") {
                args.next();
            }
            if (!args.cur()) {
                break;
            }
            switch (args.cur()) {
                case ">":
                    readRedirect(args);
                    break;
                default:
                    parted.push(readItem(args));
                    break;
            }
        }

        let [cmd, ...ags] = parted;
        this.cmd = cmd;
        this.env = env;
        this.env.args = ags;
    }

    /**
     *
     * @param {Boolean} clear true if the file should be empty
     * @returns
     */
    setStdout(clear) {
        if (!this.stdout) {
            return true;
        }

        let file = new Path(this.stdout).open();
        if (!file) {
            return false;
        }

        if (clear) {
            file.value = "";
        }

        const printFun = (...a) => {
            a.forEach(s => {
                if (!s.constructor || s.constructor !== TermCommand) {
                    file.value += s;
                }
            });
        }

        this.env.stdout = printFun;

        return true;
    }
}

/**
 * Applies styles to the given string.
 * @param {String} c style of the string
 * @param {String} s the string
 * @returns {String} new styled string.
 */
function col(c, s) {
    return `<span class="${c}">${s}</span>`;
}

var version = "v0.1.0";
var signature = '\
<span style="color: #fa32aa">B</span>\
<span style="color: #f032b4">o</span>\
<span style="color: #e632be">n</span>\
<span style="color: #dc32c8">n</span>\
<span style="color: #d232d2">y</span>\
<span style="color: #c832dc">A</span>\
<span style="color: #be32e6">D</span>\
<span style="color: #b432f0">9</span>'

/**
 *
 * @param {FSItem} pos position in the file system
 * @param {[String]} comps remaining components of the path
 * @returns {FSItem | null} The item at the path or null if it is not found
 */
function locatePath(pos, comps) {
    if (!pos) {
        return null;
    }
    if (comps.length === 0) {
        return pos;
    }
    if (pos.type !== 'dir') {
        return null;
    }

    let [head, ...tail] = comps;
    return locatePath(pos.value[head], tail);
}

/**
 * Represents path in the junix os.
 */
class Path {
    /** @type String */
    path;

    /**
     * Creates new path.
     * @param {String | [String] | Path} Path as string or as components.
     */
    constructor(path) {
        if (path.constructor === Path) {
            this.path = path.path;
            return;
        }
        if (path.constructor === Array) {
            if (path[0] !== "/") {
                this.path = path.join("/");
                return;
            }

            let [_, ...rest] = path;
            this.path = "/" + rest.join("/");
            return;
        }

        this.path = path.replace(/\/+$/, "");
        if (this.path.length === 0) {
            this.path = "/";
        }
    }

    /**
     *
     * @param {String} name
     * @returns {FSItem | null}
     */
    createDir(name) {
        let dir = this.locate();
        if (!dir) {
            return null;
        }

        return dir.createDir(name);
    }

    /**
     *
     * @param {String} name
     * @returns {FSItem | null}
     */
    createFile(name) {
        let dir = this.locate();
        if (!dir) {
            return null;
        }

        return dir.createFile(name);
    }

    /**
     *
     * @param {String} name
     * @returns {FSItem | null}
     */
    open() {
        let par = this.parent().locate();
        let name = this.name();
        if (!par) {
            return null;
        }

        if (par.value[name] && par.value[name].type == 'file') {
            return par.value[name];
        }

        return par.createFile(name);
    }

    /**
     * Gets the last component of the path.
     * @returns {String} The last component of the path.
     */
    name() {
        let comp = this.absolute().components();
        return comp[comp.length - 1];
    }

    /**
     * Gets te components of the path.
     * @returns {[String]} the components of the path.
     */
    components() {
        let comp = this.path.split("/").filter(c => c.length !== 0);
        if (this.path.startsWith("/")) {
            return ["/", ...comp];
        }
        return comp;
    }

    /**
     * Joins two paths.
     * @param {Path} other Path to be adjoined to this path.
     * @returns {Path} new path that is the two paths joined together.
     */
    join(other) {
        if (other.path.startsWith("/")) {
            if (this.path === "/") {
                return other.path;
            }
            return new Path(this.path + other.path);
        }
        if (this.path === "/") {
            return new Path("/" + other.path);
        }
        return new Path(this.path + "/" + other.path);
    }

    /**
     * Checks whether the item at the path exists.
     * @returns {boolean} true if the item at the path exists, otherwise false.
     */
    exists() {
        return !!this.locate();
    }

    /**
     * Gets the absolute path of this path.
     * @returns {Path} The absolute path with all '.' and '..' resolved.
     */
    absolute() {
        let _;
        let comp = this.components();
        if (comp.length == 0) {
            return new Path("");
        }

        let res = [];

        if (comp[0] === ".") {
            res.push(...jinux.cwd.components());
            [_, ...comp] = comp;
        } else if (comp[0] === "..") {
            res.push(...jinux.cwd.components());
            res.pop();
            [_, ...comp] = comp;
        } else if (comp[0] === "~") {
            res.push(...new Path(jinux.getVar("HOME") ?? "/").components());
            [_, ...comp] = comp;
        } else if (comp[0] !== "/") {
            res.push(...jinux.cwd.components());
        }

        comp.forEach(c => {
            if (c === "..") {
                res.pop();
            } else if (c !== ".") {
                res.push(c);
            }
        });

        if (res.length === 0) {
            return new Path("");
        }

        [_, ...res] = res;
        return new Path("/" + res.join("/"))
    }

    /**
     * Locates the item that this path points to in the file system.
     * @returns {FSItem | null} item that this path points to or null if it
     *                          doesn't exist
     */
    locate() {
        let [_, ...path] = this.absolute().components();
        return locatePath(jinux.root, path);
    }

    /**
     * Gets the type of this item
     * @returns {String | } type of this item or null if the item doesn't exist
     */
    type() {
        let loc = this.locate();
        return loc ? loc.type : null;
    }

    /**
     * Returns path without the start of the given path.
     * @param {Path} path start of the path to skip
     * @returns {Path} path without the start.
     */
    skipStart(path) {
        if (this.path.startsWith(path.path)) {
            return new Path("~").join(new Path(this.path.substring(
                path.path.length,
                this.path.length
            )));
        }
        return new Path(this.path);
    }

    /**
     * Gets the parent folder of this path. Doesn't check for existance.
     * @returns {Path} the parent folder.
     */
    parent() {
        let comp = this.absolute().components();
        return new Path(comp.slice(0, comp.length -1));
    }
}

function prepDir(path, dir) {
    dir.path = path;
    if (dir.type !== 'dir') {
        return;
    }
    dir.createDir = n => createDir(dir, n);
    dir.createFile = n => createFile(dir, n);
    Object.entries(dir.value).forEach(([n, d]) => {
        prepDir(path.join(new Path(n)), d);
    });
}

// jinux is not unix
var jinux = {
    /** @type {FSItem} */
    root: {
        type: 'dir',
        value: {},
    },
    /** @type {[String: String]} */
    env: {},
    /** @type {[String: String]} */
    loc_env: {},
    /** @type {Path} */
    cwd: new Path('/'),

    init() {
        prepDir(new Path("/"), this.root);
        let home = jinux.getVar("HOME");
        jinux.cwd = home ? new Path(home) : new Path("/");
    },

    /**
     *
     * @param {String} name
     * @returns {String} value of the invironment variable
     */
    getVar(name) {
        if (this.env[name]) {
            return this.env[name];
        }
        return null;
    },
};

function mkPath(path) {
    return new Path(path);
}

class TermCommand {
    /** @type {String} */
    cmd;

    /**
     *
     * @param {String} cmd
     */
    constructor(cmd) {
        this.cmd = String(cmd);
    }
}

const TERM = {
    clear: new TermCommand('clear'),
};

class Terminal {
    /** @type {HTMLElement} */
    display;
    /** @type {HTMLElement} */
    dis_input = null;
    /** @type {HTMLElement} */
    input;
    /** @type {Env} */
    env;
    /** @type {[Number]} */
    sel = [0, 0];
    /** @type {[Number]} */
    downPos = [0, 0];

    /** @type {Int} */
    his_pos = 0;
    /** @type {[String]} */
    history = [""];

    /**
     * Creates new terminal.
     * @param {HTMLElement} show the display of the terminal
     * @param {HTMLElement} input the input field of the terminal
     */
    constructor(show, input) {
        this.display = show;
        this.input = input;
    }

    /**
     * Initializes the terminal.
     */
    init() {
        const print = (...s) => s.forEach(s => {
            if (s.constructor && s.constructor === TermCommand) {
                switch (s.cmd) {
                    case 'clear':
                        this.clear();
                        break;
                }
            } else {
                this.display.innerHTML += s;
            }
        });
        this.env = new Env(jinux.cwd, [], print, print);

        const onValueChange = _e => {
            let sel = [this.input.selectionStart, this.input.selectionEnd];

            let idx = sel[0];
            if (sel[0] === this.sel[0] && sel[1] !== this.sel[1]) {
                idx = sel[1];
            }

            this.sel = sel;

            let value = this.input.value;
            let first = htmlText(value.substring(0, sel[0]));
            let caret = htmlText(value
                .substring(idx, Math.min(idx + 1, value.length))
            );
            if (caret.length === 0) {
                caret = " ";
            }
            let selected;
            let second = htmlText(
                value.substring(sel[1] + 1, value.length)
            );
            if (idx == sel[0]) {
                if (idx == sel[1]) {
                    this.dis_input.innerHTML = first
                        +`<span class="caret">${caret}</span>`
                        + second;
                } else {
                    selected = htmlText(
                        value.substring(sel[0] + 1, sel[1] + 1)
                    );
                    this.dis_input.innerHTML = first
                        + `<span class="caret">${caret}</span>`
                        + `<span class="selected">${selected}</span>`
                        + second;
                }
            } else {
                selected = htmlText(
                    value.substring(sel[0], sel[1])
                );
                this.dis_input.innerHTML = first
                    + `<span class="selected">${selected}</span>`
                    + `<span class="caret">${caret}</span>`
                    + second;
            }
            let car = this.dis_input.querySelector('.caret');
        }

        const onChange = e => {
            let sel = [this.input.selectionStart, this.input.selectionEnd];
            if (sel[0] === this.sel[0] && sel[1] === this.sel[1]) {
                return;
            }

            onValueChange(e);
        }

        const keyPress = e => {
            if (e.key === 'Enter') {
                this.dis_input.innerHTML = htmlText(this.input.value);
                this.env.println();
                this.execute(this.input.value);
                this.prompt1();
                this.input.value = "";
                onValueChange();
            } else if (e.key === 'ArrowUp') {
                if (this.his_pos !== 0) {
                    --this.his_pos;
                    this.input.value = this.history[this.his_pos];
                    setTimeout(() => {
                        this.input.selectionStart = 10000;
                        this.input.selectionEnd = 10000;
                    }, 0);
                    onValueChange();
                }
            } else if (e.key === 'ArrowDown') {
                if (this.his_pos + 1 < this.history.length) {
                    ++this.his_pos;
                    this.input.value = this.history[this.his_pos];
                    setTimeout(() => {
                        this.input.selectionStart = 10000;
                        this.input.selectionEnd = 10000;
                    }, 0);
                    onValueChange();
                }
            }
            let car = this.display.querySelector(".caret");
            if (car) {
                this.input.style.top =
                    car.offsetTop + car.offsetHeight + "px";
                this.input.style.left = car.offsetLeft + "px";
                // TODO: scroll only when necesarry
                car.scrollIntoView(false);
                window.scrollBy(0, 5);
            }
        };

        const onClick = _e => {
            if (document.getSelection().toString().length === 0) {
                this.input.focus();
                let car = this.display.querySelector(".caret");
                if (car) {
                    this.input.style.top =
                        car.offsetTop + car.offsetHeight + "px";
                    this.input.style.left = car.offsetLeft + "px";
                }
            }
        };

        const onBlur = _e => {
            this.dis_input.innerHTML = this.input.value;
        }

        const onFocus = e => {
            onValueChange(e);
            e.preventDefault();
        }

        this.input.addEventListener('keydown', keyPress);
        this.input.addEventListener('input', onValueChange);
        this.input.addEventListener('focus', onFocus);
        this.input.addEventListener('blur', onBlur);
        document.addEventListener('selectionchange', onChange);
        this.display.addEventListener('click', onClick);

        this.prompt1();
    }

    /**
     * Executes the given command in the terminal.
     * @param {String | [String]} command command to execute. When array, it is
     *                            interpreted as [command, ...args].
     */
    updateHistory(command) {
        if (this.history[this.history.length - 1] === "") {
            this.history[this.history.length - 1] = command;
        } else {
            this.history.push(command);
        }
        this.his_pos = this.history.length;
        this.history.push("");
        let f = new Path("~").locate();
        if (!f) {
            return;
        }
        if (!f.value[".jsh_history"]) {
            f.createFile(".jsh_history").value = this.history.join("\n");
        } else if (f.value[".jsh_history"].type === 'file') {
            f.value[".jsh_history"].value = this.history.join("\n");
        }
    }

    /**
     *
     * @param {String} name
     * @returns {Path}
     */
    findInPath(name) {
        let path = jinux.env.PATH;
        if (!path) {
            return null;
        }
        path = path.split(":");

        /** @type {[FSItem]} */
        let exe = path.map(p => new Path(p).join(new Path(name)).locate());
        exe = exe.filter(p => {
            return p && ((p.type === 'file' && p.exe) || p.type === 'exe');
        });

        if (exe.length === 0) {
            return null;
        }

        return exe[0];
    }

    /**
     * Executes the given command in the terminal.
     * @param {String | [String]} command command to execute. When array, it is
     *                            interpreted as [command, ...args].
     * @returns {Number} return value of the command
     */
    execute(command) {
        this.updateHistory(command);

        let cmd = new Command(this.env.inherit([]), command);

        if (!cmd.cmd) {
            return 0;
        }

        switch (cmd.cmd) {
            case "cd":
                if (!cmd.setStdout(true)) {
                    this.env.error("Failed to redirect");
                }
                return this.cd(cmd.env);
            case "echo":
                if (!cmd.setStdout(true)) {
                    this.env.error("Failed to redirect");
                }
                return this.echo(cmd.env);
            case "help":
                if (!cmd.setStdout(true)) {
                    this.env.error("Failed to redirect");
                }
                return this.help(cmd.env);
            case "history":
                if (!cmd.setStdout(true)) {
                    this.env.error("Failed to redirect");
                }
                return this.show_history(cmd.env);
        }

        /** @type {FSItem} */
        let prog = new Path(cmd.cmd).locate();
        if (!prog
            || (prog.type !== 'exe' && (prog.type !== 'file' || !prog.exe))
            || cmd.cmd.indexOf("/") === -1
        ) {
            prog = this.findInPath(cmd.cmd);
        }

        if (!prog) {
            this.env.error(`${cmd.cmd}: command not found`);
            return 1;
        }

        cmd.env.args = [prog.path.path, ...cmd.env.args];

        if (!cmd.setStdout(true)) {
            this.env.error("Failed to redirect");
        }

        if (prog.type === 'exe') {
            return prog.value(cmd.env);
        }

        try {
            let exit_code = Function("__env", `"use strict";
                try {
                    ${prog.value}
                    return main(__env);
                } catch {
                    return 2;
                }
            `)(cmd.env);
            if (exit_code === 2) {
                this.env.error("Program crashed");
            }
            return exit_code;
        } catch (e) {
            this.env.error("Failed to run the program: ", e);
            return 2;
        }
    }

    /**
     * Parses prompt string.
     * @param {String} str prompt to parse
     * @returns {String} parsed prompt string.
     */
    parsePrompt(str) {
        return str
            .replace("\\h", "jinux")
            .replace("\\n", "\n")
            .replace("\\s", "jsh")
            .replace("\\u", this.env.getVar("USER") ?? "")
            .replace("\\v", version)
            .replace("\\w", jinux.cwd.skipStart(new Path("~").absolute()).path)
            .replace("\\W", jinux.cwd.path);
    }

    /**
     * Prompts with the `$PS1` prompt
     */
    prompt1() {
        let prompt = this.env.getVar("PS1") ?? `\\u@\\h \\w$ `;
        this.env.print(this.parsePrompt(prompt));
        this.env.print("<span></span>");
        this.dis_input = this.display.lastElementChild;
    }

    /**
     * Clears the terminal display.
     */
    clear() {
        this.display.innerHTML = "";
    }

    /**
     * Changes the working directory.
     * @param {Env} env command arguments
     * @returns {Number} exit code.
     */
    cd(env) {
        if (env.args.length > 2) {
            env.error(`Unexpected agument '${env.args[1]}'`);
            return 1;
        }
        if (env.args.length === 0) {
            let dir = new Path("~").absolute();
            if (dir.type() !== 'dir') {
                env.error(`'${env.args[1]}' is not a directory`);
                return 1;
            }
            jinux.cwd = dir;
            return 0;
        }
        let dir = new Path(env.args[0]).absolute();
        if (dir.type() !== 'dir') {
            env.error(`'${env.args[1]}' is not a directory`);
            return 1;
        }
        jinux.cwd = dir;
        return 0;
    }

    /**
     * Prints to the screen
     * @param {Env} env command line arguments
     */
    echo(env) {
        env.println(env.args.join(" "));
        return 0;
    }

    /**
     * Prints the command history
     * @param {Env} env
     */
    show_history(env) {
        env.print(this.history.join("\n"));
        return 0;
    }

    /**
     * Prints help about the terminal.
     * @param {Env} env unused
     */
    help(env) {
        env.println(
`Welcome to ${col('g i', "jsh")} help by ${signature}
Version: ${version}

${col('g', "Commands:")}
  ${col('y', "help")}
    shows this help

  ${col('y', "cd")} ${col('gr', "[directory]")}
    changes the working directory to the given directory

  ${col('y', "echo")} ${col('gr', "[arguments...]")}
    prints the arguments with spaces between them

  ${col('y', "&lt;executable in one of the paths in $PATH&gt")} \
${col('gr', "[arguments...]")}
    executes the program with the arguments

  ${col('y', "history")}
    shows the command history
`
        );
        return 0;
    }
}
