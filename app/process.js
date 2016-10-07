var tabs = ["sys"];

let server;
let uNick;

const electron = require("electron");

function about(){
    electron.ipcRenderer.send("about");
}

electron.ipcRenderer.on("pingchan", function(event, message){
    console.log(message);
});

electron.ipcRenderer.on("set", function(event, server){
    document.getElementById("server").innerHTML = server;
    document.title = "Ave IRC Client :: " + server;
    server = server;
});
electron.ipcRenderer.on("user", function(event, nick){
    uNick = nick;
});

electron.ipcRenderer.on("newmsg", function(event, channel, message, sender, time){
    try{
        newMsg(channel, message, sender, time);
    }catch(err){
        /* if the channel doesn't have a tab, it will probably raise an error. therefore, if we assume that
        this error was caused by that, we should get away with it (let's face it - it probably was) */
        console.log("error in newmsg handler. assuming nonexistant tab. creating new tab. (" + err + ")");
        newTab(channel);
        newMsg(channel, message, sender, time);
    }
});
electron.ipcRenderer.on("topic", function(event, channel, topic, nick){
    newMsg(channel, topic, nick, "topic");
});

electron.ipcRenderer.on("names", function(event, channel, nicks){
    console.log(channel, nicks);
    /* for in case NAMES was called *after* the initial channel call, we should probably clear
    the existing user list (to prevent duplicates and potentially delete nonapplicable nicks)
    __note that this shouldn't happen often!__*/
    var usrList = document.getElementById("usrList-" + (tabs.indexOf(channel) + 1));
    while (usrList.firstChild) {
        usrList.removeChild(usrList.firstChild);
    }

    for(user in nicks){
        var usrEntry = document.createElement("li");
        if(nicks[user] == "@" || nicks[user] == "~"){
            usrEntry.className = "op";
        }
        if(user == uNick){
            usrEntry.className += " client";
        }
        var name = document.createTextNode(user.toString());
        usrEntry.appendChild(name);
        usrEntry.id = user + "-" + (tabs.indexOf(channel) + 1);
        usrEntry.onclick = function(){ newTab(this.innerHTML); };
        usrList.appendChild(usrEntry);
    }
});
electron.ipcRenderer.on("adNick", function(event, channel, nick){
    var usrList = document.getElementById("usrList-" + (tabs.indexOf(channel) + 1));
    var usrEntry = document.createElement("li");
    if(nick == uNick){
        usrEntry.className += " client";
    }
    var name = document.createTextNode(nick.toString());
    usrEntry.appendChild(name);
    usrEntry.id = nick + "-" + (tabs.indexOf(channel) + 1);
    usrEntry.onclick = function(){ newTab(this.innerHTML); };
    usrList.appendChild(usrEntry);
});
electron.ipcRenderer.on("opNick", function(event, channel, nick){
    var usrEntry = document.getElementById(nick + "-" + (tabs.indexOf(channel) + 1));
    usrEntry.className += " op";
});
electron.ipcRenderer.on("deopNick", function(event, channel, nick){
    var usrEntry = document.getElementById(nick + "-" + (tabs.indexOf(channel) + 1));
    usrEntry.classList.remove("op");
});
electron.ipcRenderer.on("chNick", function(event, oldnick, newnick, channel){
    var usrEntry = document.getElementById(oldnick + "-" + (tabs.indexOf(channel) + 1));
    usrEntry.innerHTML = newnick;
    usrEntry.id = newnick + "-" + (tabs.indexOf(channel) + 1);
});
electron.ipcRenderer.on("rmNick", function(event, channel, nick){
    var entry = document.getElementById(nick + "-" + (tabs.indexOf(channel) + 1));
    document.getElementById("usrList-" + (tabs.indexOf(channel) + 1)).removeChild(entry);
});

electron.ipcRenderer.on("inv", function(event, chan, from){
    var join = confirm("You have been invited to the  " + chan + " channel by " + from + ". Would you like to accept this invitation?");
    if(join){
        console.log("join!");
        electron.ipcRenderer.send("join", chan);
    }
});

function sendMsg(recipient, message){
    electron.ipcRenderer.send("sendmsg", recipient, message);
}

function newMsg(channel, message, sender, time){
    var clog = document.getElementById("clog-" + (tabs.indexOf(channel) + 1));
    var tab = document.getElementById("content");
    // allow 1px inaccuracy by adding 1
    var isScrolledToBottom = tab.scrollHeight - tab.clientHeight <= tab.scrollTop + 1;
    console.log(isScrolledToBottom);
    console.log(channel, message, sender, time);
    var div = document.createElement("div");
    div.className = "message";
    if(channel == "sys" || sender == "[System]"){
        div.className += " sysmsg";
    }
    if(sender == "[MOTD]" || sender == "[SERVER]"){
        div.className += " topic";
    }else if(sender == "[ERROR]"){
        div.className += " error";
    }else if(time == "topic"){
        div.className += " topic";
    }
    var main = document.createElement("p");

    // check for links and emails, and then make them into links (because users like that shit)
    var hTxt = message;
    var links = linkify.find(message);
    for(link in links){
        link = links[link];
        hTxt = hTxt.replace(link.value, "<a target='_blank' href='" + link.href + "'>" + link.value + "</a>");
    }

    /* var text = document.createTextNode(message);
    main.appendChild(text); */
    main.innerHTML = hTxt;
    var meta = document.createElement("p");
    meta.className = "meta";
    var metaText = document.createTextNode(sender + " (" + time + "):");
    meta.appendChild(metaText);
    div.appendChild(meta);
    div.appendChild(main);
    // div.innerHTML = message;
    clog.appendChild(div);
    // scroll to bottom if isScrolledToBotto
    if(isScrolledToBottom){
        tab.scrollTop = tab.scrollHeight;
    }
}

function newTab(tabName){
    if(!(tabs.indexOf(tabName) >= 0)){
        tabs.push(tabName);
        var index = tabs.indexOf(tabName) + 1;
        var tabButton = document.createElement("a");
        tabButton.href = "#scroll-tab-" + index;
        tabButton.className = "mdl-layout__tab";
        var tabText = document.createTextNode(tabName);
        tabButton.appendChild(tabText);

        var tab = document.createElement("section");
        tab.className = "mdl-layout__tab-panel";
        tab.id = "scroll-tab-" + index;
        var flexDiv = document.createElement("div");
        flexDiv.className = "flex";
        var clog = document.createElement("div");
        clog.className = "chatLog";
        clog.id = "clog-" + index;
        var usrLTitle = document.createElement("p");
        usrLTitle.innerHTML = "Online Users and <span class=\"op\">Operators</span>";
        var usrList = document.createElement("div");
        usrList.className = "usrList";
        usrList.appendChild(usrLTitle);
        var usrListUl = document.createElement("ul");
        usrListUl.id = "usrList-" + index;

        usrList.appendChild(usrListUl);
        flexDiv.appendChild(clog);
        flexDiv.appendChild(usrList);
        tab.appendChild(flexDiv);

        document.getElementById("content").appendChild(tab);

        document.getElementById("tab-bar").appendChild(tabButton);

        /* the following is intended to register the new tab with MDL, which has no standard
        method for registering tabs (apparently they aren't supposed to be dynamically generated?) */
        var Layout = document.querySelector('.mdl-js-layout');
        var Tabs = document.querySelectorAll('.mdl-layout__tab');
        var Panels = document.querySelectorAll('.mdl-layout__tab-panel');
        for (var i = 0; i < Tabs.length; i++) {
            new MaterialLayoutTab(Tabs[i], Tabs, Panels, Layout.MaterialLayout);
        }
    }
}

$(document).ready(function(){
    $('#send').submit(function(){
        console.log($('#msg').val());
        var array = document.getElementsByClassName("is-active")[1].id.split("-");
        var channel = tabs[array[array.length-1]-1];
        if($("#msg").val() != ""){
            sendMsg(channel, $('#msg').val().toString());
            $("#msg").val("");
        }
        return false;
    });

    $('#joinChan').submit(function(){
        electron.ipcRenderer.send("join", $("#channel").val().toString());
        return false;
    });
    $('#pmUsr').submit(function(){
        sendMsg($("#pmNick").val().toString(), $("#pmMsg").val().toString());
        return false;
    });
    $('#changeNick').submit(function(){
        electron.ipcRenderer.send("changeNick", $("#newNick").val().toString());
        return false;
    });

    document.getElementById("topbar").addEventListener("click", function(){
        console.log("clicked");
        var tab = document.getElementById("content");
        console.log(tab);
        tab.scrollTop = tab.scrollHeight;
    });
});
