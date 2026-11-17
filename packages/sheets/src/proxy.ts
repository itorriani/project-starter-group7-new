import express, { Request, Router } from "express";

function createProxy(targetHost: string, targetPort: number) {

  // ======== Assignment 7 ========
  //
  // Use the following function to implement a router which
  // _proxies_ requests to another service running on
  // the targetHost and targetPort given above.
  //
  // There are three routes to implement below.

  function fetchFromTarget(req: Request): Promise<Response> {
    const url = `http://${targetHost}:${targetPort}${req.originalUrl}`;

    console.log("Proxy request:", url);

    return fetch(url, {
      method: req.method,
      headers: Object.entries(req.headers)
        .map(([k, v]) => [k, typeof v === "undefined" ? "" : v.toString()]),
      body: req.body
    });
  }

  const proxy = Router();

  proxy.use(express.json())

  proxy.get("/sheets/:id", (req: Request, res: express.Response) => {
    fetchFromTarget(req)
      .then((res) => {
          // TODO: check the status, and return res.json()
          //
          //     You may want to throw a ProxyError (see class below)
          //     to make it easier to catch and forward the same error
          //     code to the client.
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        console.log(`Proxy error for ${req.originalUrl}:`, err);
        // TODO: if there was an error, set res.status() appropriately
        //       and send the response. If the response from
          //       fetchFromTarget had an error status, use the same
          //       code in the reply to your client
      });
  });

  proxy.get("/sheets/:id/cells", (req: Request, res: express.Response) => {
    return fetchFromTarget(req)
      .then((res) => {
        // TODO: check the status, and return res.json()
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        // TODO: if there was an error, set res.status() appropriately
        //       and send the response.
      });
  });

  proxy.patch("/sheets/:id/cells", (req: Request, res: express.Response) => {
    return fetchFromTarget(req)
      .then((res) => {
        // TODO: check the status, and return res.json()
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        // TODO: if there was an error, set res.status() appropriately
        //       and send the response.
      });
  });

  return proxy;
}

class ProxyError extends Error {
  status: number;

  constructor(stat: number) {
    super(`Proxy error, HTTP status = ${stat}`);
    this.status = stat;
  }
};

export default createProxy;
