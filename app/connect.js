const electron = require("electron");

var advanced = false;

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');

$(document).ready(function(){
    $('#connect').submit(function(){
        electron.ipcRenderer.send("connect", $('#server').val(), $('#port').val(), $('#nick').val(),
                                                                                   $('#username').val(), $('#realname').val(),
                                                                                   $('#encoding').val(), $('#retryCount').val(),
                                                                                   $('#retryDelay').val(), $('#clearColours').is(":checked"),
                                                                                   $('#floodProtect').is(":checked"));
        return false;
    });
});

function toggleAdvanced(){
    if(advanced){
        document.getElementById("advanced").classList.remove("shown");
    }else{
        document.getElementById("advanced").classList.add("shown");
    }
    advanced = !advanced;
}
