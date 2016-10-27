var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './Ave IRC-win32-x64/',
    iconUrl: 'http://www.ave-irc.pw/res/img/icon.ico',
    setupIcon: './app/res/img/icon.ico',
    setupExe: 'Ave-Install.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
