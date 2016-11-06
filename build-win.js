var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './rel/Ave-win32-x64/',
    outputDirectory: './rel/install',
    iconUrl: 'http://www.ave-irc.pw/res/img/icon.ico',
    setupIcon: 'icon.ico',
    setupExe: 'Ave-Install.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
