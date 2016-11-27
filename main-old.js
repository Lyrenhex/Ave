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

if(require('electron-squirrel-startup')) return;

const {app, BrowserWindow, Menu, ipcMain, shell} = require("electron");
const irc = require("irc");
const fs = require("fs");

// prevent JS garbage collector killing the window.
let win;
let opWin;
let opWinC;
let ext;
let extCon;
let contents;
let client;

// extend the string prototype to give us a bit more flexibility
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

var ico = __dirname + "/app/res/img/icon.ico";

function newWindow(){
    win = new BrowserWindow({width: 900, height: 700, icon: ico});
    contents = win.webContents;

    // win.loadURL("file://" + __dirname + "/app/connect.html");
    win.loadURL("file://" + __dirname + "/app/dash.html");

    // handle when we get the connection data
    ipcMain.on("server_connect", function(event, connDat, servId){
        win.loadURL("file://" + __dirname + "/app/client.html");

        contents.on('new-window', function(e, url) {
            e.preventDefault();
            shell.openExternal(url);
        });

        contents.on("did-finish-load", function(){
            contents.send("set_logging", connDat.messages.log);
            contents.send("set_server", connDat.server.address + " (" + connDat.server.port + ")", servId);
            try {
                // try create IRC client object
                client = new irc.Client(connDat.server.address, connDat.user.nickname, {
                    port: connDat.server.port,
                    password: connDat.server.password,
                    showErrors: true,
                    autoConnect: false,
                    encoding: connDat.encoding,
                    userName: connDat.user.username,
                    realName: connDat.user.realname.toString(),
                    retryCount: connDat.retry.count,
                    retryDelay: connDat.retry.delay,
                    stripColours: connDat.messages.stripForm,
                    floodProtection: connDat.floodProtect,
                    sasl: connDat.security.secure,
                    secure: connDat.security.secure,
                    selfSigned: connDat.security.badCertsAllowed,
                    certExpired: connDat.security.badCertsAllowed
                 });
            }catch(err){
                // tell the user that something went wrong
                contents.send("log", err);
                sendMsg("!sys", 'error: ' + err.toString(), "[ERROR]");
            }

            /*
                 IRC ERROR HANDLERS
            */
            {
                // on network error (fail to connect, etc.
                client.addListener("netError", function(error){
                    if(error.code == "ENOTFOUND"){
                        // couldn't connect to server, so tell the user.
                        sendMsg("!sys", "Connection failed: Could not find host \"" + error.hostname + "\"  \nPlease check that the address is correct and you have a working internet connection, then try restarting the client.", "[ERROR]");
                    }else{
                        // otherwise, send a fairly generic disconnect error :)
                        contents.send("server_disconnect", error);
                    }
                    // log the error details for debugging.
                    contents.send("log", error);
                });
                // on standard IRC error from server
                client.addListener('error', function(message) {
                    // send the parsed data from the server (which kindly provides human-readable summaries :D)
                    sendMsg(message.args[1], "error: " + message.args[2], "[ERROR]");
                    // log it anyway though, because data's always helpful.
                    contents.send("log", message);
                });
            }

            sendMsg("!sys", "Connecting to IRC server...", "[System]");
            client.connect()

            /*
                RENDER -> MAIN THREAD HANDLERS
            */
            {
                ipcMain.on("server_command", function(event, command){
                    client.send(command);
                });

                ipcMain.on("topic_set", function(event, channel, newtopic){
                    client.send("TOPIC", channel, newtopic);
                });

                // user requested a reconnect attempt...
                ipcMain.on("server_reconnect", function(event){
                    client.disconnect("Reconnecting");
                    sendMsg("!sys", "Reconnecting...", "[SYSTEM]");
                    client.connect();
                });
                // user requested a manual disconnect from server.
                ipcMain.on("server_disconnect", function(event, reason){
                    client.disconnect(reason);
                    contents.send("server_disconnect", "User requested disconnect.");
                });

                ipcMain.on("client_about", function(event){
                    ext = new BrowserWindow({width:900, height:600, icon: ico});
                    extCon = ext.webContents;

                    ext.loadURL("file://" + __dirname + "/app/about.html");

                    extCon.on('new-window', function(e, url) {
                        e.preventDefault();
                        shell.openExternal(url);
                    });

                    ext.on("closed", function(){
                        ext = null;
                    });
                });
                ipcMain.on("client_help", function(event){
                    ext = new BrowserWindow({width:900, height:600, icon: ico});
                    extCon = ext.webContents;

                    ext.loadURL("file://" + __dirname + "/app/help/index.html");

                    extCon.on('new-window', function(e, url) {
                        e.preventDefault();
                        shell.openExternal(url);
                    });

                    ext.on("closed", function(){
                        ext = null;
                    });
                });
                ipcMain.on("client_ops_suite", function(event){
                    opWin = new BrowserWindow({width:900, height:600, icon: ico});
                    opWinC = opWin.webContents;

                    opWin.loadURL("file://" + __dirname + "/app/oper.html");

                    opWinC.on('new-window', function(e, url) {
                        e.preventDefault();
                        shell.openExternal(url);
                    });

                    opWin.on("closed", function(){
                        opWin = null;
                        opWinC = null;
                    });
                });

                ipcMain.on("channel_join", function(event, channel){
                    client.join(channel);
                });
                ipcMain.on("channel_part", function(event, channel){
                    if(channel.indexOf("#") == 0){
                        client.part(channel);
                    }
                    connDat.channels.remove(channel);
                    // convert it to a JSON array
                    var jsonSettings = JSON.stringify(connDat, null, 4);
                    // write it to a file, to persist for next time
                    fs.writeFile("servers/" + connDat.server.address + '.json', jsonSettings, 'utf8', function(err) {
                        if(err) {
                            console.log("couldn't write settings to json file: ", err);
                        } else {
                            console.log("settings saved as json: " + connDat.server.address + ".json");
                        }
                    });
                });
                ipcMain.on("nick_change", function(event, newnick){
                    client.send("NICK", newnick);
                });

                ipcMain.on("user_whois", function(event, whois){
                    client.send("WHOIS", whois);
                });

                ipcMain.on("message_send", function(event, channel, message){
                    // if message starts with ":", run JS code.
                    if(message.charAt(0) == ":"){
                        message = message.substring(1);
                        eval(message);
                    }else if(message.charAt(0) == "/"){
                        sendMsg(channel, "Your message started with a `/`, and therefore was **not** sent to the server. If you were trying to execute a command, please be aware that this client is not command-centric. Why not take a look at the welcome page of Ave, and check out the supported commands in the command list (click the hamburger icon in the top left).", "[ERROR]");
                    }else if(channel != "!sys"){
                        client.say(channel, message);
                        sendMsg(channel, message, client.nick);
                    }
                });

                ipcMain.on("mode", function(event, user, mode, channel){
                    client.send("MODE", channel, mode, user);
                });
            }

            client.addListener("registered", function(message){
                contents.send("set_user", client.nick);
                sendMsg("!sys", "Connected!", "[System]");
                contents.send("loading_end");
                // if the user set a NickServ password
                if(connDat.user.password != ""){
                    // identify with NickServ
                    client.say("NickServ", "IDENTIFY " + connDat.user.password)
                    sendMsg("NickServ", "IDENTIFY ********", client.nick)
                }
                connDat.channels.forEach(function(channel, index){
                    client.join(channel);
                });
                // client.join("#ave-irc");
            });

            client.addListener("message", function (nick, chan, message, raw){
                if(chan != client.nick.toLowerCase()){
                    sendMsg(chan, message, nick);
                }else{
                    sendMsg(nick, message, nick);
                }
            });
            client.addListener("selfMessage", function (to, text){
                contents.send("log", [to, text]);
            });
            client.addListener("action", function (nick, chan, action, raw){
                var message = "**_ \* " + nick + " " + action + "_**";
                if(chan != client.nick.toLowerCase()){
                    sendMsg(chan, message, nick);
                }else{
                    sendMsg(nick, message, nick);
                }
            });
            client.addListener("notice", function (nick, chan, message, raw){
                if(nick == null){
                    nick = "[SERVER]";
                    chan = "!sys";
                }
                if(chan != client.nick){
                    sendMsg(chan, message, nick);
                }else{
                    sendMsg(nick, message, nick);
                }
            });
            client.addListener("ctcp-version", function (from, to, raw){
                sendMsg("!sys", from + " has sent you a CTCP VERSION request.", "[SYSTEM]")
                client.ctcp(from, "VERSION", "Ave IRC Client version " + app.getVersion() + " http://ave-irc.pw");
            });

            client.addListener("topic", function (chan, topic, nick, message){
                contents.send("message_topic", chan, topic, nick);
            });

            // connection stuff - joins, parts, names, quits
            client.addListener("names", function(channel, nicks){
                contents.send("user_names", channel, nicks);
            });
            client.addListener("join", function(channel, nick, message){
                contents.send("user_add", channel, nick);
                sendMsg(channel, nick + " has joined the channel.", "[System]");
                if(nick == client.nick && connDat.channels.indexOf(channel) == -1){
                    connDat.channels.push(channel);
                    // convert it to a JSON array
                    var jsonSettings = JSON.stringify(connDat, null, 4);
                    // write it to a file, to persist for next time
                    fs.writeFile("servers/" + servId + '.json', jsonSettings, 'utf8', function(err) {
                        if(err) {
                            console.log("couldn't write settings to json file: ", err);
                        } else {
                            console.log("settings saved as json: " + servId + ".json");
                        }
                    });
                }
            });
            client.addListener("nick", function(oldnick, newnick, channels, message){
                for(chan in channels){
                    chan = channels[chan];
                    contents.send("user_change", oldnick, newnick, chan);
                    // sendMsg(chan, oldnick + " changed their name to " + newnick + ".", "[System]");
                }
            });

            /* modes
            v - voice
            o - op
            b - ban
            */
            client.addListener("+mode", function(channel, by, mode, argument, message){
                if(mode == "o"){
                    sendMsg(channel, by + " ascended " + argument + " to operator.", "[System]");
                }else if(mode == "v"){
                    sendMsg(channel, by + " gave voice to " + argument + ".", "[System]");
                }else if(mode == "b"){
                    sendMsg(channel, by + " banned " + argument + ".", "[System]");
                    console.log(message);
                }else{
                    if(by != undefined){
                        sendMsg(channel, by + " set the " + mode + " mode on " + channel + "/" + argument + ".", "[System]");
                    }
                }
            });
            client.addListener("-mode", function(channel, by, mode, argument, message){
                if(mode == "o"){
                    sendMsg(channel, by + " stripped " + argument + " of operator perks.", "[System]");
                    contents.send("user_op_remove", channel, argument);
                }else if(mode == "v"){
                    sendMsg(channel, by + " stripped voice from " + argument + ".", "[System]");
                }else if(mode == "b"){
                    sendMsg(channel, by + " unbanned " + argument + ".", "[System]");
                    console.log(message);
                }else{
                    if(by != undefined){
                        sendMsg(channel, by + " removed the " + mode + " mode on " + channel + "/" + argument + ".", "[System]");
                    }
                }
            });
            client.addListener("part", function(channel, nick, reason, message){
                if(nick != client.nick){
                    contents.send("user_remove", channel, nick);
                    sendMsg(channel, nick + " has left the channel (" + reason + ").", "[System]");
                }else if(connDat.channels.indexOf(channel) != -1){
                    connDat.channels.remove(channel);
                    // convert it to a JSON array
                    var jsonSettings = JSON.stringify(connDat, null, 4);
                    // write it to a file, to persist for next time
                    fs.writeFile("servers/" + servId + '.json', jsonSettings, 'utf8', function(err) {
                        if(err) {
                            console.log("couldn't write settings to json file: ", err);
                        } else {
                            console.log("settings saved as json: " + servId + ".json");
                        }
                    });
                }
            });
            client.addListener("kick", function(channel, nick, by, reason, message){
                contents.send("user_remove", channel, nick);
                sendMsg(channel, nick + " was kicked from the channel by " + by + " (" + reason + ").", "[System]");
                if(nick == client.nick && connDat.channels.indexOf(channel) != -1){
                    connDat.channels.remove(channel);
                    // convert it to a JSON array
                    var jsonSettings = JSON.stringify(connDat, null, 4);
                    // write it to a file, to persist for next time
                    fs.writeFile("servers/" + servId + '.json', jsonSettings, 'utf8', function(err) {
                        if(err) {
                            console.log("couldn't write settings to json file: ", err);
                        } else {
                            console.log("settings saved as json: " + servId + ".json");
                        }
                    });
                }
            });
            client.addListener("quit", function(nick, reason, channels, message){
                contents.send("user_quit", nick, channels, reason);
            });
            client.addListener("kill", function(nick, reason, channels, message){
                contents.send("user_quit", nick, channels, "Kicked from Server (" + reason + ")");
            });

            client.addListener("motd", function(motd){
                var motd = motd.replaceAll("\n", "  \n");
                sendMsg("!sys", motd, "[MOTD]");
            });

            client.addListener("whois", function(info){
                var whois = "";
                whois += "WHOIS response for user '" + info.nick + "' (" + info.user + ")  \n";
                whois += "Connecting from host " + info.host + " at " + info.server + "  \n";
                whois += "Real name is " + info.realname + "  \n";
                var chans = "";
                for(channel in info.channels){
                    chans += info.channels[channel] + " ";
                }
                whois += "User is currently chatting in the following channels: " + chans;
                if(info.operator == "is an IRC Operator"){
                    whois += "  \n**This user is an IRC operator.**";
                }
                sendMsg(info.nick, whois, "[System]");
            });

            client.addListener("invite", function(channel, from, message){
                // notify the user
                sendMsg("!sys", "You have been invited to the " + channel + " channel, by " + from + "!", "[SERVER]");
                // alert the client that they have a pending invite!
                contents.send("channel_invite", channel, from);
            });
        });
    });

    win.on("closed", function(){
        try{
            // kill the connection
            client.disconnect("Client quit.");
        }catch(e){
            // don't do anything; the user probably left on the connection screen.
        }
        win = null;
    });
}

function sendMsg(channel, content, sender, noFix=false){
    if(content !== null){
        var d = new Date();
        // instruct the render process to handle the new message
        contents.send("message_add", channel, content, sender, d.toUTCString(), noFix);
    }
}

// when we're clear, start doing stuff
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
