let term = new Terminal(
    document.querySelector(".term"),
    document.querySelector(".true-input")
);

/**
 * Clears the screen
 * @param {Env} env environment
 * @returns [Number] exit code
 */
function clear(env) {
    if (env.args.length === 1) {
        env.print(TERM.clear);
        return 0;
    }
    let version = "1.0.0"
    env.println(
        `Welcome to clear help for clear
Version: ${version}

Usage:
  clear
    clears the screen

  clear <anything>
    shows this help
`
    );
}

/**
 * Lists the directory items
 * @param {Env} env environment
 * @returns [Number] exit code
 */
function ls(env) {
    if (env.args.length > 2) {
        env.error("ls accepts at most one argument");
        return 1;
    }
    let p = env.args.length <= 1 ? jinux.cwd : new Path(env.args[1]);
    let d = p.locate();
    if (!d) {
        env.error(`'${p.path}' no such file or directory.`);
        return 1;
    }

    /**
     * Gets name with the color for the given item.
     * @param {FSItem} f
     * @returns {String} colored name of the item
     */
    function getItem(f) {
        let name = f.path.name();
        if (f.exe) {
            return col('g bold', name);
        }
        switch (f.type) {
            case 'dir':
                return col('b bold', name);
            case 'exe':
                return col('g', name);
            case 'link':
                return col('c bold', name);
            default:
                return name;
        }
    }

    if (d.type !== 'dir') {
        env.println(getItem(d));
        return 0;
    }

    let out = Object.entries(d.value).map(([_, f]) => getItem(f)).join("  ");
    if (out.length > 0) {
        env.println(out);
    }
    return 0;
}

/**
 * Creates new directory
 * @param {Env} env environment
 * @returns exit code
 */
function mkdir(env) {
    if (env.args.length === 1) {
        env.error("Invalid number of arguments");
        return 1;
    }

    let ret = 0;

    let [_, ...args] = env.args;
    args.forEach(a => {
        let path = new Path(a);
        let par = path.parent().createDir(path.name());
        if (!par) {
            env.error("Failed to create the directory '" + path.path + "'");
            ret = 1;
        }
    });

    return ret;
}

/**
 * Prints the contents of a file
 * @param {Env} env environment
 * @returns exit code
 */
function cat(env) {
    if (env.args.length === 1) {
        let data = env.readRaw();
        while (data) {
            env.print(data);
            data = env.readRaw();
        }
        return 0;
    }
    if (env.args.length !== 2) {
        env.error("Invalid number of arguments");
        return 1;
    }

    let file = new Path(env.args[1]).locate();
    if (!file) {
        env.error(`file '${env.args[1]}' doesn't exist`);
        return 1;
    }

    if (file.type != 'file') {
        env.error(`'${env.args[1]}' is not a file`);
        return 1;
    }

    env.print(file.value);
    return 0;
}

/**
 * Add/remove execute privilages
 * @param {Env} env environment
 * @returns exit code
 */
function chmod(env) {
    if (env.args.length !== 3) {
        env.error("Invalid number of arguments");
        return 1;
    }

    /** @type {Boolean} */
    let val;
    switch (env.args[1]) {
        case "+x":
            val = true;
            break;
        case "-x":
            val = false;
        default:
            env.error("Invalid argument '" + env.args[1] + "'");
            return 1;
    }

    let file = new Path(env.args[2]).locate();
    if (!file) {
        env.error("No such file: " + env.args[2]);
        return 1;
    }

    if (file.type !== 'file') {
        env.error("'" + env.args[2] + "' is not a file.");
        return 1;
    }

    file.exe = val;
    return 0;
}

/**
 * centers the input
 * @param {Env} env
 * @returns {Number}
 */
function center(env) {
    let text = env.readAll().split("\n");
    let width = env.getWidth();
    let force_width = null;
    if (env.args.length === 2) {
        force_width = parseInt(env.args[1]);
    }

    let first = true;
    text.forEach(t => {
        if (!first) {
            env.println();
        }
        first = false;

        if (t.length === 0) {
            return;
        }

        let l = force_width ?? t.length;

        let dif = width - l;
        let hdif = Math.trunc(dif / 2);
        if (dif === 0) {
            env.print(t);
        } else if (dif > 0) {
            env.print(" ".repeat(hdif), t);
        } else {
            if (force_width) {
                env.print(t);
            } else {
                env.print(t.substring(-hdif, width - hdif));
            }
        }
    });
    return 0;
}

/**
 * wraps text on words
 * @param {Env} env
 * @returns {Integer}
 */
function wrap(env) {
    let wmax = Number.MAX_SAFE_INTEGER;
    if (env.args.length === 2) {
        wmax = parseInt(env.args[1]);
    } else if (env.args.length > 2) {
        env.error("Invalid number of arguments");
        return 1;
    }
    wmax = Math.min(wmax, env.getWidth());

    let first = true;
    env.readAll().split("\n").forEach(b => {
        if (b.length === 0) {
            if (!first) {
                env.println();
            }
            first = false;
        }

        let line = "";
        b.split(" ").forEach(w => {
            if (line.length + 1 + w.length > wmax) {
                if (!first) {
                    env.println();
                }
                first = false;
                env.print(line);
                line = "";
            }
            if (line.length > 0) {
                line += " ";
            }
            line += w;
        });
        if (line.length !== 0) {
            if (!first) {
                env.println();
            }
            first = false;
            env.print(line);
        }
    });
    return 0;
}

let title = '\
       __      __         __       ___          __              __    \n\
      / /___ _/ /____  __/ /_     /   |  ____  / /_____  ____  /_/___ \n\
 __  / / __ `/ //_/ / / / __ \\   / /| | / __ \\/ __/ __ \\/ __ \\/ / __ \\\n\
/ /_/ / /_/ / ,< / /_/ / /_/ /  / ___ |/ / / / /_/ /_/ / / / / / / / /\n\
\\____/\\__,_/_/|_|\\__,_/_.___/  /_/  |_/_/ /_/\\__/\\____/_/ /_/_/_/ /_/ \n\
                                                                      \n\
   _|ˇ/_ __  _       __         \n\
  / ___// /_(_)___ _/ /__  _____\n\
  \\__ \\/ __/ / __ `/ / _ \\/ ___/\n\
 ___/ / /_/ / /_/ / /  __/ /    \n\
/____/\\__/_/\\__, /_/\\___/_/     \n\
           /____/               \n\
\n\
Developer\n\
\n';

let about = '\n\
I study at the University of Technology in Brno, specifically at the Faculty \
of Information Technology. At the time of writing I am 20 and I have been \
self-learning programming for ~7 years. I mostly enjoy programming in \
languages like Rust, C, C#, C++,... One of my most useless skills is that I \
can do something in the J programming language. I enjoy functional \
programming (and Haskell) but I use it only when it makes sense.\
\n\n';

let jshrc = `#!/usr/bin/jsh
export PATH=/usr/bin
export 'PS1=${col('y', "\\u@\\h")} ${col('m', "\\w")}${col('gr', "$")} '
export USER=host
export HOME=/home/host
`;

let projects_title = '\
    ____               _           __      \n\
   / __ \\_________    (_)__  _____/ /______\n\
  / /_/ / ___/ __ \\  / / _ \\/ ___/ __/ ___/\n\
 / ____/ /  / /_/ / / /  __/ /__/ /_,\\_ \\  \n\
/_/   /_/   \\____/_/ /\\___/\\___/\\__/____/  \n\
                /___/                      \n\
\n'

let projects_list = `
${col('bold', 'PLACE_MACRO')}

    Rust macros you wish you had while you were writing your non-proc macro.

    - GitGub repository: \
<a href="https://github.com/BonnyAD9/place_macro">GitHub</a>
    - Documentation: \
<a href="https://docs.rs/place_macro/latest/place_macro/">docs.rs</a>
    - Package: <a href="https://crates.io/crates/place_macro">crates.io</a>
`;

let links_title = '\
    __    _       __       \n\
   / /   (_)___  / /_______\n\
  / /   / / __ \\/ //_/ ___/\n\
 / /___/ / / / / ,< ,\\_ \\  \n\
/_____/_/_/ /_/_/|_/____/  \n\
\n';

let links = `
- GitHub profile: <a href="https://github.com/BonnyAD9">BonnyAD9</a>
`;

// the default directory
jinux.root.value = {
    /** @type {FSItem} */
    usr: {
        type: 'dir',
        value: {
            /** @type {FSItem} */
            bin: {
                type: 'dir',
                /** @type {FSItem} */
                value: {
                    clear: {
                        type: 'file',
                        exe: true,
                        value: clear.toString().replace("clear", "main"),
                    },
                    ls: {
                        type: 'file',
                        exe: true,
                        value: ls.toString().replace("ls", "main"),
                    },
                    mkdir: {
                        type: 'file',
                        exe: true,
                        value: mkdir.toString().replace("mkdir", "main"),
                    },
                    cat: {
                        type: 'file',
                        exe: true,
                        value: cat.toString().replace("cat", "main"),
                    },
                    chmod: {
                        type: 'file',
                        exe: true,
                        value: chmod.toString().replace("chmod", "main"),
                    },
                    center: {
                        type: 'file',
                        exe: true,
                        value: center.toString().replace("center", "main"),
                    },
                    wrap: {
                        type: 'file',
                        exe: true,
                        value: wrap.toString().replace("wrap", "main"),
                    }
                }
            }
        }
    },
    /** @type {FSItem} */
    home: {
        type: 'dir',
        value: {
            /** @type {FSItem} */
            host: {
                type: 'dir',
                value: {
                    title: {
                        type: 'file',
                        value: title,
                    },
                    about: {
                        type: 'file',
                        value: about,
                    },
                    [".jshrc"]: {
                        type: 'file',
                        value: jshrc,
                    },
                    /** @type {FSItem} */
                    projects: {
                        type: 'dir',
                        value: {
                            title: {
                                type: 'file',
                                value: projects_title,
                            },
                            list: {
                                type: 'file',
                                value: projects_list,
                            },
                        }
                    },
                    links_title: {
                        type: 'file',
                        value: links_title,
                    },
                    links: {
                        type: 'file',
                        value: links,
                    }
                }
            }
        }
    }
};

jinux.init();
term.init();

let coms = document.querySelector(".page-src").innerHTML
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length !== 0)
    .forEach(c => term.typeCommand(c));
