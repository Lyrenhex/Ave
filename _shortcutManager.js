/*
    This file is a slightly modified fork of the same-named file from Samuel Attard's
    Google Play Music Desktop Player (https://github.com/MarshallOfSound/https://github.com/Scratso/Google-Play-Music-Desktop-Player-UNOFFICIAL-),
    and is thus licensed under the MIT License. See below for more details.

    The original file by Samuel Attard is available at:
    https://github.com/MarshallOfSound/Google-Play-Music-Desktop-Player-UNOFFICIAL-/blob/master/src/main/utils/_shortcutManager.js

The MIT License (MIT)
Copyright (c) 2016 Samuel Attard

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';

const packageJSON = require('package.json');

const startPath = path.resolve(
  app.getPath('appData'), '..', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs',
  packageJSON.author.name, `${packageJSON.productName}.lnk`
);
const desktopPath = path.resolve(app.getPath('home'), 'Desktop', `${packageJSON.productName}.lnk`);
const taskbarPath = path.resolve(
  app.getPath('appData'), '..', 'Roaming', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned',
  'TaskBar', `${packageJSON.productName}.lnk`
);
const startPinPath = path.resolve(
  app.getPath('appData'), '..', 'Roaming', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned',
  'StartMenu', `${packageJSON.productName}.lnk`
);

const squirrelPath = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');

const shortcutAtPath = (targetPath, create) => {
  if (process.platform !== 'win32') return;
  if (!fs.existsSync(targetPath) && !create) return;
  shell.writeShortcutLink(targetPath, fs.existsSync(targetPath) ? 'update' : 'create', {
    target: squirrelPath,
    args: `--processStart "${path.basename(process.execPath)}"`,
    icon: process.execPath,
    iconIndex: 0,
    appUserModelId: 'com.scratso.ave',
  });
};

export const createShortcuts = () => {
  shortcutAtPath(desktopPath, true);
  shortcutAtPath(startPath, true);
};

export const updateShortcuts = () => {
  shortcutAtPath(desktopPath);
  shortcutAtPath(startPath);
  shortcutAtPath(taskbarPath);
  shortcutAtPath(startPinPath);
};

export const removeShortcuts = () => {
  if (fs.existsSync(startPath)) fs.unlinkSync(startPath);
  if (fs.existsSync(desktopPath)) fs.unlinkSync(desktopPath);
  if (fs.existsSync(taskbarPath)) fs.unlinkSync(taskbarPath);
  if (fs.existsSync(startPinPath)) fs.unlinkSync(startPinPath);
};
