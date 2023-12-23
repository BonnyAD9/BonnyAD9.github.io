jinux.env.PS1 = `\
${ansi.col('y', "\\u@\\h")} \
${ansi.col('m', "\\w")}${ansi.col('gr', "$")} `;

let term = Terminal(
    document.querySelector(".term"),
    document.querySelector(".true-input")
);

function clear(args) {
    if (args.length === 0) {
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
                }
            }
        }
    }
};

jinux.env.PATH = ["/usr/bin/"];
