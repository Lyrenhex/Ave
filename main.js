const {app, BrowserWindow, Menu, ipcMain} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;
let contents;
let client;

function newWindow(){
    win = new BrowserWindow({width: 900, height: 600});
    contents = win.webContents;

    win.loadURL("file://" + __dirname + "/app/index.html");

    contents.on("did-finish-load", function(){
        contents.send("pingchan", "woop!!");
        sendMsg("sys", "This is a test message.", "[System]");
        sendMsg("sys", "Connecting to IRC server...", "[System]");

        client = new irc.Client("orwell.freenode.net", "AveTest");
        sendMsg("sys", "Connected!", "[System]");

        ipcMain.on("sendmsg", function(event, recipient, type, message){
            sendMsg("sys", "received " + message, "[System]", "test");
            sendMsg("sys", message, type, type);
        });

        client.addListener("message", function (nick, chan, message, raw){
            sendMsg(chan, message, nick);
        });

        client.addListener("join", function(channel, nick, message){
            contents.send("join", channel, nick, message);
        });

        client.addListener("registered", function(message){
            client.join("#ave-irc");
        });

        client.addListener("names", function(channel, nicks){
            contents.send("names", channel, nicks);
        });

        client.addListener('error', function(message) {
            sendMsg("sys", 'error: ' + message.toString(), "[System]");
        });
    });

    win.on("closed", function(){
        client.send("QUIT", "testing");
        win = null;
    });
}

function sendMsg(channel, content, sender, bgcolour="white"){
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
