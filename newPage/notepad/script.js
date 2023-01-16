let winId = "";

window.addEventListener('message', event => {
    let req = event.data;
    switch (req.request) {
        case 'init':
            winId = req.winId;
            break;
        case 'open-file':
            document.querySelector('.text').innerHTML = req.fileData;
            break;
        case 'exit':
            parent.postMessage({
                "request": "close",
                "sender": winId
            }, '*');
            break;
    }
});

//document.querySelector('.text').innerHTML = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.";