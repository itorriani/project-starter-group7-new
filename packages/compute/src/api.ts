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
        // TODO: run the formulas and cache the results
        //       by calling `updateComputedValues`

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
        // TODO: Run all the formulas in the sheet by calling
        //       `updateComputedValues`

        const sheet: Sheet = {
          // TODO: copy the code from `InMemoryService` where you limit
          //       the number of rows in the sheet before sending
          //       it back.
        }

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
        // TODO: Run all the formulas in the sheet by calling
        //       `updateComputedValues`

        // TODO: get the requested rows from the sheet. You previously
        //   implemented this in InMemorySheetService

        const rows: Value[][] = [];  // <- your code here

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

        // TODO: use `compSvc.updateValues` to recalculate any formulas
        //    that use the changed values. Refer to the sheets API where
        //    you did this in Assignment 6
        //
        // const recalculated = ... your code

        // TODO: store recalculated values in the cache by using
        //    the SheetService interface of sheetCache

        // TODO: Run any changed formulas by calling
        //    `updateComputedValues`. It will return a Sparse<Value>
        //    which you will need to build your result.
        //
        // const computed = ... your code

        res.send({
          values: {
            ...values,
            // include all the values from `recalculated` and `computed` here
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
