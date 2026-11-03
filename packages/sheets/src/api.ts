import express, { Request, Response, Router } from "express";
import { SheetService }  from "sheet-svc";
import { RCKey, SerializedValue, Sparse, Value, parseKey } from "@poly-sheets/types";
import { ComputeService } from "compute-svc";

function createRouter(
  svc: SheetService, computeSvc: ComputeService) : Router {
    const router = Router();

    router.use(express.json({ type: ['application/*+json', 'application/json'] }));

    router.get("/sheets/:id", (req: Request, res: Response) => {

      const id = req.params.id;
      if (typeof id !== "string") {
        return res.status(400).json({ error: "Invalid sheet ID format." });
      } 

      //read the limit part of the url if it exists 
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      //make a new call to getsheet with the limit
      const sheet = svc.getSheetById(id, limit);

      if(!sheet){
        return res.status(404).send({ error: `Sheet ${id} not found.`});
      }


      if (sheet.formulas && Object.keys(sheet.formulas).length > 0) {
          const computedValues = computeSvc.updateFormulas(id, sheet.formulas);
          updateCells(sheet.cells, computedValues);
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

    if (moreRows.formulas && Object.keys(moreRows.formulas).length > 0) {
      const computedValues = computeSvc.updateFormulas(id, moreRows.formulas);
      updateCells(moreRows.rows, computedValues, start);
    }

    return res.send(moreRows);
    });

    router.patch("/sheets/:id/cells", (req: Request, res: Response) => {
      const id = req.params.id as string;
      const patch = Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key, Value.fromJSON(value as SerializedValue) ])
      ) as Sparse<Value>;

      const result = svc.updateSheetValues(id, patch);

      if (!result) {
        return res.status(404).send({ error: `Sheet ${id} not found.` });
      }

      let values = "values" in result ? result.values : result;
      const dependentValues = computeSvc.updateValues(id, values);
      Object.assign(values, dependentValues);

      let formulas = "formulas" in result ? result.formulas : undefined;
      
      if (formulas) {
        const recalc = computeSvc.updateFormulas(id, formulas)
        Object.assign(values, recalc);
        res.send({ formulas, values });
      } else {
        res.send(values);
      }
    });
   

  return router;
}

// helper function

function updateCells(
  cells: Value[][],
  values: Sparse<Value>,
  rowOffset: number = 0) {
  Object.entries(values).forEach(([key, value]) => {
    const { row, column } = parseKey(key as RCKey);
    cells[row-rowOffset][column] = value;
  });
}

export default createRouter;
