import express, { Request, Response, Router } from "express";
import { SheetService }  from "sheet-svc";
import { RCKey, SerializedValue, Sheet, Sparse, Value } from "@poly-sheets/types";
// ======== Assignment 7 ========
//
// Complete the implementation of `createRouter`, which
// provides a REST API for SheetService.
//
// Note that most of these routes are identical to what
// you had implemented in `sheets/src/api.ts` prior to
// Assignment 6. You can find that version of your
// code in git and copy it here.
function createRouter(svc: SheetService) {
  const router = Router();
  router.use(express.json({ limit: "1Mb" }));

  router.post("/sheets", (req: Request, res: Response) => {
    const json = req.body as {
      name: string;
      columns: string[];
      nrows: number;
      cells: SerializedValue[][];
      formulas?: Sparse<string>;
    };
    const sheet: Sheet = {
      name: json.name,
      columns: json.columns,
      nrows: json.nrows,
      cells: convertCellValues(json.cells),
      formulas: json.formulas,
    };
    const stored = svc.addSheet(sheet);
    res.status(201).send(stored);
  });

  router.get("/sheets/:id", (req: Request, res: Response) => {
    const id = req.params.id;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid sheet ID format." });
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const sheet = svc.getSheetById(id, limit);
    if (!sheet) {
      return res.status(404).send({ error: `Sheet ${id} not found.` });
    }
    return res.send(sheet);
  });

  router.get("/sheets/:id/cells", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const start = req.query.start ? parseInt(req.query.start as string) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const moreRows = svc.getCellsInRange(id, start, limit);
    if (!moreRows) {
      return res.status(404).send({ error: `Sheet ${id} not found.` });
    }
    return res.send(moreRows);
  });

  router.patch("/sheets/:id/cells", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const patch = Object.fromEntries(
      Object.entries(req.body).map(([key, value]) =>
        [key, Value.fromJSON(value as SerializedValue)])
    ) as Sparse<Value>;
    const result = svc.updateSheetValues(id, patch);
    if (!result) {
      return res.status(404).send({ error: `Sheet ${id} not found.` });
    }
    return res.send(result);
  });

  return router;
}
// helper function
function convertCellValues(
  cells: SerializedValue[][]
): Value[][] {
  return cells.map(
    (row) => row.map(
      (v) => Value.fromJSON(v)
    ));
}
export default createRouter;
