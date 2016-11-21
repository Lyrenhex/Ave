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



var ico = `${__dirname}/app/res/img/icon.ico`;

function newWindow(){
    this.win = new BrowserWindow({
        width: 900,
        height: 700,
        icon: ico
    });

    this.contents = this.win.webContents;

    this.win.loadURL(`file://${__dirname}/app/dash.html`);

    ipcMain.on("server", serverId, serverData){
        this.win.loadURL(`file://${__dirname}/app/client.html`);
        this.contents.on("did-finish-load", function(){
            this.contents.send("server", serverId, serverData);
        });
    }

    this.win.on("closed", function(){
        this.win = null;
    })
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
