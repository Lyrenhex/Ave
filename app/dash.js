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

const electron = require("electron");
const fs = require("fs");

var Servers = [];

var servers = fs.readdirSync("servers/");
servers.sort();
for(server in servers){
    Servers.push(JSON.parse(fs.readFileSync("servers/" + servers[server], "utf-8")));
}

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');

$(document).ready(function(){
    var grid = document.getElementById("serverGrid");
    Servers.forEach(function(server, index){
        var channels = "";
        server.channels.forEach(function(channel, index){
            if(index !== 0){
                channels += ", ";
            }
            channels += channel;
        });

        var cell = document.createElement("div");
        cell.className = "mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop";

        var card = document.createElement("div");
        card.className = "sCard";
        card.id = index;

        var nick = document.createElement("h2");
        nick.appendChild(document.createTextNode(server.user.nickname));
        card.appendChild(nick);

        var addr = document.createElement("h3");
        addr.appendChild(document.createTextNode(`${server.server.address} (${server.server.port})`));
        card.appendChild(addr);

        var chans = document.createElement("p");
        chans.appendChild(document.createTextNode(channels));
        card.appendChild(chans);

        var editBtn = document.createElement("button");
        editBtn.className = "mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect";
        editBtn.id = `${index}-edit`;
        var editBtnIco = document.createElement("i");
        editBtnIco.className = "material-icons";
        editBtnIco.appendChild(
            document.createTextNode("edit")
        );
        editBtn.appendChild(editBtnIco);
        editBtn.onclick = function(e){
            window.location = `connect.html?serv=${this.id.split("-")[0]}`;
            e.stopPropagation();
        }

        var delBtn = document.createElement("button");
        delBtn.className = "mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect";
        delBtn.id = `${index}-del`;
        var delBtnIco = document.createElement("i");
        delBtnIco.className = "material-icons";
        delBtnIco.appendChild(
            document.createTextNode("delete")
        );
        delBtn.appendChild(delBtnIco);
        delBtn.onclick = function(e){
            fs.unlink(`servers/${this.id.split("-")[0]}.json`, function(err){
                if(err){
                    console.log("Couldn't delete server", err);
                }
            });
            this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);
            console.log(this.parentNode.parentNode.parentNode);
            e.stopPropagation();
        }

        card.appendChild(editBtn);
        card.appendChild(delBtn);

        card.onclick = function(){
            electron.ipcRenderer.send("server", this.id, Servers[this.id]);
            // reload the page every 20 seconds so that we get the latest information (such as if servers have new channels now)
            setInterval(location.reload(), 20000);
        };

        cell.appendChild(card);

        grid.insertBefore(cell, document.getElementById("nsCell"));
    });
});
