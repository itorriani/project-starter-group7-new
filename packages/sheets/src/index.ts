import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { Sheet, WithId, newSheet } from "@poly-sheets/types";
// TODO: [Assignment 5] replace the following with
//       SQLiteSheetService
import { InMemorySheetService } from "sheet-svc";
// TODO: [Assignment 6] Add `FormulaSheetService` to the
//       above import from `sheet-svc`

// TODO [Assignment 6] import `DAGComputeService` from
//       `compute-svc`

// TODO [Assignment 7] remove (or comment out)
//      the three services imports above
//      (they were added in Assignments 5 & 6)

import { readCSV } from "./csv.ts";

// TODO: [Assignment 2] add this import:
//
//   import createRouter from "./api.ts"

// TODO: [Assignment 7] remove (or comment out)
//       the router import above, and uncomment the
//       following:
//
// import apiProxy from "./proxy.ts";

// TODO: [Assignment 4] add these imports:
//
//   import websockets from "./websockets.ts"
//   import wsServer from "./ws-server.ts";

const port = process.env.PORT || 3000;

const host = process.env.APP_IP || "0.0.0.0";
const computeHost = process.env.COMPUTE_IP || host;
const computePort = process.env.COMPUTE_PORT || "3002";

const useSPA = !!process.env.STATIC;
const publicDir = path.resolve("public");
const staticDir = path.resolve(process.env.STATIC || "public");
const templateDir = path.resolve(process.env.TEMPLATES || "public/templates");

const app = express();
// TODO: [Assignment 5] replace the following with
//       SQLiteSheetService
const sheetService = new InMemorySheetService();

// TODO: [Assignment 6] redefine `sheetService` above
//       by using `new FormulaSheetService`. This class
//       requires that you pass the SQLiteSheetService
//       to its constructor.

// TODO: [Assignment 6] define `computeService` by using
//       `new DAGComputeService`, and passing it
//       the `sheetService` (above) to the constructor
//
// const computeService = ...

// TODO: [Assignment 7] remove or comment out the above
//       definitions for sheetService and computeService

app.use(express.static(
  staticDir,
  useSPA ? { index: false } : {}
));
app.use(express.urlencoded()); // for parsing application/x-www-form-urlencoded

// TODO: [Assignment 2] create a router by calling createRouter.
//
// const router = ...;

// TODO: [Assignment 2] Have `app` use `router` to handle
//       all requests which begin with `/api`. Note that 
//       this cause the later "app.get("/app/:id..." call
//       from Assignment 1 to have no effect.
//
// app.use( /*   */ );

// TODO: [Assignment 7] Replace the above app.use with the following
//       line to proxy those to the compute service
//
// app.use("/api", apiProxy(computeHost, parseInt(computePort)));

if (useSPA) {
  // Explicitly send public/index.html for /, regardless of STATIC value
  app.get("/", (req: Request, res: Response) => {
    res.sendFile("index.html", {root: publicDir});
  });

  // Send index.html in STATIC directory for any route starting with /app
  app.get(/\/app(.*)/, (req: Request, res: Response) => {
    // TODO: [Assignment 2] Complete this endpoint, following the
    //       example above, except use `staticDir` in place of `publicDir`
  });
}


app.post("/app", (req: Request, res: Response) => {
  const { sheetName, nrows, ncols, template } = req.body;

  if (!template) {
    const columns = ncols ? parseInt(ncols) : 10;
    const rows = nrows ? parseInt(nrows) : 50;
    const name = sheetName || "New Sheet";

    const sheet = newSheet(columns, rows, name);

    // TODO: [Assignment 1] save the sheet in the sheetService
    //       and pass then result to redirectToSheet
    //
    // const stored = ...;
    // redirectToSheet(stored);

    // TODO: [Assignment 7] remove the code above which stores
    //       the sheet. Instead, do this:
    //
    // redirectToSheet(sheet);

  } else {
    readCSV(template as string, templateDir)
      .then((sheet) => {
        // TODO: [Assignment 1] save the sheet and redirect,
        //       as you did above

        // TODO: [Assignment 7] remove the code above which
        //       you wrote to save the sheet. Instead, call
        //       `redirectToSheet(sheet)`

      })
      .catch((err: Error) => {
        // TODO: [Assignment 1] an error occurred. Respond
        //       with an HTTP error status. You may assume
        //       the only possible error is that the file
        //       was not found.
      });
  }

  function redirectToSheet(sheet: WithId<Sheet>) {

    // TODO: [Assignment 7] Before you can redirect, you need
    //       to use the REST API on the Compute Host and have
    //       it create the Sheet. Use `fetch()` to make a POST request
    //       to `/api/sheets` on the Compute Host. Send the
    //       `sheet` in the body of your POST.
    //
    //       The response from that request will contain an `id`,
    //       which you can then use to redirect users, as before.
    //       Move the following line to inside the `.then()` and
    //       edit it to use the id from the response.

    res.redirect(`/app/${sheet.id}`)
  }
});

// Assignment 7: You can remove this route instead of updating
//       it for the new services architecture. It hasn't been
//       used since Assignment 1 (server-side rendering).

app.get("/app/:id", (req: Request, res: Response) => {
  //        ==== Assignment 1 ===
  // TODO: Declare the variable `id`. Initialize it to the
  //       string which occurred in place of `:id` in the URL.
  //
  // const id = ...

  // TODO: Using `id`, get the corresponding sheet from the
  //       sheetService
  //
  const sheet = undefined; // <- replace with your code

  // TODO: Check for sheet not found, in
  //       which case send the appropriate error status code

  // TODO: Render the template to an HTML-formatted 'string'
  //       using 'viewSheet.ts'.
  //
  // const html = ...;

  // TODO: send the html string as the HTTP response

});

// Start the server

// TODO: [Assignment 4] Save the return value of `app.listen`
//   in a variable called `server`. You will need this to
//   set up websockets, below

app.listen(port, () => {
  const showServerLocMsg : string = 
  `Server listening at port ${port} at IPv4 0.0.0.0`;
  console.log( showServerLocMsg );  
});

// TODO: [Assignment 4] Enable websockets on the HTTP server
//    by calling `websockets` with two inputs: (1) `server` (defined
//    above) and (2) the result of calling `wsServer` on 'sheetService'.


// TODO: [Assignment 7] Update the above wsServer to pass it
//     the IP and Port for the Compute Host. See ws-server.ts
//     for more changes there.
