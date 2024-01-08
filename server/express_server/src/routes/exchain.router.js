import { Router } from "express";

import { db } from "../db.js";
import { QueriesExchain } from "../queries_exchain.js";
import { BITCOIN_VERSION, COUNTERPARTY_VERSION } from "../config.js";
import { cached_blocks, cached_mempool, cached_transactions } from "../index.js";

// xchain.io/api replacement
export const exchainRouter = Router();

exchainRouter.get('/address/:address', async (req, res) => {
  const address = req.params.address;
  const data = {};
  data.address = address;
  const assets = {};
  const response = await QueriesExchain.getAddressInfo(db, address);
  
  res.status(200).json({
    address,
    ...response
  });
});