for (let e of document.getElementsByClassName("rng-letter")) {
    rng_text_hover(e);
}

/**
 *
 * @param {Element} elem
 */
function rng_text_hover(elem) {
    let [cw, ch] = getCharSize(elem, "M");

    let lines = Math.floor((elem.offsetHeight + 1) / ch);
    lines -= (lines - 1) & 1; // There must be odd number of lines
    let cols = Math.floor((elem.offsetWidth - 1) / cw);

    let tex_len = lines * cols;
    let text = elem.textContent.trim();

    elem.innerHTML = '<div></div><div class="rng-letter-inner"></div>';
    elem.firstElementChild.innerHTML = rng_text(text.length, text);
    elem.addEventListener("mousemove", () => {
        elem.firstElementChild.innerHTML =
            rng_text(tex_len, text.toUpperCase());
    });
    elem.addEventListener("mouseleave", () => {
        elem.firstElementChild.innerHTML = rng_text(text.length, text);
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
    return escape(res.slice(0, i))
        + '<span class="rng-fg">'
        + s
        + '</span>'
        + escape(res.slice(i, res.length));
}

/**
 *
 * @param {Element} elem
 * @param {string} chr
 * @returns {float[]}
 */
function getCharSize(elem, chr) {
    const REPW = 8;
    const REPH = 8;
    let short = "";
    let long = chr;
    for (let i = 0; i < REPW; ++i) {
        short += chr;
    }
    for (let i = 1; i < REPH; ++i) {
        long += '<br>' + chr;
    }

    let sty = document.defaultView.getComputedStyle(elem);

    let text = document.createElement("div");
    text.style.fontFamily = sty.fontFamily;
    text.style.fontSize = sty.fontSize;
    text.style.height = 'auto';
    text.style.width = 'auto';
    text.style.position = 'absolute';
    text.style.visibility = 'hidden';
    text.style.top = 0;

    document.body.appendChild(text);

    text.innerHTML = short;

    let width = text.offsetWidth;

    text.innerHTML = long;

    let height = text.offsetHeight;

    let cw = width / REPW;
    let ch = height / REPH;

    return [cw, ch];
}

function escape(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

