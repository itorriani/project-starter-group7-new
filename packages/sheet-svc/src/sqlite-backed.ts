import {
  AbsoluteReference,
  IntrinsicValue,
  MoreRows,
  RCKey,
  Sheet,
  Sparse,
  Value,
  WithId,
  parseKey
} from "@poly-sheets/types";
import { v4 as uuidv4 } from "uuid";
import { DatabaseSync } from 'node:sqlite';
import { DBTransaction  } from "./sqlite-transaction.ts";
import { SheetService } from "./interface.ts"; ''

const dbName = process.env.DB_NAME || "poly-sheets";
const db = new DatabaseSync(`${dbName}.db`);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
    CREATE TABLE if NOT EXISTS sheets (
      id TEXT PRIMARY KEY, 
      name TEXT NOT NULL, 
      nrows INTEGER NOT NULL
  )
  `
)



db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    sheet_id TEXT NOT NULL,
    column_num INTEGER NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (sheet_id, column_num)
  )
  `);


db.exec(`
  CREATE TABLE IF NOT EXISTS cells (
    sheet_id TEXT NOT NULL,
    column_num INTEGER NOT NULL,
    row_num INTEGER NOT NULL,
    string_values TEXT,
    number_values REAL,
    PRIMARY KEY (sheet_id, row_num, column_num)
  )
  `);


const addSheet = db.prepare(`
    INSERT INTO sheets (id, name, nrows)
    VALUES (?, ?, ?)
  `);


const addColumn = db.prepare(`
  INSERT INTO columns (sheet_id, column_num, name)
  VALUES (?, ?, ?)
`);


const selectSheet = db.prepare(`
  SELECT id, name, nrows  
  FROM sheets
  WHERE id=?
`);


const selectColumns = db.prepare(`
    SELECT column_num, name
    FROM columns
    WHERE sheet_id = ?
    ORDER BY column_num
`)


const countColumns = db.prepare(`
  SELECT COUNT(*) AS ncolumns
  FROM columns
  WHERE sheet_id = ?

`);



const selectOneValue = db.prepare(`
  SELECT string_values AS strval, number_values AS numval
  FROM cells
  WHERE sheet_id = ? AND row_num = ? AND column_num = ? 

  `);



const selectValues = db.prepare(`
  SELECT row_num AS row, column_num AS column, string_values AS strval, number_values AS numval
  FROM cells
  WHERE sheet_id = ? AND row_num >= ? and row_num < ?

  `);


const updateValue = db.prepare(`
  INSERT OR REPLACE INTO cells (
    sheet_id,
    row_num,
    column_num,
    string_values,
    number_values
  )
  VALUES (?, ?, ?, ?, ?)
`);



export class SQLiteSheetService implements SheetService {

  // Add a sheet to the collection, and assign an id
  addSheet(sheet: Sheet): WithId<Sheet> {
    const id = uuidv4();
    const stored = {...sheet, id};

    const createSheet : DBTransaction = new DBTransaction(
      db,
      () => {
        addSheet.run(id, sheet.name, sheet.nrows);
        sheet.columns.forEach((name, i) => {
          addColumn.run(id, i, name);
        });
        sheet.cells.forEach((rowCells, rnum) => {
          rowCells.forEach((value, cnum) => {
            if (value.isEmpty()) return;
            const strval = value.isNumber() ? null : value.toString();
            const numval = value.isNumber() ? value.toNumber() : null;
            updateValue.run(id, rnum, cnum, strval, numval);
          });       
        });
      }
    );

    createSheet.run();

    return stored;
  }

  // Return the sheet from the collection with the given id.
  // A maximum of `maxRows` rows of data are included.
  getSheetById(
    id: string,
    maxRows?: number
  ): Sheet | undefined {
   
    const sheet = selectSheet.get(id) as {id: string, name: string, nrows: number} | undefined; 
    
    if (!sheet) return undefined;

    const columns = selectColumns.all(id) as { name: string }[];
    const { rows } = this.getCellsInRange(id, 0, maxRows) || {};

    return {
      ...sheet,
      columns: columns.map((c: {name: string}) => c.name),
      cells: rows || []
    }
  }

  // Return rows of data, starting at `startRow`, and
  // including at last `maxRows`
  getCellsInRange(
    id: string,
    startRow: number = 0,
    maxRows?: number
  ): MoreRows | undefined {
    
    const sheet = selectSheet.get(id) as
      { id: string; name: string; nrows: number } | undefined;

    if (!sheet) return undefined;

    const { ncolumns } = countColumns.get(id) as { ncolumns: number };

    const end = typeof maxRows === "undefined"
      ? (sheet).nrows
      : Math.min( (sheet).nrows, startRow + maxRows)

    const count = Math.max(0, end - startRow);

    const rows: Value[][] = Array.from(
      { length: count},
      () => Array.from({ length: ncolumns }, () => new IntrinsicValue())
    );

    
    const values = selectValues.all(id, startRow, end) as {
      row: number;
      column: number;
      strval: string | null;
      numval: number | null;
    }[];

    values.forEach(({ row, column, strval, numval }) => {
      const v = typeof strval === "string" ? strval :
        typeof numval === "number" ? numval : null;
      if (v !== null) {
        rows[row - startRow][column] = new IntrinsicValue(v);
      }
    })

    return { rows, start: startRow, count: count }
  }

  // Get one value from a sheet
  getCellValue(
    id: string,
    ref: AbsoluteReference
  ): Value | undefined {
    const { row, column } = ref;

  
    const value = selectOneValue.get(id, row, column) as
    { strval: string | null; numval: number | null } | undefined;

    if (typeof value === "undefined") return value;
    const { strval, numval } = value;
    return new IntrinsicValue(
      typeof strval === "string" ? strval :
        typeof numval === "number" ? numval : null
    );
  }

  // Modify values in sheet, as indicated in the `patch`
  updateSheetValues(
    id: string,
    patch: Sparse<Value>
  ): Sparse<Value> | undefined {
    if (!selectSheet.get(id)) return undefined;
    Object.entries(patch).forEach(([key, value]) => {
      const ref = parseKey(key as RCKey);
      const strval = !value.isNumber() ? value.toString() : null;
      const numval = value.isNumber() ? value.toNumber() : null;

      updateValue.run(id, ref.row, ref.column, strval, numval);

    });

    return patch;
  }
}
