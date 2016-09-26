const {app, BrowserWindow, Menu} = require("electron");
const irc = require("irc");

// prevent JS garbage collector killing the window.
let win;

function newWindow(){
    win = new BrowserWindow({width: 800, height: 600});

    win.loadURL("file://" + __dirname + "/app/index.html");

    win.on("closed", function(){
        win = null;
    });
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
