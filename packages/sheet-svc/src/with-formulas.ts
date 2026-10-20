import {
  AbsoluteReference, MoreRows, PendingValue,
  RCKey, Sheet, Sparse, Value, WithId,
  parseKey, sparseKeyOf
} from "@poly-sheets/types";
import { SheetService } from "./interface.ts";

// ======== Assignment 6 ========

// An implementation of SheetService which interprets
// string values starting with "=" as formulas. These
// are removed from `sheet.cells` and stored in
// `sheet.formulas` instead, as a Sparse<Value>

export class FormulaSheetService implements SheetService {

  basicSvc: SheetService;

  constructor(svc: SheetService) {
    this.basicSvc = svc;
  }

  addSheet(
    sheet: Sheet
  ): WithId<Sheet> {
    const stored = this.basicSvc.addSheet(sheet);
    const { id, cells } = stored;
    const formulas = extractFormulas(cells);
    return { ...stored, cells, formulas };
  }

  getSheetById(
    id: string,
    maxRows?: number
  ): Sheet | undefined {
    const sheet = this.basicSvc.getSheetById(id, maxRows);
    if (!sheet) return undefined;
    const { cells } = sheet;
    const formulas = extractFormulas(cells);
    return { ...sheet, cells, formulas };
  }

  getCellsInRange(
    id: string,
    startRow: number = 0,
    maxRows?: number
  ): MoreRows | undefined {
    const moreRows = this.basicSvc.getCellsInRange(id, startRow, maxRows);
    if (!moreRows) return undefined;
    const { rows } = moreRows;
    const formulas = extractFormulas(rows);

    return { ...moreRows, rows, formulas };
  }

  getCellValue(
    id: string,
    ref: AbsoluteReference
  ): Value | undefined {
    const result = this.basicSvc.getCellValue(id, ref);
    if (result?.toString().startsWith("="))
      return new PendingValue();
    return result;
  }

  updateSheetValues(
    id: string,
    patch: Sparse<Value>
  ): { values: Sparse<Value>, formulas: Sparse<string> } | undefined {
    const changes = this.basicSvc.updateSheetValues(id, patch);
    if (!changes) return undefined;
    if ("formulas" in changes) return changes; // already parsed out
    return splitChanges(changes);
  }
}

// helper functions...

function extractFormulas(
  cells: Value[][]
): Sparse<string> {
  let formulas: Sparse<string> = {};

  // extract the formulas
  cells.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value.toString().startsWith("=")) {
        const key = sparseKeyOf({ row: r, column: c });
        const formula = value.toString().slice(1);
        formulas[key] = formula;
        cells[r][c] = new PendingValue();
      }
    });
  });

  return formulas;
}

function splitChanges(
  changes: Sparse<Value>
): { values: Sparse<Value>, formulas: Sparse<string> } {
  const values: Sparse<Value> = {};
  const formulas: Sparse<string> = {}

  Object.entries(changes).forEach(([key, value]) => {
    if (value.toString().startsWith("=")) {
      const formula = value.toString().slice(1);
      formulas[key as RCKey] = formula;
    } else {
      values[key as RCKey] = value;
      // safe, but only necessary if cell was previously a formula
      formulas[key as RCKey] = "";
    }
  });

  return { values, formulas };
}
