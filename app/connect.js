const electron = require("electron");
const fs = require("fs");

var advanced = false;

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');

$(document).ready(function(){
    try{
        var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
        popFields(settings);
    }catch(err){
        console.log("unable to open settings.json; probably first run:", err);
    }

    $('#connect').submit(function(){
        var settings = {
            server: {
                address: $("#server").val(),
                port: $("#port").val()
            },
            user: {
                nickname: $("#nick").val(),
                username: $("#username").val(),
                realname: $("#realname").val()
            },
            encoding: $("#encoding").val(),
            retry: {
                count: $("#retryCount").val(),
                delay: $("#retryDelay").val()
            },
            stripForm: $("#clearColours").is(":checked"),
            floodProtect: $("#floodProtect").is(":checked")
        };
        electron.ipcRenderer.send("connect", settings);
        var jsonSettings = JSON.stringify(settings, null, 4);
        fs.writeFile('settings.json', jsonSettings, 'utf8', function(err) {
            if(err) {
                console.log("couldn't write settings to json file: ", err);
            } else {
                console.log("settings saved as json: settings.json");
            }
        });
        return false;
    });
});

function popFields(json){
    console.log(json);
    $("#server").val(json.server.address);
    $("#port").val(json.server.port);
    $("#nick").val(json.user.nickname);
    $("#username").val(json.user.username);
    $("#realname").val(json.user.realname);
    $("#encoding").val(json.encoding);
    $("#retryCount").val(json.retry.count);
    $("#retryDelay").val(json.retry.delay);
    $("#clearColours").prop("checked", json.stripForm);
    $("#floodProtect").prop("checked", json.floodProtect);
}

function toggleAdvanced(){
    if(advanced){
        document.getElementById("advanced").classList.remove("shown");
    }else{
        document.getElementById("advanced").classList.add("shown");
    }
    advanced = !advanced;
}
