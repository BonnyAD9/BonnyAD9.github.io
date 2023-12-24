let term = Terminal(
    document.querySelector(".term"),
    document.querySelector(".true-input")
);

function clear(args) {
    if (args.length === 1) {
        term.clear();
        return 0;
    }
    let version = "1.0.0"
    term.println(
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

function ls(args) {
    if (args.length > 2) {
        term.println(col('r', "error: ") + "ls accepts at most one argument");
        return 1;
    }
    let p = args.length <= 1 ? jinux.cwd : Path(args[1]);
    let d = p.locate();
    if (!d) {
        term.println(
            col('r', "error: ") + `'${p.path}' no such file or directory.`
        );
        return 1;
    }

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
        term.println(getItem(d));
        return 0;
    }

    let out = Object.entries(d.value).map(([_, f]) => getItem(f)).join(" ");
    if (out.length > 0) {
        term.println(out);
    }
    return 0;
}

function mkdir(args) {
    if (args.length != 2) {
        term.println(col('r', "error: ") + "Invalid number of arguments");
        return 1;
    }

    let path = Path(args[1]);
    let name = path.name();
    let par = path.parent().locate();

    if (!par) {
        term.println(
            col('r', "error: ")
                + `Parent directory of '${path.path}' doesn't exist`
        );
        return 1;
    }

    if (par.type !== 'dir') {
        term.println(col('r', "error: ") + `'${par.path}' is not a directory`);
        return 1;
    }

    if (par.value[name]) {
        term.println(col('r', "error:") + `'${path.path}' already exists.`);
        return 1;
    }

    par.value[name] = {
        path: path.resolve(),
        type: 'dir',
        value: {},
    };

    return 0;
}

// the default directory
jinux.root.value = {
    usr: {
        type: 'dir',
        value: {
            bin: {
                type: 'dir',
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
    home: {
        type: 'dir',
        value: {
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
