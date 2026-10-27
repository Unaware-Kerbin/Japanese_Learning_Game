declare module 'sql.js' {
  interface QueryResult {
    columns: string[]
    values: unknown[][]
  }

  interface Database {
    run(sql: string, params?: Array<string | number | null>): Database
    exec(sql: string): QueryResult[]
    export(): Uint8Array
    close(): void
  }

  interface SqlJs {
    Database: new () => Database
  }

  function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJs>
  export default initSqlJs
}
