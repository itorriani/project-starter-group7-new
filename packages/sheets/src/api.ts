import express, { Request, Response, Router } from "express";
import { SheetService }  from "sheet-svc";
import { RCKey, Sparse, Value, parseKey } from "@poly-sheets/types";
// TODO: [Assignment 6] add this import:
//
// import { ComputeService } from "compute-svc";

function createRouter(
  svc: SheetService

  // TODO: [Assignment 6] add a second parameter to createRouter(),
  //       of type ComputeService
) : Router {


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

      //const sheet = svc.getSheetById(id);


      if(sheet){
        return res.send(sheet);
      }
      else{
        return res.status(404).send({ error: `Sheet ${id} not found.`});
      }

      // ======== Assignment 3 ========

      // TODO: at the top of the function, declare the variable
      //       `limit`. Initialize it to the string that was
      //       passed in as the `?limit=` query parameter, or
      //       undefined if there was none
      //
      // const limit = ...

      // TODO: modify your call to `sheetSvc.get`, adding the
      //       second parameter if `limit` is defined. (Hint:
      //       use parseInt to convert a string to a number)

    // ======== Assignment 6 ========

    // TODO: before sending the sheet back to the client,
    //       check if there is anything in `sheet.formulas`.
    //       If so, call the `updateFormulas` method on
    //       the ComputeService. This will return a `Sparse<Value>`
    //       with any values which the compute service computed.
    //       Use the `updateCells()` helper function (defined at
    //       the bottom of this file) to update `sheet.cells`.
    //       Then the sheet can be sent back to the client
    });

    router.get("/sheets/:id/cells", (req: Request, res: Response) => {
      // ======== Assignment 3 ========

      // TODO: Get the `id` as well as the `limit` and `start`
      //       query parameters from the Request object
      //
      // const id = ...
      // const { limit, start } = ...

      // TODO: Define `moreRows` as the result of calling
      //       the `getCellsInRange` sheet service function with
      //       the values of `id`, `start`, and `limit`.
      //       Hint: use parseInt to convert strings to numbers
      //
      // const moreRows = ...

      // TODO: If there was an error (`moreRows` is undefined)
      //       send an error response. Otherwise, send the
      //       `moreRows` object as JSON in the body of the reponse

    // ======== Assignment 6 ========

    // TODO: As you did above for `sheets/:id`, check for any
    //       `formulas` in the data from the sheet service. If
    //       there are any, use `updateFormulas` in the
    //       ComputeService to calculate the formulas, and then
    //       `updateCells()` to update moreRows.rows before
    //       sending it back to the client

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
      // ======== Assignment 3 ========

      // TODO: Get the `id` parameter from the Request
      //
      // const id = ...

    // TODO: Call the `updateSheetValues` service method
    //       passing it the sparse data that was in the
    //       body of the Request. You will need to convert
    //       any SerializedValues (in JSON) into Values (in memory).
      //       Save the result so we can check it later.
      //
      // const result = ...

      // TODO: If there was an error (`result` is undefined)
      //       send an error response. Otherwise, send the
      //       `result` object as JSON in the body of the reponse

    // ======== Assignment 6 ========

    // If the updateSheetValues finds any formulas in the patch,
    // it separates the formulas from the values and returns an
    // object of type:
    //
    //    { values: Sparse<Value>, formulas: Sparse<string> }
    //
    // When this happens, you will still send the entire result
    // to the client, but you will need to call different methods
    // of ComputeService first, with the separate values and formulas

    // TODO: Check `result` and get just the `values`, not the
    //       formulas. (We will handle the formulas later.)
    //
    // let values = "values" in result ? result.values : result;

    // TODO: Before sending the results back to the client, you
    //       need to have ComputeService recompute any formulas
    //       which depend on these changed values. The `updateValues`
    //       method in ComputeService does all the dependency
    //       checking, but you need to pass it the set of values
    //       from the patch. `updateValues` returns all
    //       values of formulas that were recalculated. Merge
    //       the recalculated values into `values`.

    // TODO: Now check for formulas, and if there are any,
    //       call `updateFormulas` as you did in the GET
    //       endpoints above. This will return still more
    //       updated values, which you will also need to merge
    //       into values.
    //
    // let formulas = "formulas" in result ? result.formulas : undefined;
    //
    // if ( formulas ) {
    //    const { formulas } = results;
    //    /* call `updateFormulas` and merge the resulting
    //       values into `values`
    //    */
    //    res.send({ formulas, values });
    // } else {
    //    res.send(values);
    // }

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
