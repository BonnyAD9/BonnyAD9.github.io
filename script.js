// scroll so that the CONSTRUCTION is not visible
document.getElementById('title').scrollIntoView();

// show the cookies message
document.querySelector(".cookies").style.bottom = "0";

function hideCookies() {
    document.querySelector(".cookies").style.bottom = "-5em";
}

function goUp() {
    document.getElementById('title').scrollIntoView({
        behavior: "smooth"
    });
}

window.onscroll = () => {
    if (window.scrollY == 0)
        showAchievment("conSight");
    if (window.scrollY > document.getElementById("title").offsetTop)
        document.querySelector(".goUp").style.bottom = "3em";
    else
        document.querySelector(".goUp").style.bottom = "-3em";
}

let unlocked = { "lol": false };

function showAchievment(type) {
    if (unlocked[type])
        return;
    let name = "Name";
    let msg = "Msg";
    unlocked[type] = true;
    switch (type)
    {
        case "conSight":
            name = "Construction sight";
            msg = "See the CONSTRUCTION";
            break;
    }

    document.querySelector(".achievmentName").innerHTML = name;
    document.querySelector(".achievmentMsg").innerHTML = msg;

    document.querySelector(".achievment").style.bottom = "0";

    setTimeout(() => document.querySelector(".achievment").style.bottom = "-5em", 3000);
}

// set smooth scrolling on links
// this cannot be done trough the html style scroll-behaviour
// because the initial scroll must be instant
let anchorSelector = 'a[href^="#"]';
let anchorList = document.querySelectorAll(anchorSelector);
anchorList.forEach(link => {
    link.onclick = (e) => {
        e.preventDefault();
        let destination = document.querySelector(this.hash);
        destination.scrollIntoView({
            behavior: 'smooth'
        });
    }
});