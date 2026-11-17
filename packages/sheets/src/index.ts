import express, { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { Sheet, WithId, newSheet } from "@poly-sheets/types";
import apiProxy from "./proxy.ts"
import { readCSV } from "./csv.ts";
import websockets from "./websockets.ts";
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


// TODO: [Assignment 7] remove or comment out the above
//       definitions for sheetService and computeService

app.use(express.static(
  staticDir,
  useSPA ? { index: false } : {}
));
app.use(express.urlencoded()); // for parsing application/x-www-form-urlencoded

app.use("/api", apiProxy(computeHost, parseInt(computePort)));


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
    redirectToSheet(sheet);

  } else {
    readCSV(template as string, templateDir)
      .then((sheet) => {
        redirectToSheet(sheet);
      })
      .catch((err: Error) => {
        res.status(404).send(`Error: file not found`);
      });
  }

  function redirectToSheet(sheet: Sheet) {
     fetch(`http://${computeHost}:${computePort}/api/sheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sheet),
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to create sheet: ${response.status}`);
      }
      return response.json();
    })
    .then((createdSheet) => {
      res.redirect(`/app/${createdSheet.id}`);
    })
    .catch((err: Error) => {
      console.log("Could not create sheet:", err);
      res.status(500).send("Error: could not create sheet");
    });
  }
});


// Start the server
const server = app.listen(port, () => {
  const showServerLocMsg : string = 
  `Server listening at port ${port} at IPv4 0.0.0.0`;
  console.log( showServerLocMsg );  
});
websockets(server, wsServer(computeHost, parseInt(computePort)));

