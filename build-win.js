var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: './dist/Ave-win32-x64/',
    outputDirectory: './dist/installers',
    iconUrl: 'http://www.ave-irc.pw/res/img/icon.ico',
    setupIcon: 'icon.ico',
    setupExe: 'Ave-Install-win32-x64.exe'
  });

resultPromise.then(() => console.log("[x64] It worked!"), (e) => console.log(`[x64] No dice: ${e.message}`));

resultPromise2 = electronInstaller.createWindowsInstaller({
    appDirectory: './dist/Ave-win32-ia32/',
    outputDirectory: './dist/installers',
    iconUrl: 'http://www.ave-irc.pw/res/img/icon.ico',
    setupIcon: 'icon.ico',
    setupExe: 'Ave-Install-win32-ia32.exe'
  });


resultPromise2.then(() => console.log("[ia32] It worked!"), (e) => console.log(`[ia32] No dice: ${e.message}`));
