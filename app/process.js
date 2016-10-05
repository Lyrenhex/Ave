function updateScroll(){
    var element = document.getElementById("body");
    element.scrollTop = element.scrollHeight;
}

var tabs = ["sys"];

let server;

const electron = require("electron");

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');

electron.ipcRenderer.on("pingchan", function(event, message){
    console.log(message);
    updateScroll();
});

electron.ipcRenderer.on("set", function(event, server){
    document.getElementById("server").innerHTML = server;
    document.title = "Ave IRC Client :: " + server;
    server = server;
});

electron.ipcRenderer.on("newmsg", function(event, channel, message, sender, time){
    try{
        newMsg(channel, message, sender, time);
    }catch(err){
        console.log("error in newmsg handler. assuming nonexistant tab. creating new tab. (" + err + ")");
        newTab(channel);
        newMsg(channel, message, sender, time);
    }
});

electron.ipcRenderer.on("names", function(event, channel, nicks){
    console.log(channel, nicks);
    for(user in nicks){
        var usrEntry = document.createElement("li");
        if(nicks[user] == "@" || nicks[user] == "~"){
            usrEntry.className = "op";
        }
        var name = document.createTextNode(user.toString());
        usrEntry.appendChild(name);
        usrEntry.id = user + "-" + (tabs.indexOf(channel) + 1);
        usrEntry.onclick = function(){ newTab(this.innerHTML); };
        document.getElementById("usrList-" + (tabs.indexOf(channel) + 1)).appendChild(usrEntry);
    }
});
electron.ipcRenderer.on("rmNick", function(event, channel, nick){
    var entry = document.getElementById(nick + "-" + (tabs.indexOf(channel) + 1));
    console.log(channel);
    console.log("usrList-" + (tabs.indexOf(channel) + 1));
    document.getElementById("usrList-" + (tabs.indexOf(channel) + 1)).removeChild(entry);
});

function sendMsg(recipient, type, message){
    electron.ipcRenderer.send("sendmsg", recipient, type, message);
}

function newMsg(channel, message, sender, time){
    console.log(channel, message, sender, time);
    var div = document.createElement("div");
    div.className = "message";
    if(channel == "sys" || sender == "[System]"){
        div.className += " sysmsg";
    }
    var main = document.createElement("p");
    var text = document.createTextNode(message);
    main.appendChild(text);
    var meta = document.createElement("p");
    meta.className = "meta";
    var metaText = document.createTextNode(sender + " (" + time + "):");
    meta.appendChild(metaText);
    div.appendChild(meta);
    div.appendChild(main);
    // div.innerHTML = message;
    document.getElementById("clog-" + (tabs.indexOf(channel) + 1)).appendChild(div);
    updateScroll();
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
});
