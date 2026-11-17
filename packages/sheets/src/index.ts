import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { Sheet, WithId, newSheet } from "@poly-sheets/types";
import newRouter from "./api.ts"
import { SQLiteSheetService, FormulaSheetService} from "sheet-svc";
import { DAGComputeService } from "compute-svc";
import { readCSV } from "./csv.ts";
import { viewSheet } from "./viewSheet.ts";
import websockets from "./websockets.ts"
import wsServer from "./ws-server.ts";
  
const port = process.env.PORT || 3000;

const host = process.env.APP_IP || "0.0.0.0";
const computeHost = process.env.COMPUTE_IP || host;
const computePort = process.env.COMPUTE_PORT || "3002";

const useSPA = !!process.env.STATIC;
const publicDir = path.resolve("public");
const staticDir = path.resolve(process.env.STATIC || "public");
const templateDir = path.resolve(process.env.TEMPLATES || "public/templates");

const app = express();
const sqliteSheetService = new SQLiteSheetService();
const sheetService = new FormulaSheetService(sqliteSheetService);
const computeService = new DAGComputeService(sheetService);

// TODO: [Assignment 7] remove or comment out the above
//       definitions for sheetService and computeService

app.use(express.static(
  staticDir,
  useSPA ? { index: false } : {}
));
app.use(express.urlencoded()); // for parsing application/x-www-form-urlencoded


const router = newRouter(sheetService, computeService);
app.use( "/api", router);

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

    // TODO: [Assignment 7] remove the code above which stores
    //       the sheet. Instead, do this:
    //
    // redirectToSheet(sheet);

  } else {
    readCSV(template as string, templateDir)
      .then((sheet) => {
        const stored = sheetService.addSheet(sheet);
        redirectToSheet(stored);
      })
      .catch((err: Error) => {
        res.status(404).send(`Error: file not found`);
      });
  }

  function redirectToSheet(sheet: WithId<Sheet>) {

    // TODO: [Assignment 7]
    //       Change this function so it takes a 'Sheet', not a 'WithID<Sheet>'.
    // 
    //       Before you can redirect, you need
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
websockets(server, wsServer(sheetService, computeService)); 
