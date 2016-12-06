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

// import the node modules we need
const electron = require("electron");
const fs = require("fs");
const irc = require("irc");
const marked = require("marked");
const firebase = require("firebase");

// Initialize Firebase
var config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
firebase.initializeApp(config);

var database = firebase.database();

// define some important global variables
var Channels = ["%Server"];
var Tabs = [];
var Users = [];

var cID = 0;

var Server = {};
var Client = {};
var UserNick;

// set up the markdown parser
var MarkedRenderer = new marked.Renderer();
MarkedRenderer.heading = function(text, level){
    return text;
}
MarkedRenderer.list = function(body, ordered){
    return body;
}
MarkedRenderer.listitem = function(text){
    return text;
}
MarkedRenderer.paragraph = function(text){
    return text;
}
MarkedRenderer.link = function(href, title, text){
    if(href.indexOf("http") == -1){
        href = "http://" + href;
    }
    // maybe change this so that it would return `exam.ple` rather than `http://exam.ple` to the user.
    // solely to make code that we've (possibly incorrectly) identified as a link readable still.
    return `<a target='_blank' href='${href}'>${text}</a>`;
}

var MarkedOptions = {
    renderer: MarkedRenderer,
    gfm: false
}

/*
    BASIC PROTOTYPE EXTENSIONS
*/
function nIndexOf(str, substr, n){
    return str.split(substr, n).join(substr).length;
}
function replaceBetween(str, start, end, x){
    return str.substring(0, start) + x + str.substring(end);
}
function nameIndexOf(arr, val){
    for(var i = 0; i < arr.length; i++){
        if(arr[i].name === val){
            return i;
        }
    }
}

/*
    OBJECT DECLARATION
*/
function Tab(name, id){
    this.Id = id;
    this.Name = name; // store the NON-LOWERCASE name for IRC commands (like WHOIS).
    this.Type = "pm";
    if(isChannel(name)){
        this.Type = "channel";
    }
    this.Messages = [];
    this.Users = [];

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
    this.Badge.title = "Unread messages";
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

        if(tabName == "%Server"){
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
            this.UserSearch.onkeyup = function(event){
                var filter = this.value.toLowerCase();
                var channel = this.id.split(":")[1].toLowerCase();
                var lis = Tabs[channel].UserList.getElementsByTagName('li');
                for (var i = 0; i < lis.length; i++) {
                    var name = lis[i].innerHTML;
                    if (name.toLowerCase().indexOf(filter) == 0){
                        lis[i].style.display = 'block';
                    }else{
                        lis[i].style.display = 'none';
                    }
                }
            }
            usrList.appendChild(this.UserSearch);

            this.UserList = document.createElement("ul");
            this.UserList.id = "usrList-" + tabName;
            usrList.appendChild(this.UserList);

            var chOpComs = document.createElement("div");
            chOpComs.className = "toggle-md shown";
            chOpComs.appendChild(document.createElement("b").appendChild(document.createTextNode("Operator Commands")));
            var chTopicToggle = document.createElement("button");
            chTopicToggle.id = this.Name;
            chTopicToggle.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
            chTopicToggle.onclick = function(){
                toggle("settopic-" + this.id);
            }
            chTopicToggle.appendChild(document.createTextNode("Change Topic"));
            chOpComs.appendChild(chTopicToggle);

            var chTopicForm = document.createElement("form");
            chTopicForm.className = "toggle-md";
            chTopicForm.id = "settopic-" + this.Name;
            var chTopicFormDiv = document.createElement("div");
            chTopicFormDiv.className = "mdl-textfield mdl-js-textfield mdl-textfield--floating-label";
            var chTopicFormInput = document.createElement("input");
            chTopicFormInput.className = "mdl-textfield__input";
            chTopicFormInput.type = "text";
            chTopicFormInput.id = "topictext-" + this.Name;
            chTopicFormDiv.appendChild(chTopicFormInput);
            var chTopicFormLabel = document.createElement("label");
            chTopicFormLabel.className = "mdl-textfield__label";
            chTopicFormLabel.for = "topictext-" + this.Name;
            var chTopicFormLabelText = document.createTextNode("Channel Topic");
            chTopicFormLabel.appendChild(chTopicFormLabelText);
            chTopicFormDiv.appendChild(chTopicFormLabel);
            chTopicForm.appendChild(chTopicFormDiv);
            var chTopicFormButton = document.createElement("button");
            chTopicFormButton.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
            chTopicFormButton.type = "button";
            chTopicFormButton.id = this.Name;
            chTopicFormButton.onclick = function(){
                // break up the active tab's id, which is of form scroll-tab-[channel]
                var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
                var channel = Channels[array[array.length-1]];
                electron.ipcRenderer.send("topic_set", channel, document.getElementById("topictext-" + this.id).innerHTML);
            };
            var chTopicFormButtonLabel = document.createTextNode("Set Chan Topic");
            chTopicFormButton.appendChild(chTopicFormButtonLabel);
            chTopicForm.appendChild(chTopicFormButton);
            chOpComs.appendChild(chTopicForm);
            usrList.appendChild(chOpComs);

            // register search bar with google mdl
            componentHandler.upgradeElements(usrList);

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
                electron.ipcRenderer.send("user_whois", Tabs[channel].Name.toString());
            };
            var comWhoisLabel = document.createTextNode("WHOIS User");
            comWhois.appendChild(comWhoisLabel);
            this.CommandList.appendChild(comWhois);
            // create invite toggle button
            var comInviteToggle = document.createElement("button");
            comInviteToggle.id = tabName;
            comInviteToggle.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
            var comInviteToggleLabel = document.createTextNode("Invite to Channel");
            comInviteToggle.onclick = function(){
                var id = this.id;
                toggle("invite-" + id);
            };
            comInviteToggle.appendChild(comInviteToggleLabel);
            this.CommandList.appendChild(comInviteToggle);
            // create invite form
            var comInviteForm = document.createElement("div");
            comInviteForm.id = "invite-" + tabName;
            comInviteForm.className = "toggle-md";
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
                var chan = $("#inviteChan-" + Channels[array[array.length-1]]).val().toString();
                var user = Tabs[Channels[array[array.length-1]]].Name;
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
}
Tab.prototype.addMessage = function(sender, contents, time){
    //console.log(this.Messages);
    // check if there are any previous messages
    if(this.Messages.length > 0){
        // check if the same user posted both messages
        var prevMessage = this.Messages[this.Messages.length - 1];
    }else{
        var prevMessage = {Author: undefined};
    }
    //console.log(sender);
    if(prevMessage.Author === sender){
        // consecutive messages are separated with a <hr />
        prevMessage.Element.appendChild(document.createElement("hr"));
        // create the message, sharing the previous message's div container.
        this.Messages.push(new Message(sender, contents, time, prevMessage.Element));
    }else{
        // otherwise, make a new div and pass that to the Message object
        var messageDiv = document.createElement("div");
        messageDiv.className = "message";
        this.ChatLog.appendChild(messageDiv);
        this.Messages.push(new Message(sender, contents, time, messageDiv));
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
    // usrEntry.onclick = function(){ newTab(this.innerHTML); };
    usrEntry.onclick = function(){ toggle(this.id + ":coms"); };

    var usrComs = document.createElement("div");
    usrComs.className = "toggle";
    usrComs.id = name.toLowerCase() + "-" + this.Id + ":coms";
    var usrComMsg = document.createElement("button");
    usrComMsg.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
    usrComMsg.onclick = function(){
        console.log(this.parentNode.id.split(":"));
        console.log(document.getElementById(this.parentNode.id.split(":")[0]));
        newTab(document.getElementById(this.parentNode.id.split(":")[0]).innerHTML);
    };
    usrComMsg.appendChild(document.createTextNode("Open Private Chat"));
    usrComs.appendChild(usrComMsg);

    componentHandler.upgradeElements(usrComs);
    this.UserList.appendChild(usrEntry);
    this.UserList.appendChild(usrComs);
}
Tab.prototype.removeUser = function(name){
    delete Users[name.toLowerCase()].Channels[this.Name.toLowerCase()];
    delete this.Users[this.Users.indexOf(name.toLowerCase())];
    this.UserList.removeChild(document.getElementById(name.toLowerCase() + "-" + this.Id));
    this.UserList.removeChild(document.getElementById(name.toLowerCase() + "-" + this.Id + ":coms"));
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
    Channels[this.Id] = null;
    delete Tabs[this.Name.toLowerCase()];
}
function Message(sender, contents, time, div){
    this.Author = sender;
    this.Content = contents;
    this.Timestamp = time;
    this.Element = div;

    if(this.Author == "[System]"){
        // if it's a system message, add the appropriate class.
        this.Element.classList.add("sysmsg");
    }
    if(this.Author == "[MOTD]" || this.Author == "[SERVER]" || this.Timestamp == "topic" || this.Content.toLowerCase().indexOf(UserNick.toLowerCase()) >= 0){
        // if it's a motd, server notice, topic, or contains the user's nick, then increase the importance
        this.Element.classList.add("important");
    }else if(this.Author == "[ERROR]"){
        // if it's an error, then style accordingly
        this.Element.classList.add("error");
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
        if(hypertext.indexOf("](" + link.value + ")") == -1){
            hypertext = hypertext.replace(link.value, "[" + link.value + "](" + link.href + ")");
        }
    }

    hypertext = marked(hypertext, {renderer: MarkedRenderer});

    main.innerHTML = hypertext;
    var meta = document.createElement("p");
    meta.className = "meta";
    var metaText = document.createTextNode(this.Author + " (" + this.Timestamp + "):");
    meta.appendChild(metaText);
    this.Element.appendChild(meta);
    this.Element.appendChild(main);
}
function User(name){
    this.Name = name;
    this.Channels = [];
}

/*
    WEBSOCKET API STUFF
*/
function socketSend(obj){
    electron.ipcRenderer.send("websocket-api-send", obj);
}

electron.ipcRenderer.on("server", function(event, serverId, serverData, uid){
    Server.id = serverId;
    Server.data = serverData;

    if(!Server.data.channels){
        Server.data.channels = [];
    }

    Server.database = database.ref(`${uid}/${Server.id}`);
    Server.channelRef = database.ref(`${uid}/${Server.id}/channels`);

    document.getElementById("server").innerHTML = `${Server.data.server.address} (${Server.data.server.port})`;
    document.title = `Ave IRC Client :: ${Server.data.server.address} (${Server.data.server.port})`;

    Client = new irc.Client(Server.data.server.address, Server.data.user.nickname, {
        port: Server.data.server.port,
        password: Server.data.server.password,
        showErrors: true,
        autoConnect: false,
        encoding: Server.data.encoding,
        userName: Server.data.user.username.toString(),
        realName: Server.data.user.realname.toString(),
        retryCount: Server.data.retry.count,
        retryDelay: Server.data.retry.delay,
        stripColours: Server.data.messages.stripForm,
        floodProtection: Server.data.floodProtect,
        sasl: Server.data.security.secure,
        secure: Server.data.security.secure,
        selfSigned: Server.data.security.badCertsAllowed,
        certExpired: Server.data.security.badCertsAllowed
    });

    // irc error handlers
    // network error
    Client.addListener("netError", function(error){
        if(error.code === "ENOTFOUND"){
            // couldn't connect to the server
            alert("We couldn't find the hostname of the server, and so couldn't connect.\nPlease verify the address and try again.");
        }else{
            alert(`We couldn't connect to the server. (${error})`);
        }
        document.getElementById("loading-m").classList.remove("active");
        document.getElementById("loading").classList.remove("is-active");
        document.getElementById("disconnected-m").classList.add("active");
        socketSend({
            type: "connect",
            payload: {
                status: false,
                server: Server.data.server,
                user: Server.data.user.nickname,
                errorCode: error.code
            }
        });
    });
    // standard irc error
    Client.addListener("error", function(message){
        newMsg(message.args[1], `error: ${message.args[2]}`, "[ERROR]");
        socketSend({
            type: "ircError",
            payload: {
                code: message.toString(),
                target: message.args[1],
                description: message.args[2],
                raw: message
            }
        });
    });

    // initiate connection to the server
    Client.connect();

    // client handlers
    Client.addListener("registered", function(message){
        UserNick = Client.nick;

        document.getElementById("loading-m").classList.remove("active");
        document.getElementById("loading").classList.remove("is-active");

        socketSend({
            type: "connect",
            payload: {
                status: true,
                server: Server.data.server,
                user: Client.nick,
                errorCode: null
            }
        });
        newMsg("%Server", "Connected!", "[System]");

        // if the user set a NickServ password
        if(Server.data.user.password !== ""){
            // identify.
            Client.say("NickServ", `IDENTIFY ${Server.data.user.password}`);
            newMsg("NickServ", "IDENTIFY *redacted*", Client.nick);
        }
        // connect to server channels
        Server.data.channels.forEach(function(channel, index){
            Client.join(channel);
        });
    });

    Client.addListener("message", function(nick, chan, message, raw){
        if(!nick){
            nick = "[SERVER]";
            chan = "%Server";
        }
        if(chan.toLowerCase() === Client.nick.toLowerCase()){
            chan = nick;
        }
        newMsg(chan, message, nick);
    });
    Client.addListener("action", function(nick, chan, action, raw){
        if(!nick){
            nick = "[SERVER]";
            chan = "%Server";
        }
        var message = `**_\*${nick} ${action}_**`;
        if(chan.toLowerCase() === Client.nick.toLowerCase()){
            chan = nick;
        }
        newMsg(chan, message, nick);
    });
    Client.addListener("notice", function(nick, chan, message, raw){
        if(!nick){
            nick = "[SERVER]";
            chan = "%Server";
        }
        if(chan.toLowerCase() === Client.nick.toLowerCase()){
            chan = nick;
        }
        newMsg(chan, message, nick);
    });
    Client.addListener("ctcp-version", function(from, to, raw){
        newMsg("%Server", `${from} has sent you a CTCP VERSION request.`, "[System]");
        Client.ctcp(from, "VERSION", `Ave IRC Client version ${app.getVersion()} https://ave-irc.pw`);
    });

    Client.addListener("topic", function(chan, topic, nick, message){
        newMsg(chan, topic, nick, "topic");
    });

    // connection stuff - joins, parts, names, quits
    Client.addListener("names", function(channel, nicks){
        socketSend({
            type: "namesList",
            payload: {
                channel: channel,
                list: nicks
            }
        });

        /* for in case NAMES was called *after* the initial channel call, we should probably clear
        the existing user list (to prevent duplicates and potentially delete nonapplicable nicks)
        __note that this shouldn't happen often!__*/
        for(user in Tabs[channel.toLowerCase()].Users){
            Tabs[channel.toLowerCase()].removeUser(Tabs[channel.toLowerCase()].Users[user]);
        }

        for(nick in nicks){
            var op = false;
            if("&@~".includes(nicks[nick]) && nicks[nick] !== ""){
                op = true;
            }
            Tabs[channel.toLowerCase()].addUser(nick, op);
        }
    });
    Client.addListener("join", function(channel, nick, message){
        socketSend({
            type: "user",
            payload: {
                action: "join",
                nickname: nick,
                channel: channel,
                raw: message
            }
        });
        newMsg(channel, `${nick} has joined the channel.`, "[System]");
        Tabs[channel.toLowerCase()].addUser(nick);
        if(nick === Client.nick && Server.data.channels.indexOf(channel) === -1){
            Server.data.channels.push(channel);
            Server.channelRef.set(Server.data.channels)
        }
    });
    Client.addListener("nick", function(oldnick, newnick, channels, message){
        var usr = Users[oldnick.toLowerCase()];
        for(index in usr.Channels){
            var channel = usr.Channels[index];
            socketSend({
                type: "user",
                payload: {
                    action: "nick",
                    nickname: [oldnick, newnick],
                    channel: index,
                    raw: message
                }
            });
            var usrEntry = document.getElementById(oldnick.toLowerCase() + "-" + Channels.indexOf(index));
            usrEntry.innerHTML = newnick;
            usrEntry.id = newnick.toLowerCase() + "-" + Channels.indexOf(index);
            newMsg(index, oldnick + " changed their name to " + newnick + ".", "[System]");
        }
        Users[newnick.toLowerCase()] = usr;
        Users.splice(oldnick.toLowerCase(), 1);
    });
    Client.addListener("part", function(channel, nick, reason, message){
        socketSend({
            type: "user",
            payload: {
                action: "part",
                nickname: nick,
                channel: channel,
                raw: message
            }
        });
        if(nick != Client.nick){
            Tabs[channel.toLowerCase()].removeUser(nick);
            newMsg(channel, `${nick} has left the channel (${reason}).`, "[System]");
        }else if(Server.data.channels.indexOf(channel) != -1){
            Server.data.channels.remove(channel);
            Server.channelRef.set(Server.data.channels)
        }
    });
    Client.addListener("kick", function(channel, nick, by, reason, message){
        socketSend({
            type: "user",
            payload: {
                action: "part",
                nickname: nick,
                channel: channel,
                raw: message
            }
        });
        if(nick != Client.nick){
            Tabs[channel.toLowerCase()].removeUser(nick);
            newMsg(channel, `${nick} was kicked by ${by} (${reason}).`, "[System]");
        }else if(Server.data.channels.indexOf(channel) != -1){
            Server.data.channels.remove(channel);
            Server.channelRef.set(Server.data.channels)
        }
    });
    Client.addListener("quit", function(nick, reason, channels, message){
        var usr = Users[nick.toLowerCase()];
        for(index in usr.Channels){
            var channel = usr.Channels[index];
            socketSend({
                type: "user",
                payload: {
                    action: "quit",
                    nickname: nick,
                    channel: index,
                    raw: message
                }
            });
            Tabs[index].removeUser(nick);
        }
    });

    // add handlers for form submits
    $(document).ready(function(){
        //document.getElementById("loading-m").classList.add("active");
        //document.getElementById("loading").classList.add("");

        // if the top bar's clicked, we want to force the chat log to the bottom
        document.getElementById("topbar").addEventListener("click", function(){
            // we should reset the unread message indicator for the active channel (for in case the
            // user just changed it)
            var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
            // get the selected channel name
            var curChan = Channels[array[array.length-1]];
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
            var channel = Channels[array[array.length-1]];
            // *never send an empty message*
            if($("#msg").val() != ""){
                Client.say(channel, $('#msg').val().toString());
                newMsg(channel, $('#msg').val().toString(), Client.nick);
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
            Client.join($("#channel").val().toString().toLowerCase());
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
                if(isChannel(channel)){
                    client.part(channel);
                }
                Server.data.channels.remove(channel);
                Server.channelRef.set(Server.data.channels)
            }catch(err){
                // we couldn't leave the requested chat for some reason. probably a user typo.
                alert("We couldn't leave the chat. Are you sure you spelled it correctly?")
                console.log("chat leave error: ", err);
            }
            // override Chromium behaviour
            return false;
        });
        $('#pmUsr').submit(function(){
            Client.say($("#pmNick").val().toString(), $("#pmMsg").val().toString());
            newMsg($("#pmNick").val().toString(), $("#pmMsg").val().toString(), Client.nick);
            // override Chromium behaviour
            return false;
        });
        $('#changeNick').submit(function(){
            Client.send("NICK", $("#newNick").val().toString());
            // override Chromium behaviour
            return false;
        });

        $('#rc').submit(function(){
            Client.disconnect("Reconnecting");
            newMsg("%Server", "Reconnecting...", "[SYSTEM]");
            document.getElementById("disconnected-m").classList.remove("active");
            document.getElementById("loading-m").classList.add("active");
            document.getElementById("loading").classList.add("is-active");
            Client.connect();
            // override Chromium behaviour
            return false;
        });
        $('#dc').submit(function(){
            Client.disconnect($("#dcReason").val().toString());
            document.getElementById("disconnected-m").classList.add("active");
            // override Chromium behaviour
            return false;
        });

        window.onbeforeunload = closingCode;
        function closingCode(){
           Client.disconnect("Client quit.");
           socketSend({
               type: "connect",
               payload: {
                   status: false,
                   server: Server.data.server,
                   user: Server.data.user.nickname,
                   errorCode: null
               }
           });
           return null;
        }
    });
});

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

// open a new tab
function newTab(tabName){
    // only create a new tab if there isn't one already
    if(Tabs[tabName.toLowerCase()] === undefined){
        // add it to the tab list
        cID++;
        Channels.push(tabName.toLowerCase());
        Tabs[tabName.toLowerCase()] = new Tab(tabName, cID);
    }
}
// add a new message to a tab
function newMsg(channel, message, sender, time=null){
    //console.log(sender);
    try{
        if(!time){
            var d = new Date();
            time = d.toUTCString();
        }

        socketSend({
            type: "message",
            payload: {
                channel: channel,
                sender: sender,
                content: message,
                timestamp: time
            }
        });

        channel = channel.toLowerCase();

        var tab = document.getElementById("content");
        // allow 1px inaccuracy by adding 1
        var isScrolledToBottom = tab.scrollHeight - tab.clientHeight <= tab.scrollTop + 1;

        if(channel !== "%server"){
            Tabs[channel].addMessage(sender, message, time);
        }else{
            /* var msg =
            document.getElementById('Messages:%Server'). */
            // TODO: sort this server message script out.
        }

        // if it's a private chat, and the message is from the other person, make sure the tab's proper name matches the capitalisation of the person's nick.
        if(!isChannel(channel) && sender.toLowerCase() === channel){
            Tabs[channel].Name = sender;
        }

        // if it was posted to the current channel, we should bump the scroll
        var array = $('.mdl-layout__tab-panel.is-active').attr("id").split("-");
        // get the selected channel name
        var curChan = Channels[array[array.length-1]];
        if(curChan == channel){
            // scroll to bottom if isScrolledToBottom, if the channel is selected that the message was posted to
            if(isScrolledToBottom){
                tab.scrollTop = tab.scrollHeight;
            }
        }else{
            // otherwise, we should probably increase the badge of the actual channel
            // set the badge to its value + 1.
            Tabs[channel].Badge.setAttribute("data-badge", String(Number(Tabs[channel].Badge.getAttribute("data-badge")) + 1));
        }
    }catch(err){
        /* if the channel doesn't have a tab, it will probably raise an error. therefore, if we assume that
        this error was caused by that, we should get away with it (let's face it - it probably was) */
        console.log("error in newMsg function. assuming nonexistant tab. creating new tab.", err);
        newTab(channel);
        newMsg(channel, message, sender, time);
    }
}
