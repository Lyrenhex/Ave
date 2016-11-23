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

const {app, BrowserWindow, ipcMain, shell} = require("electron");

let windows = [];
let mainWin;

var ico = `${__dirname}/app/res/img/icon.ico`;

function start(){
    mainWin = new BrowserWindow({
        width: 900,
        height: 700,
        icon: ico
    });

    mainWin.loadURL(`file://${__dirname}/app/dash.html`);

    var that = this;

    ipcMain.on("server", function(event, serverId, serverData){
        windows.push(new Window(serverId, serverData));
    });
}

function Window(serverId, serverData){
    this.win = new BrowserWindow({
        width: 900,
        height: 700,
        icon: ico
    });

    this.contents = this.win.webContents;

    this.win.loadURL(`file://${__dirname}/app/client.html`);

    var that = this;

    this.contents.on("did-finish-load", function(){
        that.contents.send("server", serverId, serverData);
    });

    /*
    TODO: on 'websocket-api-send', send to the websocket server, and identify with a server id (from windows list?)

    We need to start the webserver before this, though!
    */
    this.contents.on("")

    this.win.on("closed", function(){
        this.win = null;
    })
}

app.on("ready", start);

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
        start();
    }
});
