/*
    This file is a slightly modified fork of the same-named file from Samuel Attard's
    Google Play Music Desktop Player (https://github.com/MarshallOfSound/https://github.com/Scratso/Google-Play-Music-Desktop-Player-UNOFFICIAL-),
    and is thus licensed under the MIT License. See below for more details.

    The original file by Samuel Attard is available at:
    https://github.com/MarshallOfSound/Google-Play-Music-Desktop-Player-UNOFFICIAL-/blob/master/src/main/squirrel.js

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

import { app } from 'electron';

import { createShortcuts, updateShortcuts, removeShortcuts } from './_shortcutManager';

const handleStartupEvent = () => {
  if (process.platform !== 'win32') {
    return false;
  }

  const squirrelCommand = process.argv[1];

  switch (squirrelCommand) {
    case '--squirrel-install':
      createShortcuts();
      app.quit();
      return true;
    case '--squirrel-updated':
      updateShortcuts();
      app.quit();
      return true;
    case '--squirrel-uninstall':
      removeShortcuts();
      app.quit();
      return true;
    case '--squirrel-obsolete':
      app.quit();
      return true;
    default:
      return false;
  }
};

export default handleStartupEvent;
