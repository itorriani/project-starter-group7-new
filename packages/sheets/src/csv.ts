import { IntrinsicValue, PrimitiveType, Sheet, Value, newSheet } from "@poly-sheets/types";
import fs from "node:fs/promises";
import path from "node:path";
import parseCSV from "neat-csv";

export function readCSV(
  file: string,
  fileDir: string = "public",
  headers: Array<string> | boolean | undefined = undefined
): Promise<Sheet> {
  const filepath = path.join(fileDir, file);
  const sheet = newSheet(0, 0, file);
  const lookupColumn: {[col: string]: number} = {};

  if (Array.isArray(headers)) setColumns(headers);

  return fs.readFile(filepath)
    .then((buffer) => parseCSV(buffer, { headers }))
    .then((rows) => {
      rows.forEach(insertData);
      return sheet;
    });

  function setColumns(headers: Array<string>) {
    sheet.columns = headers;
    headers.forEach((col, i) => lookupColumn[col] = i);
  }

  function insertData(data: Record<string, string | number | null>) {
    if (sheet.nrows === 0 && typeof headers === "undefined")
      setColumns(Object.keys(data));

    const row: Array<Value> = Array.from(
      sheet.columns,
      () => new IntrinsicValue());

    Object.entries(data).forEach(([column, s]) => {
      let primitive : PrimitiveType = s;
      if( typeof s === "string"
        && s.match(/^[-+]?(\d+|\.\d+|\d+\.\d*)$/)
      ) {
        const parsed : number = parseFloat(s);
        if( !Number.isNaN( parsed ) ) {
          primitive = parsed;
        }
      }
      const value: Value = new IntrinsicValue( primitive );

      row[lookupColumn[column]] = value;
    })

    sheet.nrows += 1;
    sheet.cells.push(row);
  }
}
