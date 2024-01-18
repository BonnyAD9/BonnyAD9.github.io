// scroll so that the CONSTRUCTION is not visible
document.getElementById('title').scrollIntoView();

// show the cookies message
document.querySelector(".cookies").style.bottom = "0";

function hideCookies() {
    document.querySelector(".cookies").style.bottom = "-5em";
    showAchievement("hidCook");
}

function goUp() {
    document.getElementById('title').scrollIntoView({
        behavior: "smooth"
    });
}

window.onscroll = () => {
    if (window.scrollY == 0)
        showAchievement("conSight");
    if (window.scrollY > document.getElementById("title").offsetTop)
        document.querySelector(".goUp").style.bottom = "3em";
    else
        document.querySelector(".goUp").style.bottom = "-3em";
}

let unlocked = { "lol": false };

function showAchievement(type) {
    if (unlocked[type])
        return;
    let name = "Hacked it!";
    let msg = "Playing with the console, are we?";
    unlocked[type] = true;
    switch (type)
    {
        case "conSight":
            name = "Construction sight";
            msg = "There is actually CONSTRUCTION up there";
            break;
        case "hidCook":
            name = "The cookie is a lie!";
            msg = "There is no cookie, but I guess you already knew that.";
            break;
        case "allLinks":
            name = "Click on everything!";
            msg = "Click on every link in contents";
            break;
        default:
            if (unlocked["lol"])
                return;
            unlocked["lol"] = true;
            break;
    }

    document.querySelector(".achievementName").innerHTML = name;
    document.querySelector(".achievementMsg").innerHTML = msg;

    document.querySelector(".achievement").style.bottom = "0";

    setTimeout(() =>
        document.querySelector(".achievement").style.bottom = "-7em", 3000
    );
}

// set smooth scrolling on links
// this cannot be done trough the html style scroll-behaviour
// because the initial scroll must be instant
let n = 1;
let allLinks = 0;
let anchorSelector = 'a[href^="#"]';
let anchorList = document.querySelectorAll(anchorSelector);
anchorList.forEach(link => {
    let v = n;
    n <<= 1;
    link.onclick = function (e) {
        e.preventDefault();
        allLinks |= v;
        if (allLinks == 7)
            showAchievement("allLinks");
        let destination = document.querySelector(this.hash);
        destination.scrollIntoView({
            behavior: 'smooth'
        });
    }
});
