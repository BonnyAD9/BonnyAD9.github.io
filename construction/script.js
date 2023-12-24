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
                value: {}
            }
        }
    }
};

jinux.env.PATH = "/usr/bin/";
jinux.env.PS1 = `${col('y', "\\u@\\h")} ${col('m', "\\w")}${col('gr', "$")} `;
jinux.env.HOME = "/home/host";

jinux.init();
term.init();
