const electron = require("electron");
const fs = require("fs");

// ensure server folder already exists
fs.mkdir("servers", 0777, function(err){
        if(err){
            if(err.code == "EEXIST"){
                // do nothing; folder already exists
            }else{
                console.log("Unable to create servers folder", err);
            }
        }
});

var Servers = [];
var servers = fs.readdirSync("servers/");
for(server in servers){
    Servers.push(JSON.parse(fs.readFileSync("servers/" + servers[server], "utf-8")));
}

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');

// handle form togglers
function toggle(id){
    var element = document.getElementById(id);
    if(element.classList.contains("shown")){
        // if shown, hide it
        element.classList.remove("shown");
    }else{
        // otherwise, show it
        element.classList.add("shown");
    }
}

$(document).ready(function(){
    /* try{
        var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
        popFields(settings);
    }catch(err){
        console.log("unable to open settings.json; probably first run:", err);
    } */

    var serverList = document.getElementById("serverList");
    Servers.forEach(function(server, index){
        console.log(Servers);
        console.log(server);
        var serverEntry = document.createElement("button");
        serverEntry.className = "mdl-button mdl-js-button mdl-js-ripple-effect";
        var serverText = document.createTextNode(server.user.nickname + " @ " + server.server.address + " (" + server.server.port + ")");
        serverEntry.appendChild(serverText);
        serverEntry.id = index;
        serverEntry.onclick = function(){
            popFields(Servers[this.id]);
        }

        componentHandler.upgradeElement(serverEntry);
        serverList.appendChild(serverEntry);
    });

    $('#connect').submit(function(){
        // set up the settings array
        var settings = {
            server: {
                address: $("#server").val(),
                port: $("#port").val()
            },
            user: {
                nickname: $("#nick").val(),
                username: $("#username").val(),
                realname: $("#realname").val(),
                password: $("#nsPass").val()
            },
            encoding: $("#encoding").val(),
            retry: {
                count: $("#retryCount").val(),
                delay: $("#retryDelay").val()
            },
            messages: {
                stripForm: $("#clearColours").is(":checked"),
                log: $("#logMessages").is(":checked")
            },
            floodProtect: $("#floodProtect").is(":checked")
        };
        electron.ipcRenderer.send("server_connect", settings);
        // convert it to a JSON array
        var jsonSettings = JSON.stringify(settings, null, 4);
        // write it to a file, to persist for next time
        fs.writeFile("servers/" + settings.server.address + '.json', jsonSettings, 'utf8', function(err) {
            if(err) {
                console.log("couldn't write settings to json file: ", err);
            } else {
                console.log("settings saved as json: " + settings.server.address + ".json");
            }
        });
        return false;
    });
});

function popFields(json){
    // parse the JSON stuff into the form fields.
    $("#server").val(json.server.address);
    $("#port").val(json.server.port);
    $("#nick").val(json.user.nickname);
    $("#username").val(json.user.username);
    $("#realname").val(json.user.realname);
    $("#nsPass").val(json.user.password);
    $("#encoding").val(json.encoding);
    $("#retryCount").val(json.retry.count);
    $("#retryDelay").val(json.retry.delay);
    $("#clearColours").prop("checked", json.messages.stripForm);
    $("#logMessages").prop("checked", json.messages.log);
    $("#floodProtect").prop("checked", json.floodProtect);
}
