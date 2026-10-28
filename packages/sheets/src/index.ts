import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { Sheet, WithId, newSheet } from "@poly-sheets/types";
import newRouter from "./api.ts"
import { SQLiteSheetService } from "sheet-svc";
// TODO: [Assignment 6] Add `FormulaSheetService` to the
//       above import from `sheet-svc`

// TODO [Assignment 6] import `DAGComputeService` from
//       `compute-svc`

import { readCSV } from "./csv.ts";
import { viewSheet } from "./viewSheet.ts";
import websockets from "./websockets.ts"
import wsServer from "./ws-server.ts";
  
const port = process.env.PORT || 3000;
const useSPA = !!process.env.STATIC;
const publicDir = path.resolve("public");
const staticDir = path.resolve(process.env.STATIC || "public");
const templateDir = path.resolve(process.env.TEMPLATES || "public/templates");

const app = express();
const sheetService = new SQLiteSheetService();

// TODO: [Assignment 6] redefine `sheetService` above
//       by using `new FormulaSheetService`. This class
//       requires that you pass the SQLiteSheetService
//       to its constructor.

// TODO: [Assignment 6] define `computeService` by using
//       `new DAGComputeService`, and passing it
//       the `sheetService` (above) to the constructor
//
// const computeService = ...

app.use(express.static(
  staticDir,
  useSPA ? { index: false } : {}
));
app.use(express.urlencoded()); // for parsing application/x-www-form-urlencoded

// TODO: [Assignment 2] create a router by calling createRouter.
//

const router = newRouter(sheetService);

// TODO: [Assignment 2] Have `app` use `router` to handle
//       all requests which begin with `/api`. Note that 
//       this cause the later "app.get("/app/:id..." call
//       from Assignment 1 to have no effect.
//
app.use( "/api", router);

if (useSPA) {
  // Explicitly send public/index.html for /, regardless of STATIC value
  app.get("/", (req: Request, res: Response) => {
    res.sendFile("index.html", {root: publicDir});
  });

  // Send index.html in STATIC directory for any route starting with /app
  app.get(/\/app(.*)/, (req: Request, res: Response) => {
    res.sendFile("index.html", { root: staticDir });
  });
}


app.post("/app", (req: Request, res: Response) => {
  const { sheetName, nrows, ncols, template } = req.body;

  if (!template) {
    const columns = ncols ? parseInt(ncols) : 10;
    const rows = nrows ? parseInt(nrows) : 50;
    const name = sheetName || "New Sheet";

    const sheet = newSheet(columns, rows, name);

    const stored = sheetService.addSheet(sheet);
    redirectToSheet(stored);

  } else {
    readCSV(template as string, templateDir)
      .then((sheet) => {
        const stored = sheetService.addSheet(sheet);
        redirectToSheet(stored);
      })
      .catch((err: Error) => {
        // TODO: [Assignment 1] an error occurred. Respond
        //       with an HTTP error status. You may assume
        //       the only possible error is that the file
        //       was not found.
        res.status(404).send(`Error: file not found`);
      });
  }

  function redirectToSheet(sheet: WithId<Sheet>) {
    res.redirect(`/app/${sheet.id}`)
  }
});

app.get("/app/:id", (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const sheet = sheetService.getSheetById(id);
  if (sheet === undefined){
    res.status(404).send("Error: Sheet not found")
  }else{
    const html = viewSheet(sheet);
    res.status(200).send(html);
  }
});

// Start the server
const server = app.listen(port, () => {
  const showServerLocMsg : string = 
  `Server listening at port ${port} at IPv4 0.0.0.0`;
  console.log( showServerLocMsg );  
});

//enable websockets on HTTP server and pass the sheetService
websockets(server, wsServer(sheetService)); 