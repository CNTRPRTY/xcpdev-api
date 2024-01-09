/* global BigInt */
// https://github.com/eslint/eslint/issues/11524#issuecomment-473790677

import { Router } from "express";

import { db } from "../db.js";
import { QueriesExchain } from "../queries_exchain.js";
import { quantityWithDivisibility } from '../util.js'

// TODO btc / xcp values at 0, and not showing satoshis, could cause issues?

// xchain.io/api replacement
export const exchainRouter = Router();

exchainRouter.get('/address/:address', async (req, res) => {
  const { address } = req.params;

  const held = await QueriesExchain.getAddressBalanceAssetsCount(db, address);
  const owned = await QueriesExchain.getIssuerAssetsCount(db, address);

  const xcpBalanceText = await QueriesExchain.getXcpBalance(db, address);
  const xcp_balance = quantityWithDivisibility(true, BigInt(xcpBalanceText));

  res.status(200).json({
    address,
    assets: {
      held,
      owned,
    },
    estimated_value: {
      btc: "0",
      usd: "0",
      xcp: "0",
    },
    xcp_balance,
  });
});

exchainRouter.get('/asset/:assetName', async (req, res) => {

  // TODO (later)
  // - can req.params.assetName be the longname?
  // - genesis description, at least for now
  // - genesis divisibility (ignoring resets), at least for now
  // - genesis issuer, at least for now
  // - genesis locked, at least for now
  // - owner = issuer ok?
  // - supply = genesis quantity, at least for now

  const { assetName } = req.params;
  const asset_row = await QueriesExchain.getAssetRowByAssetName(db, assetName);

  if (!asset_row) {
    res.status(404).json({
      error: '404 Not Found'
    });
  }
  else {
    const issuance_row = await QueriesExchain.getGenesisIssuanceByAssetName(db, asset_row.asset_name);
    
    res.status(200).json({
      asset: asset_row.asset_name,
      asset_id: asset_row.asset_id,
      asset_longname: asset_row.asset_longname,
      description: issuance_row.description,
      divisible: issuance_row.divisible,
      estimated_value: {
        btc: "0",
        usd: "0",
        xcp: "0"
      },
      issuer: issuance_row.issuer,
      locked: issuance_row.locked,
      market_info: {
        btc: {
          floor: "0",
          price: "0"
        },
        xcp: {
          floor: "0",
          price: "0"
        }
      },
      owner: issuance_row.issuer,
      supply: issuance_row.quantity,
      type: "named"
    });
  }
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

exchainRouter.get('/holders/:asset', async (req, res) => {
  const { asset } = req.params;
  res.status(200).json({
    asset: "PEPECASH",
    asset_longname: "",
    data: [
      {
        address: "1BurnPepexxxxxxxxxxxxxxxxxxxAK33R",
        estimated_value: {
          btc: "1653.70218485",
          usd: "3107535.90",
          xcp: "363020.98938757"
        },
        percentage: "30.25174912",
        quantity: "302517491.15631030"
      },
      {
        address: "1AqUTSTGB6coR5AYcwFFM6nXoULapXqtdL",
        estimated_value: {
          btc: "564.41265737",
          usd: "1060609.71",
          xcp: "123899.96407927"
        },
        percentage: "10.32499701",
        quantity: "103249970.06606090"
      },
    ],
    total: 2
  });
});

exchainRouter.get('/issuances/:identifier', async (req, res) => {
  const { identifier } = req.params;
  // NOTE: identifier can be either address or asset or block
  res.status(200).json({
    data: [
      {
        asset: "A6360128538192758000",
        asset_longname: "",
        block_index: 779652,
        description: "STAMP:iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
        divisible: false,
        fee_paid: "0.00000000",
        issuer: "1GotRejB6XsGgMsM79TvcypeanDJRJbMtg",
        locked: false,
        quantity: "1",
        source: "1GotRejB6XsGgMsM79TvcypeanDJRJbMtg",
        status: "valid",
        timestamp: 1678151949,
        transfer: false,
        tx_hash: "eb3da8146e626b5783f4359fb1510729f4aad923dfac45b6f1f3a2063907147c",
        tx_index: 2262969
      },
      {
        asset: "A7337447728884561000",
        asset_longname: "",
        block_index: 779652,
        description: "stamp:iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
        divisible: false,
        fee_paid: "0.00000000",
        issuer: "1GotRejB6XsGgMsM79TvcypeanDJRJbMtg",
        locked: false,
        quantity: "1",
        source: "1GotRejB6XsGgMsM79TvcypeanDJRJbMtg",
        status: "valid",
        timestamp: 1678151949,
        transfer: false,
        tx_hash: "17686488353b65b128d19031240478ba50f1387d0ea7e5f188ea7fda78ea06f4",
        tx_index: 2262968
      }
    ],
    total: 2
  });
});

exchainRouter.get('/sends/:identifier', async (req, res) => {
  const { identifier } = req.params;
  // NOTE: identifier can be either address or asset or block
  res.status(200).json({
    data: [
      {
        asset: "DANKGALLERY",
        asset_longname: "",
        block_index: 779652,
        destination: "17UiAVenbUCMVBhAyg5PhvpMAfAyRhpXZE",
        memo: "",
        quantity: "1",
        source: "1Lhoi43wAkTgei1WK5drpSF9V8Y76jnj89",
        status: "valid",
        timestamp: 1678151949,
        tx_hash: "0541143295e7d2ea5400d46d334cce3db206696cc3c979f2983a6a8fb1e143d0",
        tx_index: 2262971
      },
      {
        asset: "PEPECASH",
        asset_longname: "",
        block_index: 779652,
        destination: "15r86m7teh6zwqa8o1Dqu7nrnSPkNRL5PW",
        memo: "",
        quantity: "3039.90000000",
        source: "1F5DVeTDs7EGcNnoqaRAmC4sEy8v5ELE7B",
        status: "valid",
        timestamp: 1678151949,
        tx_hash: "640c8b4ace7965af2380f96c677ac5027170a51a17f771651fe3e5be9b8eaa07",
        tx_index: 2262970
      },
      {
        asset: "WOJAKPARTY",
        asset_longname: "",
        block_index: 779652,
        destination: "1CCPbFbST8ruJrTGjm2Ss5aTAaqng4naBN",
        memo: "",
        quantity: "1",
        source: "1KDf6ZbetZfWqeQmCddupnjMnQN7fZTiiB",
        status: "valid",
        timestamp: 1678151949,
        tx_hash: "3c9d2e9c3f46b6f053ff27e7a9d57c963550cc58ca49c9e95cc3b2fd69200970",
        tx_index: 2262967
      }
    ],
    total: 3
  });
});

// 2. continue with the rest of the endpoints...
