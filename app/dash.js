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
const firebase = require("firebase");

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

// Initialize Firebase
var config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
var uid;
var isAnonymous = true;
var User;
firebase.initializeApp(config);

var Servers = [];

function sendVerificationEmail(){
    User.sendEmailVerification().then(function() {
        // Email sent.
        alert("Verification email resent! Please check your inbox and spam folders. Once verified, the application will respect the change on the next run.");
        setTimeOut(User.reload(), 10000);
    }, function(error) {
        // An error happened.
    });
}
function deleteAveAccount(){
    User.delete().then(function() {
        // User deleted.
    }, function(error) {
        // An error happened.
    });
}

firebase.auth().onAuthStateChanged(function(user) {
    User = user;
    if (user) {
        // User is signed in.
        isAnonymous = user.isAnonymous;
        if(!isAnonymous){
            document.getElementById("user").innerHTML = user.email;
            if(!user.emailVerified){
                toggle("verifyAccount");
            }
        }else{
            document.getElementById("user").innerHTML = "Anonymous user";
        }
        document.getElementById("loading-m").classList.remove("active");
        document.getElementById("loading").classList.remove("is-active");
        uid = user.uid;
        console.log(user);
        var serverRef = firebase.database().ref(`${uid}`);
        serverRef.on("value", function(snapshot){
            console.log(snapshot);
            console.log(snapshot.val());
            var srvs = snapshot.val();
            $(document).ready(function(){
                $('#signInForm').submit(function(){
                    firebase.auth().signInWithEmailAndPassword($("#signInEmail").val().toString(), $("#signInPass").val().toString()).catch(function(error) {
                        // Handle Errors here.
                        var errorCode = error.code;
                        var errorMessage = error.message;
                        console.log(error);
                    });
                    toggle("signInForm");
                    // override Chromium behaviour
                    return false;
                });
                $('#forgottenPassword').submit(function(){
                    firebase.auth().sendPasswordResetEmail($("#forgotEmail").val().toString()).then(function(){
                        // email sent
                        alert("Password reset email sent! Please check your inbox and spam folders if it's not there.");
                    }, function(error){
                        console.log(error);
                    });
                    toggle("signInForm");
                    toggle("forgottenPassword");
                    // override Chromium behaviour
                    return false;
                });
                $('#signUpForm').submit(function(){
                    firebase.auth().createUserWithEmailAndPassword($("#signUpEmail").val().toString(), $("#signUpPass").val().toString()).catch(function(error) {
                        // Handle Errors here.
                        var errorCode = error.code;
                        var errorMessage = error.message;
                        console.log(error);
                    });
                    sendVerificationEmail();
                    toggle("signUpForm");
                    // override Chromium behaviour
                    return false;
                });

                var grid = document.getElementById("serverGrid");
                console.log(srvs);
                if(srvs){
                    srvs.forEach(function(server, index){
                        Servers[index] = server;
                        if(document.getElementById(index)){
                            document.getElementById(index).parentNode.parentNode.removeChild(document.getElementById(index).parentNode);
                        }
                        var channels = "";
                        try{
                            server.channels.forEach(function(channel, index){
                                if(index !== 0){
                                    channels += ", ";
                                }
                                channels += channel;
                            });
                        }catch(err){
                            // no channels initialised; ignore it
                        }

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
                            window.location = `server.html?serv=${this.id.split("-")[0]}`;
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
                            database.ref(`${uid}/${this.id.split("-")[0]}`).set(null);
                            this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);
                            e.stopPropagation();
                        }

                        card.appendChild(editBtn);
                        card.appendChild(delBtn);

                        card.onclick = function(){
                            electron.ipcRenderer.send("server", this.id, Servers[this.id], uid);
                        };

                        cell.appendChild(card);

                        grid.insertBefore(cell, document.getElementById("nsCell"));
                    });
                }
            });
        });
    } else {
        firebase.auth().signInAnonymously().catch(function(error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(error);
        });
    }
});

// Get a reference to the database service
var database = firebase.database();

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(__dirname + '/res/js/jquery.min.js');
