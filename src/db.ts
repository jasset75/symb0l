import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('symb0l.db');
const db = new Database(dbPath, { verbose: console.log });

export function initDb() {
    const schema = `
    `;
    db.exec(schema);
    console.log('Database initialized at', dbPath);
}

export { db };
