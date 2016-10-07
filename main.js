const {app, BrowserWindow, Menu, ipcMain, shell} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;
let about;
let aboutCon;
let contents;
let client;

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

var conState = 0;

function newWindow(){
    win = new BrowserWindow({width: 900, height: 600});
    contents = win.webContents;

    win.loadURL("file://" + __dirname + "/app/connect.html");

    contents.on("did-finish-load", function(){
        ipcMain.on("connect", function(event, server, port, nick){
            win.loadURL("file://" + __dirname + "/app/client.html");

            contents.on('new-window', function(e, url) {
                e.preventDefault();
                shell.openExternal(url);
            });

            contents.on("did-finish-load", function(){
                contents.send("set", server);
                try {
                    client = new irc.Client(server, nick, {
                        port: port,
                        showErrors: true,
                        encoding: "UTF-8"
                     });
                }catch(err){
                    sendMsg("sys", 'error: ' + err.toString(), "[System]");
                }

                ipcMain.on("about", function(event){
                    about = new BrowserWindow({width:900, height:600});
                    aboutCon = about.webContents;

                    about.loadURL("file://" + __dirname + "/app/about.html");

                    aboutCon.on('new-window', function(e, url) {
                        e.preventDefault();
                        shell.openExternal(url);
                    });

                    about.on("closed", function(){
                        about = null;
                    });
                });

                contents.send("pingchan", "woop!!");
                sendMsg("sys", "Connecting to IRC server...", "[System]");

                ipcMain.on("sendmsg", function(event, channel, message){
                    if(channel != "sys"){
                        client.say(channel, message);
                        sendMsg(channel, message, client.nick);
                    }
                });
                ipcMain.on("join", function(event, channel){
                    client.join(channel);
                });

                client.addListener("message", function (nick, chan, message, raw){
                    if(chan != client.nick){
                        sendMsg(chan, message, nick);
                    }else{
                        sendMsg(nick, message, nick);
                    }
                });
                client.addListener("action", function (nick, chan, action, raw){
                    var message = "<b> * " + nick + " " + action + "</b>";
                    if(chan != client.nick){
                        sendMsg(chan, message, nick);
                    }else{
                        sendMsg(nick, message, nick);
                    }
                });
                client.addListener("notice", function (nick, chan, message, raw){
                    if(nick == null){
                        nick = "[SERVER]";
                        chan = "sys";
                    }
                    if(chan != client.nick){
                        sendMsg(chan, message, nick);
                    }else{
                        sendMsg(nick, message, nick);
                    }
                });

                client.addListener("topic", function (chan, topic, nick, message){
                    contents.send("topic", chan, topic, nick);
                });

                client.addListener("registered", function(message){
                    contents.send("user", client.nick);
                    sendMsg("sys", "Connected!", "[System]");
                    client.join("#ave-irc");
                });

                // connection stuff - joins, parts, names, quits
                client.addListener("names", function(channel, nicks){
                    contents.send("names", channel, nicks);
                });
                client.addListener("join", function(channel, nick, message){
                    contents.send("adNick", channel, nick);
                    sendMsg(channel, nick + " has joined the channel.", "[System]");
                });
                client.addListener("nick", function(oldnick, newnick, channels, message){
                    for(chan in channels){
                        chan = channels[chan];
                        contents.send("chNick", oldnick, newnick, chan);
                        sendMsg(chan, oldnick + " changed their name to " + newnick + ".", "[System]");
                    }
                });
                client.addListener("+mode", function(channel, by, mode, argument, message){
                    if(mode == "o"){
                        sendMsg(channel, by + " ascended " + argument + " to operator.", "[System]");
                        contents.send("opNick", channel, argument);
                    }else{
                        if(by != undefined){
                            sendMsg(channel, by + " set the " + mode + " mode on " + channel + "/" + argument + ".", "[System]");
                        }
                    }
                });
                client.addListener("-mode", function(channel, by, mode, argument, message){
                    if(mode == "o"){
                        sendMsg(channel, by + " stripped " + argument + " of operator perks.", "[System]");
                        contents.send("deopNick", channel, argument);
                    }else{
                        if(by != undefined){
                            sendMsg(channel, by + " removed the " + mode + " mode on " + channel + "/" + argument + ".", "[System]");
                        }
                    }
                });
                client.addListener("part", function(channel, nick, reason, message){
                    contents.send("rmNick", channel, nick);
                    sendMsg(channel, nick + " has left the channel (" + reason + ").", "[System]");
                });
                client.addListener("kick", function(channel, nick, by, reason, message){
                    contents.send("rmNick", channel, nick);
                    sendMsg(channel, nick + " was kicked from the channel by " + by + " (" + reason + ").", "[System]");
                });
                client.addListener("quit", function(nick, reason, channels, message){
                    for(chan in channels){
                        chan = channels[chan];
                        contents.send("rmNick", chan, nick);
                        sendMsg(chan, nick + " has quit the server (" + reason + ").", "[System]");
                    }
                });
                client.addListener("kill", function(nick, reason, channels, message){
                    for(chan in channels){
                        chan = channels[chan];
                        contents.send("rmNick", chan, nick);
                        sendMsg(chan, nick + " was kicked from the server (" + reason + ").", "[System]");
                    }
                });

                client.addListener("motd", function(motd){
                    var motd = motd.replaceAll("\n", " <br />");
                    sendMsg("sys", motd, "[MOTD]");
                });

                client.addListener("whois", function(info){
                    var whois = "";
                    whois += "WHOIS response for user '" + info.nick + "' (" + info.user + ")<br />";
                    whois += "Connecting from host " + info.host + " at " + info.server + "<br />";
                    whois += "Real name is " + info.realname + "<br />";
                    var chans = "";
                    for(channel in info.channels){
                        chans += info.channels[channel] + " ";
                    }
                    whois += "User is currently chatting in the following channels: " + chans;
                    if(info.operator == "is an IRC Operator"){
                        whois += "<br /><b>This user is an IRC operator.";
                    }
                    sendMsg("sys", whois, "[System]");
                });

                client.addListener("invite", function(channel, from, message){
                    sendMsg("sys", "You have been invited to the " + channel + " channel, by " + from + "!", "[SERVER]");
                    contents.send("inv", channel, from);
                });

                client.addListener('error', function(message) {
                    if(message["command"] == "err_nosuchnick"){
                        sendMsg("sys", 'error: No suck nick.', "[ERROR]");
                    }else{
                        sendMsg("sys", 'error: ' + message["command"], "[ERROR]");
                    }
                });
            });
        });


    });

    win.on("closed", function(){
        client.disconnect("testing");
        win = null;
    });
}

function sendMsg(channel, content, sender){
    if(contents !== null){
        var d = new Date();
        contents.send("newmsg", channel, content, sender, d.toUTCString());
        // contents.send("newmsg", channel, "<p>" + content + "</p><p class=\"meta\">" + sender + "; " + d.toUTCString() + "</p>");
    }
}

function addUser(username, perms){
    contents.send("addusr", username + "|" + perms);
}

app.on("ready", newWindow);

// all windows closed; quit
app.on("window-all-closed", function(){
    // account for standard macOS operation
    if(process.platform !== "darwin"){
        app.quit();
    }
});

app.on("activate", function(){
    // more mac specific stuff
    if(win == null){
        newWindow();
    }
});
