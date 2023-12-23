// jinux is not unix
var jinux = {
    root: {
        type: 'dir',
        value: {},
    },
    env: {},
    loc_env: {},
    cwd: Path('/'),

    getEnv(name) {
        if (this.env[name]) {
            return this.env[name];
        }
        return this.env[name];
    },
};

var ansi = {
    col(c, s) {
        return `<span class="${c}">${s}</span>`;
    }
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

function Path(path) {
    let p = path.replace(/\/+$/, "");
    if (p.length === 0) {
        p = "/";
    }

    return {
        path: p,

        /// Gets the last component of the path
        name() {
            let comp = this.components();
            return comp[comp.length - 1];
        },

        /// Gets all the components of the path
        components() {
            let comp = path.split("/").filter(c => c.length !== 0);
            if (path.startsWith("/")) {
                return ["/", ...comp];
            }
            return comp;
        },

        /// joins two paths
        join(other) {
            if (other.path.startsWith("/")) {
                return Path(this.path + other.path);
            }
            return Path(this.path + "/" + other.path);
        },

        /// Gets the child of this directory with the given name
        getChild(child) {
            let target = this.join(child);
            if (target.exists()) {
                return target;
            }
            return null;
        },

        /// Checks if this items exists
        exists() {
            return this.locate();
        },

        /// Resolves the path to absolute path
        resolve() {
            let _;
            let comp = this.components();
            if (comp.length == 0) {
                return Path("");
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
                res.push(...Path(jinux.getEnv("HOME") ?? "/").components());
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
                return Path("");
            }

            [_, ...res] = res;
            return Path("/" + res.join("/"))
        },

        /// Locates the item in the file system
        locate() {
            let [_, ...path] = this.resolve().components();
            return locatePath(jinux.root, path);
        },

        /// Gets the type of this item
        type() {
            let loc = this.locate();
            return loc ? loc.type : null;
        },

        skipStart(path) {
            if (this.path.startsWith(path.path)) {
                return Path("~").join(Path(this.path.substring(
                    path.path.length,
                    this.path.length
                )));
            }
            return Path(this.path);
        },
    }
}

function Terminal(show, input) {
    let res = {
        display: show,
        dis_input: null,
        input: input,
        env: {},
        sel: [0, 0],
        downPos: [0, 0],

        init() {
            const onValueChange = _e => {
                let sel = [input.selectionStart, input.selectionEnd];

                let idx = sel[0];
                if (sel[0] === this.sel[0] && sel[1] !== this.sel[1]) {
                    idx = sel[1];
                }

                this.sel = sel;

                let value = input.value;
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
                        window.scrollTo(0, document.body.scrollHeight);
                        return;
                    }
                    selected = value.substring(sel[0] + 1, sel[1] + 1);
                    this.dis_input.innerHTML = first
                        + `<span class="caret">${caret}</span>`
                        + `<span class="selected">${selected}</span>`
                        + second;
                } else {
                    selected = value.substring(sel[0], sel[1]);
                    this.dis_input.innerHTML = first
                        + `<span class="selected">${selected}</span>`
                        + `<span class="caret">${caret}</span>`
                        + second;
                }
                window.scrollTo(0, document.body.scrollHeight);
            }

            const onChange = e => {
                let sel = [input.selectionStart, input.selectionEnd];
                if (sel[0] === this.sel[0] && sel[1] === this.sel[1]) {
                    return;
                }

                onValueChange(e);
            }

            const keyPress = e => {
                if (e.key === 'Enter') {
                    this.dis_input.innerHTML = input.value;
                    this.println();
                    this.execute(input.value);
                    this.prompt1();
                    this.input.value = "";
                    onValueChange();
                }
            };

            const onClick = _e => {
                if (document.getSelection().toString().length === 0) {
                    this.input.focus({preventScroll: true});
                }
            };

            const onBlur = _e => {
                this.dis_input.innerHTML = input.value;
            }

            input.addEventListener('keypress', keyPress);
            input.addEventListener('input', onValueChange);
            input.addEventListener('focus', onValueChange);
            input.addEventListener('blur', onBlur);
            document.addEventListener('selectionchange', onChange);
            show.addEventListener('click', onClick);

            this.prompt1();
        },

        print(...s) {
            s.forEach(s => show.innerHTML += s);
        },

        println(...s) {
            this.print(...s, "\n");
        },

        execute(command) {
            if (command.constructor !== Array) {
                command = command.split(" ").filter(c => c.length !== 0);
            }
            if (command.length == 0) {
                return;
            }
            let [cmd, ...args] = command;

            switch (cmd) {
                case "cd":
                    this.cd(args);
                    return;
                case "echo":
                    this.echo(args);
                    return;
                case "help":
                    this.help(args);
                    return;
            }

            let path = jinux.env.PATH;
            if (!path) {
                this.println(
                    ansi.col('red', "error: "),
                    `${cmd}: command not found`
                );
                return;
            }

            let exe = path.map(p => Path(p).join(Path(cmd)).locate());
            exe = exe.filter(p => p && p.type === 'exe');

            if (exe.length === 0) {
                this.println(
                    ansi.col('red', "error: "),
                    `${cmd}: command not found`
                );
                return 1;
            }
            exe[0].value(args);
        },

        parsePrompt(str) {
            return str
                .replace("\\h", "jinux")
                .replace("\\n", "\n")
                .replace("\\s", "jsh")
                .replace("\\u", "host")
                .replace("\\v", version)
                .replace("\\w", jinux.cwd.skipStart(Path("~").resolve()).path)
                .replace("\\W", jinux.cwd.path);
        },

        prompt1() {
            let prompt = jinux.getEnv("PS1") ?? `\\u@\\h \\w$ `;
            this.print(this.parsePrompt(prompt));
            this.print("<span></span>");
            this.dis_input = this.display.lastElementChild;
        },

        clear() {
            this.display.innerHTML = "";
        },

        cd(args) {
            if (args.length > 2) {
                this.println(
                    ansi.col('red', "error: "),
                    `Unexpected agument '${args[1]}'`
                );
                return 1;
            }
            if (args.length === 0) {
                let dir = Path("~").resolve();
                if (dir.type() !== 'dir') {
                    this.println(
                        ansi.col('red', "error: "),
                        `'${dir.path}' is not a directory`
                    );
                    return 1;
                }
                jinux.cwd = dir;
                return 0;
            }
            let dir = Path(args[0]).resolve();
            if (dir.type() !== 'dir') {
                this.println(
                    ansi.col('red', "error: "),
                    `'${dir.path}' is not a directory`
                );
                return 1;
            }
            jinux.cwd = dir;
            return 0;
        },

        echo(args) {
            this.println(args.join(" "));
        },

        help(_args) {
            this.println(
`Welcome to ${ansi.col('g i', "jsh")} help by ${signature}
Version: ${version}

${ansi.col('g', "Commands:")}
  ${ansi.col('y', "help")}
    shows this help

  ${ansi.col('y', "cd")} ${ansi.col('gr', "[directory]")}
    changes the working directory to the given directory

  ${ansi.col('y', "echo")} ${ansi.col('gr', "[arguments...]")}
    prints the arguments with spaces between them

  ${ansi.col('y', "&lt;executable in one of the paths in $PATH&gt")} \
${ansi.col('gr', "[arguments...]")}
    executes the program with the arguments
`
            );
        }
    };

    res.init();
    return res;
}
