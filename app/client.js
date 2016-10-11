/*
Ave Material Design Modern IRC Client
Copyright (C) 2016  Damian Heaton

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var Tabs = ["!sys"];
var Messages = [{name: "!sys", messages: []}];

var Server;
var UserNick;
var Logging;

const electron = require("electron");
const fs = require("fs");

// ensure logs folder already exists, for logging purposes
fs.mkdir("logs", 0777, function(err){
        if(err){
            if(err.code == "EEXIST"){
                // do nothing; folder already exists
            }else{
                console.log("Unable to create Logs folder", err);
                Logging = false;
            }
        }
});

/*
    EXTENDERS FOR BASIC JAVASCRIPT PROTOTYPES
*/

String.prototype.nIndexOf = function(substring, occurrence) {
    var str = this;
   return str.split(substring, occurrence).join(substring).length;
};
String.prototype.replaceBetween = function(start, end, what) {
    return this.substring(0, start) + what + this.substring(end);
};
function nameIndexOf(array, value) {
    for(var i = 0; i < array.length; i += 1) {
        console.log(array[i].name);
        if(array[i].name === value) {
            return i;
        }
    }
    return -1;
}

electron.ipcRenderer.on("log", function(event, message){
    console.log(message);
});

electron.ipcRenderer.on("set_logging", function(event, logging){
    // set whether or not to log messages
    Logging = logging;
});
electron.ipcRenderer.on("set_server", function(event, server){
    // set the visible server details
    document.getElementById("server").innerHTML = server;
    document.title = "Ave IRC Client :: " + server;
    Server = server;

    // load the old messages for this server into memory, if logs are enabled
    if(Logging){
        var oldMessages = JSON.parse(fs.readFileSync("logs/" + server + '.json', 'utf8'));
        Messages = oldMessages;
    }
});
electron.ipcRenderer.on("set_user", function(event, nick){
    UserNick = nick;
});

// if the user disconnected
electron.ipcRenderer.on("server_disconnect", function(event, error){
    console.log("DISCONNECTED ", error);
    var d = new Date();
    // make a big fuss! we lost connection
    for(channel in Tabs){
        newMsg(Tabs[channel], "Disconnected from server. See Developer Console for detailed explanation.", "[ERROR]", d.toUTCString());
    }
});

electron.ipcRenderer.on("message_add", function(event, channel, message, sender, time, noFix){
    try{
        newMsg(channel, message, sender, time, false, noFix);
    }catch(err){
        /* if the channel doesn't have a tab, it will probably raise an error. therefore, if we assume that
        this error was caused by that, we should get away with it (let's face it - it probably was) */
        console.log("error in message_add handler. assuming nonexistant tab. creating new tab. (" + err + ")");
        newTab(channel);
        newMsg(channel, message, sender, time);
    }
});
electron.ipcRenderer.on("message_topic", function(event, channel, topic, nick){
    newMsg(channel, topic, nick, "topic");
});

/* IRC USER HANDLERS */
{
    electron.ipcRenderer.on("user_names", function(event, channel, nicks){
        /* for in case NAMES was called *after* the initial channel call, we should probably clear
        the existing user list (to prevent duplicates and potentially delete nonapplicable nicks)
        __note that this shouldn't happen often!__*/
        var usrList = document.getElementById("usrList-" + (Tabs.indexOf(channel) + 1));
        while (usrList.firstChild) {
            usrList.removeChild(usrList.firstChild);
        }

        for(user in nicks){
            var usrEntry = document.createElement("li");
            if(nicks[user] == "@" || nicks[user] == "~"){
                usrEntry.className = "op";
            }
            if(user == UserNick){
                usrEntry.classList.add("client");
            }
            var name = document.createTextNode(user.toString());
            usrEntry.appendChild(name);
            usrEntry.id = user + "-" + (Tabs.indexOf(channel) + 1);
            usrEntry.onclick = function(){ newTab(this.innerHTML); };
            usrList.appendChild(usrEntry);
        }
    });
    electron.ipcRenderer.on("user_add", function(event, channel, nick){
        var usrList = document.getElementById("usrList-" + (Tabs.indexOf(channel) + 1));
        var usrEntry = document.createElement("li");
        if(nick == UserNick){
            usrEntry.classList.add("client");
        }
        var name = document.createTextNode(nick.toString());
        usrEntry.appendChild(name);
        usrEntry.id = nick + "-" + (Tabs.indexOf(channel) + 1);
        usrEntry.onclick = function(){ newTab(this.innerHTML); };
        usrList.appendChild(usrEntry);
    });
    electron.ipcRenderer.on("user_op_add", function(event, channel, nick){
        var usrEntry = document.getElementById(nick + "-" + (Tabs.indexOf(channel) + 1));
        usrEntry.classList.add("op");
    });
    electron.ipcRenderer.on("user_op_remove", function(event, channel, nick){
        var usrEntry = document.getElementById(nick + "-" + (Tabs.indexOf(channel) + 1));
        usrEntry.classList.remove("op");
    });
    electron.ipcRenderer.on("user_change", function(event, oldnick, newnick, channel){
        try {
            var usrEntry = document.getElementById(oldnick + "-" + (Tabs.indexOf(channel) + 1));
            usrEntry.innerHTML = newnick;
            usrEntry.id = newnick + "-" + (Tabs.indexOf(channel) + 1);
            var d = new Date();
            newMsg(channel, oldnick + " changed their name to " + newnick + ".", "[System]", d.toUTCString());
        }catch(err){
            // do nothing; probably just not in the channel.
        }
    });
    electron.ipcRenderer.on("user_remove", function(event, channel, nick){
        rmNick(nick, channel);
    });
    electron.ipcRenderer.on("user_quit", function(event, nick, chans, reason){
        for(channel in chans){
            channel = chans[channel];
            try{
                rmNick(nick, channel);
                var d = new Date();
                newMsg(channel, nick + " has quit the server (" + reason + ").", "[System]", d.toUTCString());
            }catch(err){
                // do nothing; probably just not a channel the user's on
            }
        }
        var entry = document.getElementById(nick + "-" + (Tabs.indexOf(channel) + 1));
        document.getElementById("usrList-" + (Tabs.indexOf(channel) + 1)).removeChild(entry);
    });
}

electron.ipcRenderer.on("channel_invite", function(event, chan, from){
    // check if the user wants to join the channel they were invited to
    var join = confirm("You have been invited to the  " + chan + " channel by " + from + ". Would you like to accept this invitation?");
    if(join){
        // if they do, instruct the main process to accept the invite.
        electron.ipcRenderer.send("channel_join", chan);
    }
});

// simple check to see if a string is a channel
function isChannel(channel){
    // does it begin with '#', '&', '+', or '!'?
    if(channel.indexOf("#") == 0 || channel.indexOf("&") == 0 || channel.indexOf("+") == 0 || channel.indexOf("!") == 0){
        // if yes, it's a channel
        return true;
    }
    // if not, it's not a channel (probably a private message!)
    return false;
}

/*
    FUNCTIONS THAT SCREW AROUND WITH THE USER INTERFACE
*/

// remove a user from the online user's list of a channel
function rmNick(nickname, channel){
    var entry = document.getElementById(nickname + "-" + (Tabs.indexOf(channel) + 1));
    document.getElementById("usrList-" + (Tabs.indexOf(channel) + 1)).removeChild(entry);
}

// open a new tab
function newTab(tabName){
    tabName = tabName.toLowerCase();
    // only create a new tab if there isn't one already
    if(!(Tabs.indexOf(tabName) >= 0)){
        // add it to the tab list
        Tabs.push(tabName);
        // add a channel for it in the message object
        if(nameIndexOf(Messages, tabName) == -1){
            Messages.push({
                name: tabName,
                messages: []
            });
        }

        // IDs are always the index + 1
        var id = Tabs.indexOf(tabName) + 1;
        var tabButton = document.createElement("a");

        // set up the tab selector "button"
        tabButton.href = "#scroll-tab-" + id;
        tabButton.className = "mdl-layout__tab";
        // create the channel's unread counter badge
        var tabBadge = document.createElement("span");
        tabBadge.id = "badge-" + id;
        tabBadge.className = "mdl-badge";
        tabBadge.setAttribute("data-badge", "0");
        tabBadge.innerHTML = tabName;
        // add the badge to the button
        tabButton.appendChild(tabBadge);

        // create the tab content
        {
            var tab = document.createElement("section");
            tab.className = "mdl-layout__tab-panel";
            tab.id = "scroll-tab-" + id;
            var flexDiv = document.createElement("div");
            flexDiv.className = "flex";
            var clog = document.createElement("div");
            clog.className = "chatLog";
            clog.id = "clog-" + id;
            if(!isChannel(tabName)){
                // if it's a private chat, we can extend the chat log horizontally
                clog.classList.add("extended");
            }
            flexDiv.appendChild(clog);

            if(isChannel(tabName)){
                // but if it is a channel, we need a user list.
                var usrLTitle = document.createElement("p");
                usrLTitle.innerHTML = "Online Users and <span class=\"op\">Operators</span>";
                var usrList = document.createElement("div");
                usrList.className = "usrList";
                usrList.appendChild(usrLTitle);
                var usrListUl = document.createElement("ul");
                usrListUl.id = "usrList-" + id;
                usrList.appendChild(usrListUl);
                flexDiv.appendChild(usrList);
            }
        }

        tab.appendChild(flexDiv);

        document.getElementById("content").appendChild(tab);
        document.getElementById("tab-bar").appendChild(tabButton);

        /* the following is intended to register the new tab with MDL, which has no standard
        method for registering tabs (apparently they aren't supposed to be dynamically generated?) */
        var mdlLayout = document.querySelector('.mdl-js-layout');
        var mdlTabs = document.querySelectorAll('.mdl-layout__tab');
        var mdlPanels = document.querySelectorAll('.mdl-layout__tab-panel');
        for (var i = 0; i < mdlTabs.length; i++) {
            new MaterialLayoutTab(mdlTabs[i], mdlTabs, mdlPanels, mdlLayout.MaterialLayout);
        }

        // if the channel's inside the message logs, and logging's enabled
        if(Logging){
            var channelMessageIndex = nameIndexOf(Messages, tabName); // returns array index, or -1 if not found
            console.log(channelMessageIndex);
            if(channelMessageIndex >= 0){
                // add each message from the log to the channel tab, as "old" messages (faded)
                for(message in Messages[channelMessageIndex].messages){
                    console.log(Messages[channelMessageIndex].messages[message].content);
                    console.log(message);
                    console.log(Messages[channelMessageIndex].messages[message]);
                    newMsg(tabName, Messages[channelMessageIndex].messages[message].content, Messages[channelMessageIndex].messages[message].user, Messages[channelMessageIndex].messages[message].timestamp, true);
                }
            }
        }
    }
}
// add a new message to a tab
function newMsg(channel, message, sender, time, old=false, noFix=false){
    console.log(channel);
    console.log(message);
    channel = channel.toLowerCase();

    // escape <>s, to prevent users from embedding HTML
    if(!noFix){
        message = message.replace(/</g, "&lt;");
        message = message.replace(/>/g, "&gt;");
    }

    // get the channel chat log in the DOM
    var clog = document.getElementById("clog-" + (Tabs.indexOf(channel) + 1));
    var chanID = Tabs.indexOf(channel);
    // set up the message's object for the Messages[] array.
    var msgObj = {
        user: sender,
        timestamp: time,
        content: message
    };
    if(!old && Logging){
        // if it's not an old message (already in the array), add it to the array and re-save the array as JSON.
        Messages[chanID].messages.push(msgObj);
        var msgID = Messages[chanID].messages.indexOf(msgObj);
        // json works really well with JavaScript, and can easily be parsed into a JS array/object combo.
        fs.writeFile("logs/" + Server + '.json', JSON.stringify(Messages, null, 4), 'utf8', function(err) {
            if(err) {
                console.log("couldn't write messages to json file: ", err);
            } else {
                console.log("messages saved as json: " + Server + ".json");
            }
        });
    }

    var msgID = Messages[chanID].messages.indexOf(msgObj);
    var tab = document.getElementById("content");
    // allow 1px inaccuracy by adding 1
    var isScrolledToBottom = tab.scrollHeight - tab.clientHeight <= tab.scrollTop + 1;
    var div = document.createElement("div");
    // create a copy of the message, so that we can mess around with the visible output but keep a clean object in the logs
    var outMessage = message.slice(0);
    if(message[0] == "["){
        try{
            var quote = message.substring(1, message.lastIndexOf("]"));
            var qMeta = quote.substring(0, quote.nIndexOf(":", 3));
            var qMsg = quote.substring(quote.nIndexOf(":", 3)+2, quote.length);
            var qStitch = "<div class=\"message\"><p class=\"meta\">" + qMeta + ":</p><p>" + qMsg + "</p></div>";
            outMessage = message.replaceBetween(0, message.lastIndexOf("]") + 2, qStitch);
        }catch(err){
            // nothing needs to be done, someone probably just started a message with "["
        }
    }
    div.className = "message";
    div.id = "msg-" + chanID + "-" + msgID;
    if(channel == "!sys" || sender == "[System]"){
        // if it's a system message, add the appropriate class.
        div.classList.add("sysmsg");
    }
    if(sender == "[MOTD]" || sender == "[SERVER]" || time == "topic" || message.indexOf(UserNick) >= 0){
        // if it's a motd, server notice, topic, or contains the user's nick, then increase the importance
        div.classList.add("important");
    }else if(sender == "[ERROR]"){
        // if it's an error, then style accordingly
        div.classList.add("error");
    }
    if(old){
        // if it's an old message, reduce the opacity 50%;
        div.classList.add("old");
    }
    var main = document.createElement("p");

    // check for links and emails, and then make them into links (because users like that shit)
    var hypertext = outMessage;
    var links = linkify.find(outMessage);
    for(link in links){
        link = links[link];
        hypertext = hypertext.replace(link.value, "<a target='_blank' href='" + link.href + "'>" + link.value + "</a>");
    }

    main.innerHTML = hypertext;
    var meta = document.createElement("p");
    meta.onclick = function(){
        $('#msg').val("[" + sender + " (" + time + "): " + message + "] ");
    };
    meta.className = "meta";
    var metaText = document.createTextNode(sender + " (" + time + "):");
    meta.appendChild(metaText);
    div.appendChild(meta);
    div.appendChild(main);
    clog.appendChild(div);

    // if it was posted to the current channel, we should bump the scroll
    var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
    // get the selected channel name
    var curChan = Tabs[array[array.length-1]-1];
    if(curChan == channel){
        // scroll to bottom if isScrolledToBottom, if the channel is selected that the message was posted to
        if(isScrolledToBottom){
            tab.scrollTop = tab.scrollHeight;
        }
    }else{
        // otherwise, we should probably increase the badge of the actual channel, unless it's an old message
        // (which the user will already have read)
        if(!old){
            var badge = document.getElementById("badge-" + (Tabs.indexOf(channel) + 1));
            // set the badge to its value + 1.
            badge.setAttribute("data-badge", String(Number(badge.getAttribute("data-badge")) + 1));
        }
    }
}

function sendMsg(recipient, message){
    electron.ipcRenderer.send("message_send", recipient, message);
}

/*
    USER INTERFACE ELEMENT HANDLERS
*/
{
    /* USER CONTROLLED ELEMENTS */

    // handle form togglers
    function toggle(id){
        var element = document.getElementById(id);
        if(element.classList.contains("shown")){
            // if shown, hide it
            element.classList.remove("shown");
        }else{
            // otherwise, show it
            element.classList.add("shown");
        }
    }
    function about(){
        // we need the render thread to open a new window here
        // perhaps about() and help() could be merged?
        electron.ipcRenderer.send("client_about");
    }
    function help(){
        electron.ipcRenderer.send("client_help");
    }

    // add handlers for form submits
    $(document).ready(function(){
        // when the new message form is completed
        $('#send').submit(function(){
            // break up the active tab's id, which is of form scroll-tab-[channel]
            var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
            // we need to get [channel], so we grab the last element of the array
            var channel = Tabs[array[array.length-1]-1];
            // *never send an empty message*
            if($("#msg").val() != ""){
                sendMsg(channel, $('#msg').val().toString());
                // reset the field.
                $("#msg").val("");
            }
            // prevent Chromium refreshing the page
            return false;
        });

        // when user tries joining a channel
        $('#joinChan').submit(function(){
            // ask main thread to join a channel; we have no direct controller for node-irc in this
            // thread (maybe we could simplify this by adding one?)
            // make it lower case, so that we aren't case-sensitive!
            electron.ipcRenderer.send("channel_join", $("#channel").val().toString().toLowerCase());
            // override Chromium behaviour
            return false;
        });
        // user wants to leave channel OR private chat
        $('#partChan').submit(function(){
            // lowercase it; all channels and stuff should be lowercase (we don't want case-sensitivity)
            var channel = $("#partChannel").val().toString().toLowerCase();
            try{
                var chanID = Tabs.indexOf(channel);
                // unset the tab listing; we can't just purge it as this breaks all other tabs.
                Tabs[chanID] = null;
                // id's numbers are always 1 greater than the index.
                chanID++;
                var chanTab = document.querySelectorAll("a[href='#scroll-tab-" + chanID + "']")[0];
                // destroy the tab selector
                chanTab.parentNode.removeChild(chanTab);
                var chanContent = document.getElementById("scroll-tab-" + chanID);
                // ... and the chat log.
                chanContent.parentNode.removeChild(chanContent);
                electron.ipcRenderer.send("channel_part", channel);
            }catch(err){
                // we couldn't leave the requested chat for some reason. probably a user typo.
                alert("We couldn't leave the chat. Are you sure you spelled it correctly?")
                console.log("chat leave error: ", err);
            }
            // override Chromium behaviour
            return false;
        });
        $('#pmUsr').submit(function(){
            sendMsg($("#pmNick").val().toString(), $("#pmMsg").val().toString());
            // override Chromium behaviour
            return false;
        });
        $('#changeNick').submit(function(){
            electron.ipcRenderer.send("nick_change", $("#newNick").val().toString());
            // override Chromium behaviour
            return false;
        });

        $('#rc').submit(function(){
            electron.ipcRenderer.send("server_reconnect");
            // override Chromium behaviour
            return false;
        });
        $('#dc').submit(function(){
            electron.ipcRenderer.send("server_disconnect", $("#dcReason").val().toString());
            // override Chromium behaviour
            return false;
        });

        $('#whois').submit(function(){
            electron.ipcRenderer.send("user_whois", $("#whoisNick").val().toString());
            // override Chromium behaviour
            return false;
        });

        // if the top bar's clicked, we want to force the chat log to the bottom
        document.getElementById("topbar").addEventListener("click", function(){
            var tab = document.getElementById("content");
            // jump to bottom
            tab.scrollTop = tab.scrollHeight;

            // we should reset the unread message indicator for the active channel (for in case the
            // user just changed it)
            var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
            var badge = document.getElementById("badge-" + array[array.length-1]);
            badge.setAttribute("data-badge", "0");
        });
    });
}
