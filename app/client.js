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

var Chans = ["Welcome"];
var Tabs = [];
var Users = [];

var cID = 0;

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

/*
    OBJECT DECLARATION
*/
{
    function Tab(name, id){
        this.Id = id;
        this.Name = name; // store the NON-LOWERCASE name for IRC commands (like WHOIS).
        this.Type = "pm";
        if(isChannel(name)){
            this.Type = "channel";
        }
        this.Messages = [];
        this.Users = [];
        console.log(this);

        // create the UI components (tab, contents, etc) like we usually do on newTab() here (save the chatLog as `this.ChatLog`, usrList as `this.UserList`, etc. however)
        tabName = name.toLowerCase();

        this.Button = document.createElement("a");

        // set up the tab selector "button"
        this.Button.href = "#scroll-tab-" + this.Id;
        this.Button.className = "mdl-layout__tab";
        // create the channel's unread counter badge
        this.Badge = document.createElement("span");
        this.Badge.id = "badge-" + tabName;
        this.Badge.className = "mdl-badge";
        this.Badge.setAttribute("data-badge", "0");
        this.Badge.innerHTML = tabName;
        // add the badge to the button
        this.Button.appendChild(this.Badge);

        // create the tab content
        {
            this.Content = document.createElement("section");
            this.Content.className = "mdl-layout__tab-panel";
            this.Content.id = "scroll-tab-" + this.Id;
            var flexDiv = document.createElement("div");
            flexDiv.className = "flex";
            this.ChatLog = document.createElement("div");
            this.ChatLog.className = "chatLog";
            this.ChatLog.id = "clog-" + tabName;
            flexDiv.appendChild(this.ChatLog);

            if(tabName == "!sys"){
                // if it is the system channel, we need a server command list.
                var usrCTitle = document.createElement("p");
                usrCTitle.innerHTML = "Server Commands";
                usrCTitle.id = "ct-" + tabName;
                this.CommandList = document.createElement("div");
                this.CommandList.className = "usrList";
                this.CommandList.appendChild(usrCTitle);
                // create motd button
                var comMotd = document.createElement("button");
                comMotd.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
                comMotd.onclick = function(){
                    electron.ipcRenderer.send("server_command", "MOTD");
                };
                var comMotdLabel = document.createTextNode("Server MOTD");
                comMotd.appendChild(comMotdLabel);
                this.CommandList.appendChild(comMotd);
                // create rules button
                var comRules = document.createElement("button");
                comRules.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
                comRules.onclick = function(){
                    electron.ipcRenderer.send("server_command", "RULES");
                };
                var comRulesLabel = document.createTextNode("Server Rules");
                comRules.appendChild(comRulesLabel);
                this.CommandList.appendChild(comRules);
                // register all buttons with google mdl
                componentHandler.upgradeElements(this.CommandList);
                flexDiv.appendChild(this.CommandList);
            }else if(this.Type == "channel"){
                // if it is a channel, we need a user list.
                var usrLTitle = document.createElement("p");
                usrLTitle.innerHTML = "Online Users and <span class=\"op\">Operators</span>";
                var usrList = document.createElement("div");
                usrList.className = "usrList";
                usrList.appendChild(usrLTitle);

                this.UserSearch = document.createElement("input");
                this.UserSearch.className = "mdl-textfield__input";
                this.UserSearch.type = "text";
                this.UserSearch.id = "searchUsers:" + tabName;
                this.UserSearch.placeholder = "Search users...";
                console.log("usersearch",this.UserSearch);
                this.UserSearch.onkeyup = function(event){
                    var filter = this.value.toLowerCase();
                    var channel = this.id.split(":")[1].toLowerCase();
                    var lis = Tabs[channel].UserList.getElementsByTagName('li');
                    for (var i = 0; i < lis.length; i++) {
                        var name = lis[i].innerHTML;
                        if (name.toLowerCase().indexOf(filter) == 0)
                            lis[i].style.display = 'block';
                        else
                            lis[i].style.display = 'none';
                    }
                }
                usrList.appendChild(this.UserSearch);
                // register search bar with google mdl
                componentHandler.upgradeElements(usrList);

                this.UserList = document.createElement("ul");
                this.UserList.id = "usrList-" + tabName;
                usrList.appendChild(this.UserList);
                flexDiv.appendChild(usrList);
            }else{
                // private chats can use the user list space for an easy command system
                var usrCTitle = document.createElement("p");
                usrCTitle.innerHTML = "Quick User Command: " + this.Name;
                usrCTitle.id = "ct-" + tabName;
                this.CommandList = document.createElement("div");
                this.CommandList.className = "usrList";
                this.CommandList.appendChild(usrCTitle);
                // create whois button
                var comWhois = document.createElement("button");
                comWhois.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
                comWhois.id = tabName;
                comWhois.onclick = function(){
                    var channel = this.id;
                    console.log(channel);
                    electron.ipcRenderer.send("user_whois", Tabs[channel].Name.toString());
                };
                var comWhoisLabel = document.createTextNode("WHOIS User");
                comWhois.appendChild(comWhoisLabel);
                this.CommandList.appendChild(comWhois);
                // create invite toggle button
                var comInviteToggle = document.createElement("button");
                comInviteToggle.id = tabName;
                comInviteToggle.className = "mdl-button mdl-js-button mdl-js-ripple-effect"
                var comInviteToggleLabel = document.createTextNode("Invite to Channel");
                comInviteToggle.onclick = function(){
                    var id = this.id;
                    var element = document.getElementById("invite-" + id);
                    if(element.classList.contains("shown")){
                        // if shown, hide it
                        element.classList.remove("shown");
                    }else{
                        // otherwise, show it
                        element.classList.add("shown");
                    }
                };
                comInviteToggle.appendChild(comInviteToggleLabel);
                this.CommandList.appendChild(comInviteToggle);
                // create invite form
                var comInviteForm = document.createElement("div");
                comInviteForm.id = "invite-" + tabName;
                comInviteForm.className = "toggle";
                var comInviteFormDiv = document.createElement("div");
                comInviteFormDiv.className = "mdl-textfield mdl-js-textfield mdl-textfield--floating-label";
                var comInviteFormInput = document.createElement("input");
                comInviteFormInput.className = "mdl-textfield__input";
                comInviteFormInput.required = true;
                comInviteFormInput.type = "text";
                comInviteFormInput.id = "inviteChan-" + tabName;
                comInviteFormDiv.appendChild(comInviteFormInput);
                var comInviteFormLabel = document.createElement("label");
                comInviteFormLabel.className = "mdl-textfield__label";
                comInviteFormLabel.for = "inviteChan-" + tabName;
                var comInviteFormLabelText = document.createTextNode("Invite User");
                comInviteFormLabel.appendChild(comInviteFormLabelText);
                comInviteFormDiv.appendChild(comInviteFormLabel);
                comInviteForm.appendChild(comInviteFormDiv);
                var comInviteFormButton = document.createElement("button");
                comInviteFormButton.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
                comInviteFormButton.type = "button";
                comInviteFormButton.onclick = function(){
                    // break up the active tab's id, which is of form scroll-tab-[channel]
                    var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
                    var chan = $("#inviteChan-" + Chans[array[array.length-1]]).val().toString();
                    var user = Tabs[Chans[array[array.length-1]]].Name;
                    console.log("message_send", user, ":client.send(\"INVITE\", \"" + user + "\", \"" + chan + "\");");
                    electron.ipcRenderer.send("message_send", user, ":client.send(\"INVITE\", \"" + user + "\", \"" + chan + "\");");
                };
                var comInviteFormButtonLabel = document.createTextNode("Invite User");
                comInviteFormButton.appendChild(comInviteFormButtonLabel);
                comInviteForm.appendChild(comInviteFormButton);
                this.CommandList.appendChild(comInviteForm);
                // register all buttons with google mdl
                componentHandler.upgradeElements(this.CommandList);
                flexDiv.appendChild(this.CommandList);
            }
        }

        this.Content.appendChild(flexDiv);

        document.getElementById("content").appendChild(this.Content);
        document.getElementById("tab-bar").appendChild(this.Button);

        /* the following is intended to register the new tab with MDL, which has no standard
        method for registering tabs (apparently they aren't supposed to be dynamically generated?) */
        var mdlLayout = document.querySelector('.mdl-js-layout');
        var mdlTabs = document.querySelectorAll('.mdl-layout__tab');
        var mdlPanels = document.querySelectorAll('.mdl-layout__tab-panel');
        for (var i = 0; i < mdlTabs.length; i++) {
            new MaterialLayoutTab(mdlTabs[i], mdlTabs, mdlPanels, mdlLayout.MaterialLayout);
        }

        // // if the channel's inside the message logs, and logging's enabled
        // if(Logging){
        //     var channelMessageIndex = nameIndexOf(Messages, tabName) - 1; // returns array index, or -1 if not found
        //     console.log(channelMessageIndex);
        //     if(channelMessageIndex >= 0){
        //         // add each message from the log to the channel tab, as "old" messages (faded)
        //         for(message in Messages[channelMessageIndex].messages){
        //             newMsg(tabName, Messages[channelMessageIndex].messages[message].content, Messages[channelMessageIndex].messages[message].user, Messages[channelMessageIndex].messages[message].timestamp, true);
        //         }
        //     }
        // }
    }
    Tab.prototype.addMessage = function(sender, contents, time, old=false, noFix=false){
        // check if there are any previous messages
        if(this.Messages.length > 0){
            // check if the same user posted both messages
            var prevMessage = this.Messages[this.Messages.length - 1];
        }else{
            var prevMessage = {Author: undefined};
        }
        if(prevMessage.Author == sender){
            // consecutive messages are separated with a <hr />
            prevMessage.Element.appendChild(document.createElement("hr"));
            // create the message, sharing the previous message's div container.
            this.Messages.push(new Message(sender, contents, time, prevMessage.Element, old, noFix));
        }else{
            // otherwise, make a new div and pass that to the Message object
            var messageDiv = document.createElement("div");
            messageDiv.className = "message";
            this.ChatLog.appendChild(messageDiv);
            this.Messages.push(new Message(sender, contents, time, messageDiv, old, noFix));
        }
    }
    Tab.prototype.addUser = function(name, op=false){
        if(Users.indexOf(name.toLowerCase()) >= 0){
            var user = name.toLowerCase();
            Users[user].Channels[this.Name.toLowerCase()] = this;
        }else{
            Users[name.toLowerCase()] = new User(name);
            Users[name.toLowerCase()].Channels[this.Name.toLowerCase()] = this;
        }
        this.Users.push(name.toLowerCase());
        var usrEntry = document.createElement("li");
        if(name == UserNick){
            usrEntry.classList.add("client");
        }
        if(op){
            usrEntry.classList.add("op");
        }
        var nameText = document.createTextNode(name.toString());
        usrEntry.appendChild(nameText);
        usrEntry.id = name.toLowerCase() + "-" + this.Id;
        usrEntry.onclick = function(){ newTab(this.innerHTML); };
        this.UserList.appendChild(usrEntry);
    }
    Tab.prototype.removeUser = function(name){
        delete Users[name.toLowerCase()].Channels[this.Name.toLowerCase()];
        delete this.Users[this.Users.indexOf(name.toLowerCase())];
        this.UserList.removeChild(document.getElementById(name.toLowerCase() + "-" + this.Id));
    }
    Tab.prototype.opUser = function(name){
        document.getElementById(name.toLowerCase() + "-" + this.Id).classList.add("op");
    }
    Tab.prototype.deopUser = function(name){
        document.getElementById(name.toLowerCase() + "-" + this.Id).classList.remove("op");
    }
    Tab.prototype.destroy = function(){
        for(user in this.Users){
            this.removeUser(this.Users[user]);
        }
        this.Button.parentNode.removeChild(this.Button);
        this.Content.parentNode.removeChild(this.Content);
        Chans[this.Id] = null;
        delete Tabs[this.Name.toLowerCase()];
    }
}
{
    function Message(sender, contents, time, div, old=false, noFix=false){
        this.Author = sender;
        this.Content = contents;
        this.Timestamp = time;
        this.Element = div;
        this.isOld = old;
        this.isNotFixed = noFix;

        // escape <>s, to prevent users from embedding HTML
        if(!this.isNotFixed){
            this.Content = this.Content.replace(/</g, "&lt;");
            this.Content = this.Content.replace(/>/g, "&gt;");
        }

        if(this.Author == "[System]"){
            // if it's a system message, add the appropriate class.
            this.Element.classList.add("sysmsg");
        }
        if(this.Author == "[MOTD]" || this.Author == "[SERVER]" || this.Timestamp == "topic" || this.Content.indexOf(UserNick) >= 0){
            // if it's a motd, server notice, topic, or contains the user's nick, then increase the importance
            this.Element.classList.add("important");
        }else if(this.Author == "[ERROR]"){
            // if it's an error, then style accordingly
            this.Element.classList.add("error");
        }
        if(this.isOld){
            // if it's an old message, reduce the opacity 50%;
            this.Element.classList.add("old");
        }
        var main = document.createElement("p");

        // check for links and emails, and then make them into links (because users like that shit)
        // create a copy of the message, so that we can mess around with the visible output but keep a clean object in the logs
        var hypertext = this.Content.slice(0);

        // get all standard channel names and let clicking it join the channel
        var chanLinks = hypertext.match(/(^|\s)#([\w,\-]+)/g);
        for(link in chanLinks){
            link = chanLinks[link];
            hypertext = hypertext.replace(link, "<a href='javascript:electron.ipcRenderer.send(\"channel_join\", \"" + link + "\")'>" + link + "</a>");
        }

        var links = linkify.find(hypertext);
        for(link in links){
            link = links[link];
            hypertext = hypertext.replace(link.value, "<a target='_blank' href='" + link.href + "'>" + link.value + "</a>");
        }

        main.innerHTML = hypertext;
        var meta = document.createElement("p");
        meta.className = "meta";
        var metaText = document.createTextNode(this.Author + " (" + this.Timestamp + "):");
        meta.appendChild(metaText);
        this.Element.appendChild(meta);
        this.Element.appendChild(main);
    }
}
{
    function User(name){
        this.Name = name;
        this.Channels = [];
    }
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
    for(tab in Tabs){
        newMsg(tab, "Disconnected from server. See Developer Console for detailed explanation.", "[ERROR]", d.toUTCString());
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
        newMsg(channel, message, sender, time, false, noFix);
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
        for(user in Tabs[channel.toLowerCase()].Users){
            Tabs[channel.toLowerCase()].removeUser(Tabs[channel.toLowerCase()].Users[user]);
        }

        for(user in nicks){
            var op = false;
            if(nicks[user] == "@" || nicks[user] == "~"){
                op = true;
            }
            Tabs[channel.toLowerCase()].addUser(user, op);
        }
    });
    electron.ipcRenderer.on("user_add", function(event, channel, nick){
        Tabs[channel.toLowerCase()].addUser(nick);
    });
    electron.ipcRenderer.on("user_op_add", function(event, channel, nick){
        Tabs[channel.toLowerCase()].opUser(nick);
    });
    electron.ipcRenderer.on("user_op_remove", function(event, channel, nick){
        Tabs[channel.toLowerCase()].deopUser(nick);
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
        Tabs[channel.toLowerCase()].removeUser(nick);
    });
    electron.ipcRenderer.on("user_quit", function(event, nick, chans, reason){
        for(channel in Users[nick.toLowerCase()].Channels){
            channel = Users[nick.toLowerCase()].Channels[channel];
            channel.removeUser(nick);
            var d = new Date();
            newMsg(channel.Name.toString(), nick + " has quit the server (" + reason + ").", "[System]", d.toUTCString());
        }
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

// open a new tab
function newTab(tabName){
    // only create a new tab if there isn't one already
    if(Tabs[tabName.toLowerCase()] == undefined){
        // add it to the tab list
        cID++;
        Chans.push(tabName.toLowerCase());
        Tabs[tabName.toLowerCase()] = new Tab(tabName, cID);
    }
}
// add a new message to a tab
function newMsg(channel, message, sender, time, old=false, noFix=false){
    console.log(channel);
    console.log(message);
    channel = channel.toLowerCase();

    var tab = document.getElementById("content");
    // allow 1px inaccuracy by adding 1
    var isScrolledToBottom = tab.scrollHeight - tab.clientHeight <= tab.scrollTop + 1;

    Tabs[channel].addMessage(sender, message, time, old, noFix);

    // if it's a private chat, and the message is from the other person, make sure the tab's proper name matches the capitalisation of the person's nick.
    if(!isChannel(channel) && sender.toLowerCase() == channel){
        Tabs[channel].Name = sender;
    }

    // if it was posted to the current channel, we should bump the scroll
    var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
    // get the selected channel name
    var curChan = Chans[array[array.length-1]];
    console.log("curchan", curChan);
    if(curChan == channel){
        // scroll to bottom if isScrolledToBottom, if the channel is selected that the message was posted to
        if(isScrolledToBottom){
            tab.scrollTop = tab.scrollHeight;
        }
    }else{
        // otherwise, we should probably increase the badge of the actual channel, unless it's an old message
        // (which the user will already have read)
        if(!old){
            // set the badge to its value + 1.
            Tabs[channel].Badge.setAttribute("data-badge", String(Number(Tabs[channel].Badge.getAttribute("data-badge")) + 1));
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
        // if the top bar's clicked, we want to force the chat log to the bottom
        document.getElementById("topbar").addEventListener("click", function(){
            // we should reset the unread message indicator for the active channel (for in case the
            // user just changed it)
            var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
            // get the selected channel name
            var curChan = Chans[array[array.length-1]];
            var tab = document.getElementById("content");
            if(array[array.length-1] != 0){
                // jump to bottom
                tab.scrollTop = tab.scrollHeight;

                Tabs[curChan].Badge.setAttribute("data-badge", "0");
            }else{
                // jump to top
                tab.scrollTop = 0;
            }
        });

        // when the new message form is completed
        $('#send').submit(function(){
            // break up the active tab's id, which is of form scroll-tab-[channel]
            var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
            // we need to get [channel], so we grab the last element of the array
            var channel = Chans[array[array.length-1]];
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
                // destroy the object.
                Tabs[channel].destroy();
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
    });
}
