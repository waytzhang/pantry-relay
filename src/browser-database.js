// Adapt sql.js statements to the small synchronous interface used by PantryCore.
export class BrowserDatabase {
  constructor(SQL, bytes) { this.database = new SQL.Database(bytes); }
  exec(sql) { this.database.run(sql); }
  prepare(sql) {
    const read = (parameters, firstOnly) => {
      const statement = this.database.prepare(sql);
      try {
        statement.bind(parameters);
        const rows = [];
        while (statement.step()) {
          const row = statement.getAsObject();
          if (firstOnly) return row;
          rows.push(row);
        }
        return firstOnly ? undefined : rows;
      } finally { statement.free(); }
    };
    return {
      get: (...parameters) => read(parameters, true),
      all: (...parameters) => read(parameters, false),
      run: (...parameters) => { this.database.run(sql, parameters); return { changes: this.database.getRowsModified() }; },
    };
  }
  export() { return this.database.export(); }
  close() { this.database.close(); }
}
