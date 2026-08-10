/* Deletes the local SQLite database (and WAL/SHM sidecars) so the app
   re-creates the schema and reseeds demo data on the next start. */
const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'data', 'towntrade.db');
const files = [base, `${base}-wal`, `${base}-shm`];

let removed = 0;
for (const f of files) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    removed += 1;
    console.log(`Removed ${f}`);
  }
}

console.log(removed ? 'Database reset. It will be recreated and reseeded on next start.' : 'No database found — nothing to reset.');
