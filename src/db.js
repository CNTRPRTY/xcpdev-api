import sqlite3 from 'sqlite3';

import path from 'path';
import { URL } from 'url';
const __dirname = new URL('.', import.meta.url).pathname;

import { DB_PATH } from './config.js';

// https://github.com/TryGhost/node-sqlite3/wiki/API
const verboseSqlite3 = sqlite3.verbose();

const DB_PATH_FULL = path.join(__dirname, DB_PATH);
export const db = new verboseSqlite3.Database(DB_PATH_FULL, sqlite3.OPEN_READONLY);
