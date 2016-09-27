const {app, BrowserWindow, Menu} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;
let contents;
let client;

function newWindow(){
    win = new BrowserWindow({width: 800, height: 600});
    contents = win.webContents;

    win.loadURL("file://" + __dirname + "/app/index.html");

    contents.on("did-finish-load", function(){
        contents.send("pingchan", "woop!!");
        contents.send("newmsg", "<p>Hey, Damo!</p><p class=\"meta\">Meepers42, 22:38 26/09/2016 <span class=\"msgId\">#3</span></p>");
        sendMsg("This is a test message.", "Sys", "SystemTest");
        sendMsg("Connecting to IRC server...", "Sys", "System");

        client = new irc.Client("orwell.freenode.net", "AveTest");
        sendMsg("Connected!", "Sys", "System");

        client.addListener("message", function (from, to, message){
            sendMsg(message, to, from);
        });

        client.addListener('error', function(message) {
            sendMsg('error: ' + message.toString(), "Sys", "ErrHandler");
        });
    });

    win.on("closed", function(){
        client.send("QUIT", "testing");
        win = null;
    });
}

function sendMsg(content, recip, sender, bgcolour="white"){
    if(contents !== null){
        var d = new Date();
        contents.send("newmsg", "<p>" + content + "</p><p class=\"meta\">" + sender + "; " + d.toUTCString() + "</p>");
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
