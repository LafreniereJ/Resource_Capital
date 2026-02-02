// Stub for better-sqlite3 on Vercel
// This prevents Turbopack from trying to bundle the native module

class MockDatabase {
    constructor() {
        console.log('Using mock SQLite database (Vercel)');
    }

    prepare() {
        return {
            get: () => null,
            all: () => [],
            run: () => ({ changes: 0, lastInsertRowid: 0 }),
            exec: () => { }
        };
    }

    exec() { }
}

export default MockDatabase;
