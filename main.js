const {app, BrowserWindow, Menu} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;
let contents;

function newWindow(){
    win = new BrowserWindow({width: 800, height: 600});
    contents = win.webContents;

    win.loadURL("file://" + __dirname + "/app/index.html");

    contents.on("did-finish-load", function(){
        contents.send("pingchan", "woop!!");
        contents.send("newmsg", "<p>Hey, Damo!</p><p class=\"meta\">Meepers42, 22:38 26/09/2016 <span class=\"msgId\">#3</span></p>");
        sendMsg("This is a test message.", "sysTest", "22:55 26/09/2016");
    });

    win.on("closed", function(){
        win = null;
    });
}

function sendMsg(content, sender, time){
    if(contents !== null){
        contents.send("newmsg", "<p>" + content + "</p><p class=\"meta\">" + sender + ", " + time + "</p>");
    }
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
