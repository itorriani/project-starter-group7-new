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
      .then((targetResponse) => {
        if (!targetResponse.ok) {
          throw new ProxyError(targetResponse.status);
        }
        return targetResponse.json();
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        console.log(`Proxy error for ${req.originalUrl}:`, err);
        
        if (err instanceof ProxyError) {
          return res.status(err.status).send(`Error: ${err.message}`);
        }
        return res.status(500).send(`Error: ${err.message}`);
      });
  });

  proxy.get("/sheets/:id/cells", (req: Request, res: express.Response) => {
    return fetchFromTarget(req)
      .then((targetResponse) => {
        if (!targetResponse.ok) {
          throw new ProxyError(targetResponse.status);
        }
        return targetResponse.json();
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        console.log(`Proxy error for ${req.originalUrl}:`, err);
        
        if (err instanceof ProxyError) {
          return res.status(err.status).send(`Error: ${err.message}`);
        }
        return res.status(500).send(`Error: ${err.message}`);
      });
  });

  proxy.patch("/sheets/:id/cells", (req: Request, res: express.Response) => {
    return fetchFromTarget(req)
      .then((targetResponse) => {
        if (!targetResponse.ok) {
          throw new ProxyError(targetResponse.status);
        }
        return targetResponse.json();
      })
      .then((json) => res.send(json))
      .catch((err: Error) => {
        console.log(`Proxy error for ${req.originalUrl}:`, err);
        
        if (err instanceof ProxyError) {
          return res.status(err.status).send(`Error: ${err.message}`);
        }
        return res.status(500).send(`Error: ${err.message}`);
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
