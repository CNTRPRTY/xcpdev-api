import { Router } from "express";

import { db } from "../db.js";
import { QueriesExchain } from "../queries_exchain.js";
import { BITCOIN_VERSION, COUNTERPARTY_VERSION } from "../config.js";
import { cached_blocks, cached_mempool, cached_transactions } from "../index.js";

// xchain.io/api replacement
export const exchainRouter = Router();

exchainRouter.get('/address/:address', async (req, res) => {
  const { address } = req.params;
  const response = await QueriesExchain.getAddressInfo(db, address);

  res.status(200).json({
    address,
    ...response
  });
});

exchainRouter.get('/asset/:assetName', async (req, res) => {
  const { asset } = req.params;
  // 3. queries/utils required to build response to be done later
  res.status(200).json({
    // 1. build the response structure here, using mock values to quickly be able to test integration
    asset: 'RAREPEPE',
    asset_id: 136744851026,
    asset_longname: "",
    description: "http://myrarepepe.com/json/rarepepe.json",
    divisible: false,
    estimated_value: {
      btc: "6.54321000",
      usd: "285231.61032000",
      xcp: "56882.63931148"
    },
    issuer: "1GQhaWqejcGJ4GhQar7SjcCfadxvf5DNBD",
    locked: true,
    market_info: {
      btc: {
        floor: "13.25000000",
        price: "6.54321000"
      },
      xcp: {
        floor: "0.00000000",
        price: "1700.00000000"
      }
    },
    owner: "1GQhaWqejcGJ4GhQar7SjcCfadxvf5DNBD",
    supply: 298,
    type: "named"
  });
});

exchainRouter.get('/balances/:address', async (req, res) => {
  res.status(200).json({
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    data: [
      {
        asset: "BOBOCASH",
        asset_longname: "",
        collections: [
          "dank-directory",
          "rare-bobo"
        ],
        description: "https://xcp.dankinfo.art/danks/BOBOCASH.gif",
        estimated_value: {
          btc: "0.00000017",
          usd: "0.01",
          xcp: "0.00147903"
        },
        quantity: "1"
      }
    ]
  });
});

exchainRouter.get('/block/:block', async (req, res) => {
  const { block } = req.params;
  res.status(200).json({
    block_hash: "00000000000000000002ea8eb5df114c3f198c7ef5851435e8a4d8e7bd33121c",
    block_index: 779652,
    difficulty: 43053800000000,
    ledger_hash: "2dd9dbd7b7edea619889f3584d318527936986037124b9c8f71faebc11584d24",
    messages_hash: "d8e33ba16bf68e821787180c2bb2a182d48d43f0b74abe82460ef43c85ad6e93",
    previous_block_hash: "00000000000000000002124201cb18fe9fcbeb071115ac863f3d194469081376",
    timestamp: 1678151949,
    txlist_hash: "b68c784f9ccac2548241c2920ac1819f6df1b7e8306db593edd6204d7af65449",
  });
});


exchainRouter.get('/dispensers/:identifier', async (req, res) => {
  const { identifier } = req.params;
  // NOTE: identifier can be either address or asset or block
  res.status(200).json({
    data: [
      {
        asset: "PHOENIXCD",
        asset_longname: "",
        block_index: 750340,
        escrow_quantity: "1",
        give_quantity: "1",
        give_remaining: "1",
        satoshi_price: "0.00769000",
        satoshirate: "0.00769000",
        source: "1ChyGpY6qRcCiR9sezmQ97EqBHGGp5gfJF",
        status: "10",
        timestamp: 1661022194,
        tx_hash: "d3918fbda19f30887a91bd978a37976f8db6071cd4cd27ba75b120c6c5a74c15",
        tx_index: "2095824"
      },
    ]
  });
});

exchainRouter.get('/dispenses/:identifier', async (req, res) => {
  const { identifier } = req.params;
  // NOTE: identifier can be either address or asset or block or transaction
  res.status(200).json({
    data: [
      {
        address: "1ChyGpY6qRcCiR9sezmQ97EqBHGGp5gfJF",
        asset: "LAMAPEPE",
        asset_longname: "",
        block_index: 728085,
        btc_amount: "0.06380000",
        dispenser: "06a6005e861bcc1363536c7fcf6afaa612673c0aa96b30016f6ef0e2db2faf2f",
        quantity: "1",
        timestamp: 1647718176,
        tx_hash: "7801b2518ad08ea124410fef63cc6ba8e54101baea617ce06a14922cfd773a5b"
      },
    ]
  });
});

exchainRouter.get('/tx/:tx_hash', async (req, res) => {
  const { tx_hash } = req.params;
  // NOTE: identifier can be either address or asset or block or transaction
  res.status(200).json({
    block_index: 728085,
    btc_amount: "6380000",
    destination: "14d4MebjvmGS5SXUpW5sYFywEx3y8xXUn7",
    dispenser: "06a6005e861bcc1363536c7fcf6afaa612673c0aa96b30016f6ef0e2db2faf2f",
    source: "1ChyGpY6qRcCiR9sezmQ97EqBHGGp5gfJF",
    timestamp: "1647718176",
    tx_hash: "7801b2518ad08ea124410fef63cc6ba8e54101baea617ce06a14922cfd773a5b",
    tx_type: "Dispense"
  });
});



// 2. continue with the rest of the endpoints...
