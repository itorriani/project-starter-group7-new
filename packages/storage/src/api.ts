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
    // TODO: Complete this route to add a Sheet to the
    //   SheetService. Follow REST conventions for creating
    //   a resource using POST. You will have to convert
    //   `sheet.cells` in the Request from SerializedValue[][]
    //    to Value[][]. (See helper function at the bottom
    //    of this file.)
    //
    // We did not need this route in `sheets`, but you
    // did something similar to handle the POST request
    // for `/app` in `sheets/src/index.ts`.

    const json = req.body as object;
    const { cells } = json as { cells: SerializedValue[][] };
    const sheet: Sheet = {
      // compose a new sheet object, with the properties
      // from `json`, but the cells converted to Value[][]
    }

    // Use the SheetService to store the new sheet.
    const stored = {}; // <- replace with your code

    // Send back response with the correct status and the
    // stored sheet in the body
  });

  router.get("/sheets/:id", (req: Request, res: Response) => {
    // TODO: complete this route.
    //
    // Use git to find the version of `sheets/src/api.ts`
    // where you implemented this route with just a
    // SheetService (no ComputeService).
  });

  router.get("/sheets/:id/cells", (req: Request, res: Response) => {
    // TODO: complete this route.
    //
    // Use git to find the version of `sheets/src/api.ts`
    // where you implemented this route with just a
    // SheetService (no ComputeService).
  });

  router.patch("/sheets/:id/cells", (req: Request, res: Response) => {
    // TODO: complete this route.
    //
    // Use git to find the version of `sheets/src/api.ts`
    // where you implemented this route with just a
    // SheetService (no ComputeService).
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
