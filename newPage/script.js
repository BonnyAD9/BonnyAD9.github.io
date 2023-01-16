let selected = null;
let click = false;
let system = null;
let globalWinId = 1;

fetch('storage.json')
    .then(res => res.json())
    .then(data => system = data)
    .then(_ => onLoad());

function onLoad() {
    for (f of system.files) {
        addFileToDesktop(f);
    }
}

function addFileToDesktop(file) {
    let app = appForFile(file.name);
    let icons = document.querySelector('.icons');

    let icon = document.createElement('div');
    icon.classList.add('icon');
    icon['data-name'] = file.name;
    icon.onclick = function(e) {
        if (selected) {
            selected.classList.remove('selected-icon');
        }
        selected = e.target.closest('.icon');
        selected.classList.add('selected-icon');
        click = true;

        if (e.detail == 2) {
            openFile(file);
        }
    }

    let img = document.createElement('img');
    img.classList.add('icon-image');
    img.alt = file.name;
    img.src = app.icon;

    let nam = document.createElement('h1');
    nam.classList.add('icon-text');
    nam.innerHTML = file.name;

    icon.appendChild(img);
    icon.appendChild(nam);

    icons.appendChild(icon);
}

function appByAppId(appid) {
    return system.apps.find(a => a.id === appid);
}

function appForFile(filename) {
    return appByAppId(system.assocs[getExtension(filename)]);
}

function getExtension(str) {
    let li = str.lastIndexOf('.');
    if (li === -1)
        return "";
    return str.substring(li + 1);
}

function icons_click() {
    if (click) {
        click = false;
        return;
    }
    if (selected) {
        selected.classList.remove('selected-icon');
    }
    selected = null;
}

function openFile(file) {
    let app = appForFile(file.name);
    let id = createWindow(app);
    let frame = document.getElementById(id);
    let win = frame.contentWindow;

    frame.addEventListener("load", function() {
        win.postMessage({
            "request": "init",
            "winId": id
        }, '*');

        win.postMessage({
            "request": "open-file",
            "fileName": file.name,
            "fileData": file.content
        }, '*');

        //win.document.addEventListener('mousedown', e => console.log('clicked window'));
    })
}

function closeWindow(winId) {
    getWindow(winId).postMessage({
        "request": "exit"
    }, '*');
}

function getWindow(winId) {
    return document.getElementById(winId).contentWindow;
}

function createWindow(app) {
    let id = getNewWinId();

    let winIcon = document.createElement('img');
    winIcon.classList.add('window-icon');
    winIcon.src = app.icon;
    winIcon.alt = app.name;

    let winTitle = document.createElement('h2');
    winTitle.classList.add('window-title');
    winTitle.innerHTML = app.name;

    let winBar = document.createElement('div');
    winBar.classList.add('window-bar');
    winBar.appendChild(winIcon);
    winBar.appendChild(winTitle);
    winBar.onmousedown = startWindowDrag;

    let winXText = document.createElement('p');
    winXText.classList.add('win-btn-text');
    winXText.innerHTML = '×';

    let winX = document.createElement('button');
    winX.classList.add('window-button', 'win-x');
    winX.onclick = () => closeWindow(id);
    winX.appendChild(winXText);

    let winMenu = document.createElement('div');
    winMenu.classList.add('window-menu');
    winMenu.appendChild(winX);

    let winFrame = document.createElement('iframe');
    winFrame.classList.add('window-frame');
    winFrame.id = id;
    winFrame.src = app.source;

    let win = document.createElement('div');
    win.classList.add('window');
    win.appendChild(winBar);
    win.appendChild(winMenu);
    win.appendChild(winFrame);

    document.getElementById('windows').appendChild(win);

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    function startWindowDrag(e) {
        e = e || window.event;
        e.preventDefault();

        pos3 = e.clientX;
        pos4 = e.clientY;

        winFrame.contentWindow.document.addEventListener('mouseup', endWindowDrag);
        winFrame.contentWindow.document.addEventListener('mousemove', dragWindow2);
        document.onmouseup = endWindowDrag;
        document.onmousemove = dragWindow;
    }

    function dragWindow(e) {
        e = e || window.event;
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        //console.log(`${win.style.offsetTop - pos2}px`);

        win.style.top = `${win.offsetTop - pos2}px`;
        win.style.left = `${win.offsetLeft - pos1}px`;
    }

    function dragWindow2(e) {
        e = e || window.event;
        e.preventDefault();
        let cx = e.clientX + winFrame.offsetLeft + win.offsetLeft;
        let cy = e.clientY + winFrame.offsetTop + win.offsetTop;

        pos1 = pos3 - cx;
        pos2 = pos4 - cy;
        pos3 = cx;
        pos4 = cy;

        //console.log(`${win.style.offsetTop - pos2}px`);

        win.style.top = `${win.offsetTop - pos2}px`;
        win.style.left = `${win.offsetLeft - pos1}px`;
    }

    function endWindowDrag() {
        winFrame.contentWindow.document.removeEventListener('mouseup', endWindowDrag);
        winFrame.contentWindow.document.removeEventListener('mousemove', dragWindow2);
        document.onmouseup = null;
        document.onmousemove = null;
    }

    return id;
}

function getNewWinId() {
    return `win${globalWinId++}`;
}

window.addEventListener('message', event => {
    let req = event.data;

    switch (req.request) {
        case 'close':
            document.getElementById(req.sender).closest('.window').remove();
            break;
    }
});