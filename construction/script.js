let term = new Terminal(
    document.querySelector(".term"),
    document.querySelector(".true-input")
);

/**
 * Clears the terminal screen.
 * @param {Env} env environment
 * @returns {Number} exit code
 */
function clear(env) {
    if (env.args.length === 1) {
        term.clear();
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
        switch (f.type) {
            case 'dir':
                return col('b bold', name);
            case 'exe':
                return col('g bold', name);
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

    let out = Object.entries(d.value).map(([_, f]) => getItem(f)).join(" ");
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
    if (env.args.length != 2) {
        env.error("Invalid number of arguments");
        return 1;
    }

    let path = new Path(env.args[1]);
    let name = path.name();
    let par = path.parent().locate();

    if (!par) {
        env.error(`Parent directory of '${path.path}' doesn't exist`);
        return 1;
    }

    if (par.type !== 'dir') {
        env.error(`'${par.path}' is not a directory`);
        return 1;
    }

    if (par.value[name]) {
        env.error(`'${path.path}' already exists.`);
        return 1;
    }

    par.value[name] = {
        path: path.absolute(),
        type: 'dir',
        value: {},
    };

    return 0;
}

/**
 * Prints the contents of a file
 * @param {Env} env environment
 * @returns exit code
 */
function cat(env) {
    if (env.args.length != 2) {
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

let title = '\
       __      __         __       ___          __              __    \n\
      / /___ _/ /____  __/ /_     /   |  ____  / /_____  ____  /_/___ \n\
 __  / / __ `/ //_/ / / / __ \\   / /| | / __ \\/ __/ __ \\/ __ \\/ / __ \\\n\
/ /_/ / /_/ / ,< / /_/ / /_/ /  / ___ |/ / / / /_/ /_/ / / / / / / / /\n\
\\____/\\__,_/_/|_|\\__,_/_.___/  /_/  |_/_/ /_/\\__/\\____/_/ /_/_/_/ /_/ \n\
                                                                      \n\
                     _|ˇ/_ __  _       __                             \n\
                    / ___// /_(_)___ _/ /__  _____                    \n\
                    \\__ \\/ __/ / __ `/ / _ \\/ ___/                    \n\
                   ___/ / /_/ / /_/ / /  __/ /                        \n\
                  /____/\\__/_/\\__, /_/\\___/_/                         \n\
                             /____/                                   \n\
\n\
                             Developer                              \n\
\n';

let about = '\n\
I study at the University of Technology in Brno, specifically at the Faculty\n\
of Information Technology. At the time of writing I am 20 and I have been\n\
self-learning programming for ~6 years. I mostly enjoy programming in\n\
languages like Rust, C, C#, C++,... One of my most useless skills is that I\n\
can do something in the J programming language. I enjoy functional \n\
programming (and Haskell) but I use it only when it makes sense.\n\
\n';

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
                        type: 'exe',
                        value: clear,
                    },
                    ls: {
                        type: 'exe',
                        value: ls,
                    },
                    mkdir: {
                        type: 'exe',
                        value: mkdir,
                    },
                    cat: {
                        type: 'exe',
                        value: cat,
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
                    }
                }
            }
        }
    }
};

jinux.env.PATH = "/usr/bin/";
jinux.env.PS1 = `${col('y', "\\u@\\h")} ${col('m', "\\w")}${col('gr', "$")} `;
jinux.env.HOME = "/home/host";

jinux.init();
term.init();

let coms = document.querySelector(".page-src").innerHTML
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length !== 0)
    .forEach(c => {
        term.env.println(c);
        term.execute(c);
        term.prompt1();
    });
