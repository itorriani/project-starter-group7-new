import express, { Request, Response } from "express";
import { SheetCache } from "./sheet-cache.ts";
import { DAGComputeService } from "compute-svc";
import createRouter from "./api.ts";

const port = process.env.COMPUTE_PORT || "3002";
const host = process.env.COMPUTE_IP || "0.0.0.0";
const storageHost = process.env.STORAGE_IP || host;
const storagePort = process.env.STORAGE_PORT || "3001";

const app = express();
const sheetCache = new SheetCache(storageHost, parseInt(storagePort));
const computeService = new DAGComputeService(sheetCache);

app.use("/api", createRouter(
  computeService,
  sheetCache,
));

// Start the server
const server = app.listen(parseInt(port), host, (err: Error | undefined) => {
  if (typeof err === "undefined") {
    const addrInfo = server.address();
    const { address, port } = addrInfo && typeof addrInfo === "object" ? addrInfo : {};
    console.log(`Server running at http://${address}:${port}`);
  } else {
    console.log("Server NOT running: ", err);
  }
});
