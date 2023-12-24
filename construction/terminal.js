class FSItem {
    /** @type {Path} */
    path;
    /** @type {String} */
    type;
    /** @type {String | [String: FSItem] | function(Env): [Number]} */
    value;
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
        const print = (...s) => s.forEach(s => this.display.innerHTML += s);
        this.env = new Env(jinux.cwd, [], print, print);

        const onValueChange = _e => {
            let sel = [this.input.selectionStart, this.input.selectionEnd];

            let idx = sel[0];
            if (sel[0] === this.sel[0] && sel[1] !== this.sel[1]) {
                idx = sel[1];
            }

            this.sel = sel;

            let value = this.input.value;
            let first = value.substring(0, sel[0]);
            let caret = value
                .substring(idx, Math.min(idx + 1, value.length));
            if (caret.length === 0) {
                caret = " ";
            }
            let selected;
            let second = value.substring(sel[1] + 1, value.length);
            if (idx == sel[0]) {
                if (idx == sel[1]) {
                    this.dis_input.innerHTML = first
                        +`<span class="caret">${caret}</span>`
                        + second;
                } else {
                    selected = value.substring(sel[0] + 1, sel[1] + 1);
                    this.dis_input.innerHTML = first
                        + `<span class="caret">${caret}</span>`
                        + `<span class="selected">${selected}</span>`
                        + second;
                }
            } else {
                selected = value.substring(sel[0], sel[1]);
                this.dis_input.innerHTML = first
                    + `<span class="selected">${selected}</span>`
                    + `<span class="caret">${caret}</span>`
                    + second;
            }
            let car = this.dis_input.querySelector('.caret');
            if (car) {
                car.scrollIntoView();
            } else {
                window.scrollTo(0, document.body.scrollHeight);
            }
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
                this.dis_input.innerHTML = this.input.value;
                this.env.println();
                this.execute(this.input.value);
                this.prompt1();
                this.input.value = "";
                onValueChange();
            }
            return false;
        };

        const onClick = _e => {
            if (document.getSelection().toString().length === 0) {
                this.input.focus({preventScroll: true});
            }
        };

        const onBlur = _e => {
            this.dis_input.innerHTML = this.input.value;
        }

        this.input.addEventListener('keypress', keyPress);
        this.input.addEventListener('input', onValueChange);
        this.input.addEventListener('focus', onValueChange);
        this.input.addEventListener('blur', onBlur);
        document.addEventListener('selectionchange', onChange);
        this.display.addEventListener('click', onClick);

        this.prompt1();
    }

    /**
     * Executes the given command in the terminal.
     * @param {String | [String]} command command to execute. When array, it is
     *                            interpreted as [command, ...args].
     * @returns {Number} return value of the command
     */
    execute(command) {
        if (command.constructor !== Array) {
            command = command.split(" ").filter(c => c.length !== 0);
        }
        if (command.length == 0) {
            return 0;
        }
        let [cmd, ...args] = command;

        switch (cmd) {
            case "cd":
                return this.cd(args);
            case "echo":
                return this.echo(args);
            case "help":
                return this.help(args);
        }

        let path = jinux.env.PATH;
        if (!path) {
            this.env.error(`${cmd}: command not found`);
            return 1;
        }
        path = path.split(":");

        let exe = path.map(p => new Path(p).join(new Path(cmd)).locate());
        exe = exe.filter(p => p && p.type === 'exe');

        if (exe.length === 0) {
            this.env.error(`${cmd}: command not found`);
            return 1;
        }
        return exe[0].value(this.env.inherit([exe[0].path.path, ...args]));
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
            .replace("\\u", "host")
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
     * @param {[String]} args command arguments
     * @returns {Number} exit code.
     */
    cd(args) {
        if (args.length > 2) {
            this.env.error(`Unexpected agument '${args[1]}'`);
            return 1;
        }
        if (args.length === 0) {
            let dir = new Path("~").absolute();
            if (dir.type() !== 'dir') {
                this.env.error(`'${dir.path}' is not a directory`);
                return 1;
            }
            jinux.cwd = dir;
            return 0;
        }
        let dir = new Path(args[0]).absolute();
        if (dir.type() !== 'dir') {
            this.env.error(`'${dir.path}' is not a directory`);
            return 1;
        }
        jinux.cwd = dir;
        return 0;
    }

    /**
     * Prints to the screen
     * @param {[String]} args command line arguments
     */
    echo(args) {
        this.env.println(args.join(" "));
    }

    /**
     * Prints help about the terminal.
     * @param {[String]} _args unused
     */
    help(_args) {
        this.env.println(
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
`
        );
    }
}
