const electron = require("electron");
const fs = require("fs");
const firebase = require("firebase");

var database;
var uid;
var serverId;

// Initialize Firebase
var config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
firebase.initializeApp(config);

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        // User is signed in.
        var isAnonymous = user.isAnonymous;
        uid = user.uid;
        console.log(user);

        database = firebase.database();
        if(getURLParameter("serv") === null){
            database.ref(`${uid}/ave/servers`).once('value', function(snapshot){
                serverId = snapshot.numChildren();
                console.log(serverId);
            });
        }else{
            database.ref(`${uid}/ave/servers/${getURLParameter("serv")}`).once('value', function(snapshot){
                serverId = getURLParameter("serv");
                console.log(snapshot.val());
                popFields(snapshot.val());
            });
        }
    } else {
        firebase.auth().signInAnonymously().catch(function(error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(error);
        });
    }
});

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

var Channels = [];

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
    console.log(getURLParameter("serv"));
    console.log(serverId);

    $('#connect').submit(function(){
      if(!Channels){
        Channels = [];
      }

        // set up the settings array
        var settings = {
            server: {
                address: $("#server").val(),
                port: $("#port").val(),
                password: $("#srvPass").val()
            },
            security: {
                secure: $("#ssl").is(":checked"),
                badCertsAllowed: $("#badCert").is(":checked"),
                sasl: $("#sasl").is(":checked"),
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
            floodProtect: $("#floodProtect").is(":checked"),
            channels: Channels
        };
        database.ref(`${uid}/ave/servers/${serverId}`).set(settings);
        window.location = "dash.html";
        return false;
    });
});

function popFields(json){
    // parse the JSON stuff into the form fields.
    $("#server").val(json.server.address);
    $("#port").val(json.server.port);
    $("#srvPass").val(json.server.password);
    $("#nick").val(json.user.nickname);
    $("#username").val(json.user.username);
    $("#realname").val(json.user.realname);
    $("#nsPass").val(json.user.password);
    $("#encoding").val(json.encoding);
    $("#retryCount").val(json.retry.count);
    $("#retryDelay").val(json.retry.delay);
    $("#sasl").prop("checked", json.security.sasl);
    $("#ssl").prop("checked", json.security.secure);
    $("#badCert").prop("checked", json.security.badCertsAllowed);
    $("#clearColours").prop("checked", json.messages.stripForm);
    $("#logMessages").prop("checked", json.messages.log);
    $("#floodProtect").prop("checked", json.floodProtect);
    Channels = json.channels;
}
