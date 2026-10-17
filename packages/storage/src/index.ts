import express, { Request, Response } from "express";
import { FormulaSheetService, SQLiteSheetService } from "sheet-svc";
import apiRouter from "./api.ts";

const host = process.env.STORAGE_IP || "0.0.0.0";
const port = process.env.STORAGE_PORT || "3001";
const app = express();
const sheetService = new FormulaSheetService(
  new SQLiteSheetService()
)

app.use("/api", apiRouter(sheetService));

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
