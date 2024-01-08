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

exchainRouter.get('/asset/:assetName', async (req, res) => {
  // 3. queries/utils required to build response to be done later
  res.status(200).json({
    // 1. build the response structure here, using mock values to quickly be able to test integration
    wip: true,
  });
});

exchainRouter.get('/balances/:address', async (req, res) => {
  res.status(200).json({
    wip: true,
  });
});

// 2. continue with the rest of the endpoints...
