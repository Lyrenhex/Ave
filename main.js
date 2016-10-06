const {app, BrowserWindow, Menu, ipcMain, shell} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;
let contents;
let client;

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

                contents.send("pingchan", "woop!!");
                sendMsg("sys", "Connecting to IRC server...", "[System]");

                ipcMain.on("sendmsg", function(event, channel, message){
                    if(channel != "sys"){
                        client.say(channel, message);
                        sendMsg(channel, message, client.nick);
                    }
                });

                client.addListener("message", function (nick, chan, message, raw){
                    if(chan != client.nick){
                        sendMsg(chan, message, nick);
                    }else{
                        sendMsg(nick, message, nick);
                    }
                });
                client.addListener("topic", function (chan, topic, nick, message){
                    contents.send("topic", chan, topic, nick);
                });

                client.addListener("join", function(channel, nick, message){
                    sendMsg(channel, nick + " has joined the channel.", "[System]");
                });

                client.addListener("registered", function(message){
                    contents.send("user", client.nick);
                    sendMsg("sys", "Connected!", "[System]");
                    client.join("#ave-irc");
                });

                client.addListener("names", function(channel, nicks){
                    contents.send("names", channel, nicks);
                });
                client.addListener("part", function(channel, nick, reason, message){
                    contents.send("rmNick", channel, nick);
                    sendMsg(channel, nick + " has left the channel (" + reason + ").", "[System]");
                });

                client.addListener('error', function(message) {
                    if(message["command"] == "err_nosuchnick"){
                        sendMsg("sys", 'error: No suck nick.', "[System]");
                    }else{
                        sendMsg("sys", 'error: ' + message["command"], "[System]");
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
