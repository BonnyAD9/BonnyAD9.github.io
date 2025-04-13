for (let e of document.getElementsByClassName("rng-letter")) {
    let tex_len = 703;
    let tex = "HELLO WORLD"

    e.firstElementChild.innerHTML = rng_text(tex.length, tex.toLowerCase());
    e.addEventListener("mousemove", () => {
        e.firstElementChild.innerHTML = rng_text(tex_len, tex);
    });
    e.addEventListener("mouseleave", () => {
        e.firstElementChild.innerHTML = rng_text(tex.length, tex.toLowerCase());
    });
}

/**
 *
 * @param {int} len
 * @param {string} s
 * @returns {string}
 */
function rng_text(len, s) {
    let chrs = 126 - 32;
    len -= s.length;
    let res = "";
    for (let i = 0; i < len; ++i) {
        res += String.fromCharCode(Math.floor(Math.random() * chrs) + 33);
    }
    let i = res.length / 2;
    return escape(res.slice(0, i)) + '<span class="rng-fg">' + s + '</span>' + escape(res.slice(i, res.length));
}

function escape(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

