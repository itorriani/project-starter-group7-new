import express, { Request, Response, Router } from "express";
import { ComputeService } from "compute-svc";
import { SheetCache } from "./sheet-cache";
import {
  SerializedValue, Sheet, Sparse,
  Value, RCKey, WithId, parseKey,
  MoreRows
} from "@poly-sheets/types";
export default function createRouter(
  compSvc: ComputeService,
  sheetCache: SheetCache
) {
  const router = Router();
  router.use(express.json({ limit: "1Mb" }));
  // ======= Assignment 7 ========
  //
  // The compute service provides four endpoints, three of
  // which you implemented in `sheets` in Assignments 2-6.
  // Instead, `sheets` will now proxy those requests
  // to the compute service.
  //
  // So you should reference the code you wrote in
  // `packages/sheets/src/api.ts`. There are two
  // differences that you will need to address:
  //
  // 1. all the SheetService operations are now asynchronous
  // 2. the computed values are cached in the `sheetCache`
  //
  // Since computing formulas should always be followed
  // by storing the results in the cache, there is a helper
  // function, `updateComputedValues` provided at the bottom
  // of this file
  router.post("/sheets", (req: Request, res: Response) => {
    const sheet = req.body as Sheet;
    console.log("POST /sheets");
    sheetCache.addSheetRemote(sheet)
      .then((sheet) => {
        // Run the formulas (if any) on the newly created sheet
        // and cache the computed results.
        updateComputedValues(sheet.id, sheet.formulas);
        res.status(201).send(sheet)
      })
      .catch((err: Error | string) => {
        console.log("Error: ", err);
        res.status(500).send(err);
      });
  });
  router.get("/sheets/:id", (req: Request, res: Response) => {
    const id = req.params.id;
    const sheetId = typeof id === "string" ? id : id[0];
    const limit = req.query["limit"];
    const maxRows = typeof limit === "string" ? parseInt(limit) : undefined;
    console.log(`GET /sheets/${sheetId}`);
    sheetCache.getSheetByIdRemote(sheetId)
      .then((fullSheet) => {
        // Run all the formulas in the sheet by calling
        // `updateComputedValues`. This computes any formula
        // cells and caches the results (mutating the cached
        // sheet, which `fullSheet` refers to).
        updateComputedValues(sheetId, fullSheet.formulas);
        // Limit the number of rows sent back, as in
        // `InMemorySheetService.getSheetById`.
        const sheet: Sheet = maxRows === undefined
          ? fullSheet
          : { ...fullSheet, cells: fullSheet.cells.slice(0, maxRows) };
        res.send(sheet);
      })
      .catch((err: Error | string) => {
        if (err === "Not Found") res.status(404).send();
        else res.status(500).send(err);
      });
  });
  router.get("/sheets/:id/cells", (req: Request, res: Response) => {
    const id = req.params.id;
    const sheetId = typeof id === "string" ? id : id[0];
    const { limit, start } = req.query;
    const startRow = typeof start === "string" ? parseInt(start) : 0;
    const maxRows = typeof limit === "string" ? parseInt(limit) : undefined;
    sheetCache.getSheetByIdRemote(sheetId)
      .then((sheet) => {
        // Run all the formulas in the sheet by calling
        // `updateComputedValues`.
        updateComputedValues(sheetId, sheet.formulas);
        // Get the requested rows from the sheet, as in
        // `InMemorySheetService.getCellsInRange`.
        const endRow = maxRows === undefined ? undefined : startRow + maxRows;
        const rows: Value[][] = sheet.cells.slice(startRow, endRow);
        res.send({
          rows, start: startRow, count: rows.length
        });
      })
      .catch((err: Error | string) => {
        if (err === "Not Found") res.status(404).send();
        else res.status(500).send(err);
      });
  });
  router.patch("/sheets/:id/cells", (req: Request, res: Response) => {
    const id = req.params.id;
    const sheetId = typeof id === "string" ? id : id[0];
    const patch = req.body as Sparse<SerializedValue>;
    console.log(`PATCH /sheets/${sheetId}/cells`, patch);
    sheetCache.updateSheetValuesRemote(sheetId, patch)
      .then((changes) => {
        const values = "values" in changes ? changes.values : changes;
        const formulas = "formulas" in changes ? changes.formulas : {};
        // Recalculate any formulas that use the changed values.
        // This returns the downstream cells that changed as a result
        // (not including `values` itself).
        const recalculated = compSvc.updateValues(sheetId, values);
        // Store the recalculated values in the cache.
        sheetCache.updateSheetValues(sheetId, recalculated);
        // Run any changed formulas and cache the computed results.
        // `updateComputedValues` returns the computed values.
        const computed = updateComputedValues(sheetId, formulas);
        res.send({
          values: {
            ...values,
            ...recalculated,
            ...computed,
          },
          formulas
        });
       })
      .catch((err: Error | string) => {
        console.log("Error:", err);
        if (err === "Not Found") res.status(404).send();
        else res.status(500).send(err);
      });
  });
  return router;
  function updateComputedValues(
    id: string,
    formulas?: Sparse<string>
  ): Sparse<Value>
  {
    if (!formulas) return {};
    const computed = compSvc.updateFormulas(id, formulas);
    sheetCache.updateSheetValues(id, computed);
    return computed;
  }
}
