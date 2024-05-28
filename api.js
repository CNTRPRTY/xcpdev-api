
const { Router } = require('express');

const Client = require('bitcoin-core');
const sqlite3 = require('better-sqlite3');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { Queries } = require('./queries');

// read only
const DB_PATH = '/data/counterparty/counterparty.db';
const db = sqlite3(DB_PATH, { readonly: true });

const client = new Client({
    host: 'bitcoind',
    network: 'mainnet',
    username: 'rpc',
    password: 'rpc'
});

const BITCOIN_VERSION = '0.21.1';
const COUNTERPARTY_VERSION = '10.1.1.CNTRPRTY';

const apiRouter = Router();


// DRY utils

async function getAssetMetadataMaybeQuery(db, asset_name) {
    let start;
    let end;
    let asset_metadata;
    let query1_timems = null;
    let query2_timems = null;
    if (asset_name === 'BTC') {
        asset_metadata = {
            asset: 'BTC',
            asset_longname: null,
            divisible: true,
        };
    }
    else if (asset_name === 'XCP') {
        asset_metadata = {
            asset: 'XCP',
            asset_longname: null,
            divisible: true,
        };
    }
    else {

        start = new Date().getTime();
        asset_metadata = await Queries.getIssuanceMetadataByAssetName(db, asset_name);
        end = new Date().getTime();
        query1_timems = end - start;

        // depends on COUNTERPARTY_VERSION
        // detecting reset assets (this project started from 9.59.6 and then 9.60 added reset)
        if (!COUNTERPARTY_VERSION.startsWith('9.59')) {

            start = new Date().getTime();
            const query2 = await Queries.getIssuanceMetadataResetsCheck(db, asset_name);
            end = new Date().getTime();
            query2_timems = end - start;

            if (query2.length) {
                asset_metadata.resets = query2;
            }
        }
    }

    return {
        asset_metadata,
        query1_timems,
        query2_timems,
    };
}

function timeIsoFormat(block_time) {
    return (new Date(block_time * 1000).toISOString()).replace('.000Z', 'Z');
}

function range(start, stop, step) {
    // range(0, 4, 1) => [0, 1, 2, 3, 4]
    return Array.from({ length: (stop - start) / step + 1 }, (__, i) => start + (i * step));
}


apiRouter.get('/', async (req, res) => {

    const bitcoind = await client.command([
        { method: 'getnetworkinfo', parameters: [] },
        { method: 'getblockchaininfo', parameters: [] },
    ]);

    res.status(200).json({
        // doc: 'https://xcp.dev/api',
        node: { // only at tip (because is in the url now)
            BITCOIN_VERSION,
            COUNTERPARTY_VERSION,
            bitcoind: {
                getnetworkinfo: bitcoind[0],
                getblockchaininfo: bitcoind[1],
            },
        },
    });
    // res.status(200).json({
    //     api: true,
    // });
});

apiRouter.get('/tip', async (req, res) => {
    const start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    const end = new Date().getTime();
    res.status(200).json({
        tip_blocks_row,
        query_timems: end - start,
    });
});


///////////////////////////////////////
// homepage minute scheduled cached data
///////////////////////////////////////

async function updateMempoolCache() {
    const start = new Date().getTime();
    const mempool = await Queries.getMempoolRows(db);
    const end = new Date().getTime();
    cached_mempool = mempool;
    cached_mempool_timems = end - start;
}

async function updateBlocksCache() {
    let start;
    let end;

    start = new Date().getTime();
    let blocks_all = await Queries.getBlocksLatest(db);
    end = new Date().getTime();
    cached_blocks_query1_timems = end - start;

    const from_block_index_row = blocks_all[blocks_all.length - 1];
    const to_block_index_row = blocks_all[0];

    start = new Date().getTime();
    const transactions_per_block = await Queries.getTransactionsCountFromBlockRange(db, from_block_index_row.block_index, to_block_index_row.block_index);
    // const transactions_per_block = await Queries.getTransactionsCountFromBlockToTip(db, from_block_index_row.block_index);
    end = new Date().getTime();
    cached_blocks_query2_timems = end - start;

    start = new Date().getTime();
    const messages_per_block = await Queries.getMessagesCountFromBlockRange(db, from_block_index_row.block_index, to_block_index_row.block_index);
    // const messages_per_block = await Queries.getMessagesCountFromBlockToTip(db, from_block_index_row.block_index);
    end = new Date().getTime();
    cached_blocks_query3_timems = end - start;

    const block_transactions_dict = {};
    for (const block of transactions_per_block) {
        block_transactions_dict[block.block_index] = block.transactions;
    }
    const block_messages_dict = {};
    for (const block of messages_per_block) {
        block_messages_dict[block.block_index] = block.messages;
    }

    blocks_all = blocks_all.map((row) => {
        let transactions_count = block_transactions_dict[row.block_index] ? block_transactions_dict[row.block_index] : 0;
        let messages_count = block_messages_dict[row.block_index] ? block_messages_dict[row.block_index] : 0;
        return {
            ...row,
            transactions_count,
            messages_count,
        };

    });

    cached_blocks = blocks_all;
}

async function updateTransactionsCache() {
    const start = new Date().getTime();
    const btc_transactions_latest = await Queries.getTransactionsLatest(db);
    const end = new Date().getTime();
    cached_transactions = btc_transactions_latest;
    cached_transactions_timems = end - start;
}

// cached responses
let cached_mempool = [];
let cached_mempool_timems = null;
let cached_blocks = [];
let cached_blocks_query1_timems = null;
let cached_blocks_query2_timems = null;
let cached_blocks_query3_timems = null;
let cached_transactions = [];
let cached_transactions_timems = null;

async function updateMinuteCache() {
    await updateMempoolCache();
    await updateBlocksCache();
    await updateTransactionsCache();
}

///////////////////////////////////////
///////////////////////////////////////


apiRouter.get('/mempool', async (req, res) => {
    res.status(200).json({
        mempool: cached_mempool,
        query_timems: cached_mempool_timems,
    });
});

apiRouter.get('/blocks/:blockIndex', async (req, res) => {
    // app.get('/blocks/:blockTime', async (req, res) => { // would be cool but is not indexed... (also good for clear difference to /block/blockIndex)
    let start;
    let end;

    let block_index;
    try {
        block_index = Number(req.params.blockIndex);
        if (Number.isNaN(block_index) || block_index < 0) throw Error();
    }
    catch (err) {
        res.status(400).json({
            error: '400 Bad Request',
        });
        return;
    }
    // const block_index = Number(req.params.blockIndex);
    const to_index = Number(block_index) + 99;

    start = new Date().getTime();
    let blocks_all = await Queries.getBlocksInRange(db, block_index, to_index);
    end = new Date().getTime();
    const query1_timems = end - start;

    // get counts
    start = new Date().getTime();
    const transactions_per_block = await Queries.getTransactionsCountFromBlockRange(db, block_index, to_index);
    end = new Date().getTime();
    const query2_timems = end - start;

    start = new Date().getTime();
    const messages_per_block = await Queries.getMessagesCountFromBlockRange(db, block_index, to_index);
    end = new Date().getTime();
    const query3_timems = end - start;

    const block_transactions_dict = {};
    for (const block of transactions_per_block) {
        block_transactions_dict[block.block_index] = block.transactions;
    }
    const block_messages_dict = {};
    for (const block of messages_per_block) {
        block_messages_dict[block.block_index] = block.messages;
    }

    blocks_all = blocks_all.map((row) => {
        let transactions_count = block_transactions_dict[row.block_index] ? block_transactions_dict[row.block_index] : 0;
        let messages_count = block_messages_dict[row.block_index] ? block_messages_dict[row.block_index] : 0;
        return {
            ...row,
            transactions_count,
            messages_count,
        };

    });


    res.status(200).json({
        node: {
            BITCOIN_VERSION,
            COUNTERPARTY_VERSION,
        },
        from_index: block_index,
        to_index,
        blocks: blocks_all,
        query1_timems,
        query2_timems,
        query3_timems,
    });
});

apiRouter.get('/blocks', async (req, res) => {
    res.status(200).json({
        blocks: cached_blocks,
        query1_timems: cached_blocks_query1_timems,
        query2_timems: cached_blocks_query2_timems,
        query3_timems: cached_blocks_query3_timems,
    });
});

apiRouter.get('/block/:blockIndex/transactions', async (req, res) => {
    const block_index = req.params.blockIndex;
    const start = new Date().getTime();
    const transactions = await Queries.getTransactionsRowsByBlock(db, block_index);
    const end = new Date().getTime();
    res.status(200).json({
        transactions,
        query_timems: end - start,
    });
});

apiRouter.get('/block/:blockIndex/messages', async (req, res) => {
    const block_index = req.params.blockIndex;
    const start = new Date().getTime();
    const messages = await Queries.getMessagesRowsByBlock(db, block_index);
    const end = new Date().getTime();
    res.status(200).json({
        messages,
        query_timems: end - start,
    });
});

apiRouter.get('/block/:blockIndex', async (req, res) => {
    let start;
    let end;

    let block_index;
    try {
        block_index = Number(req.params.blockIndex);
        if (Number.isNaN(block_index) || block_index < 0) throw Error();
    }
    catch (err) {
        res.status(400).json({
            error: '400 Bad Request',
        });
        return;
    }

    const BLOCK_FIRST_MAINNET = 278270;
    if (block_index < BLOCK_FIRST_MAINNET) {

        start = new Date().getTime();
        const command1 = await client.command([
            { method: 'getblockhash', parameters: [block_index] },
        ]);
        const command2 = await client.command([
            { method: 'getblock', parameters: [command1[0], 1] },
        ]);
        end = new Date().getTime();

        const bitcoind_block = command2[0];
        // simulating a "row"
        const block_row = {
            block_index,
            block_hash: bitcoind_block.hash,
            block_time: bitcoind_block.time,
            previous_block_hash: bitcoind_block.previousblockhash,
            difficulty: bitcoind_block.difficulty,
            ledger_hash: "",
            txlist_hash: "",
            messages_hash: ""
        };
        res.status(200).json({
            block_row,
            timems: end - start,
        });
        return;
    }

    start = new Date().getTime();
    const block_row = await Queries.getBlocksRow(db, block_index);
    end = new Date().getTime();
    if (!block_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            block_row,
            query_timems: end - start,
        });
    }
});

apiRouter.get('/blockhash/:blockHash', async (req, res) => {
    const block_hash = req.params.blockHash;
    const start = new Date().getTime();
    const block_row = await Queries.getBlocksRowByBlockHash(db, block_hash);
    const end = new Date().getTime();
    if (!block_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            block_row,
            query_timems: end - start,
        });
    }
});

apiRouter.get('/transactions/dispensers/:txHash', async (req, res) => {
    let start;
    let end;

    const tx_hash = req.params.txHash;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const dispensers_row = await Queries.getDispensersRow(db, tx_hash);
    end = new Date().getTime();
    const dispensers_row_timems = end - start;

    if (!dispensers_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {

        const asset_metadata_obj = await getAssetMetadataMaybeQuery(db, dispensers_row.asset);
        const asset_metadata_obj_query1_timems = asset_metadata_obj.query1_timems;
        const asset_metadata_obj_query2_timems = asset_metadata_obj.query2_timems;

        start = new Date().getTime();
        const dispenses_rows = await Queries.getDispensesRows(db, tx_hash);
        end = new Date().getTime();
        const dispenses_rows_timems = end - start;

        res.status(200).json({
            tip_blocks_row,
            query1_timems: tip_blocks_row_timems,
            dispensers_row,
            query2_timems: dispensers_row_timems,

            // TODO:
            // - should be renamed BTC/XCP are not issuances...
            // - row/rows needs to be consistent!
            issuances_row: [asset_metadata_obj.asset_metadata],
            query3_timems: asset_metadata_obj_query1_timems,
            query4_timems: asset_metadata_obj_query2_timems,
            // issuances_row,

            dispenses_rows,
            query5_timems: dispenses_rows_timems,
        });
    }
});

apiRouter.get('/transactions/orders/:txHash', async (req, res) => {
    let start;
    let end;

    const tx_hash = req.params.txHash;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const orders_row = await Queries.getOrdersRow(db, tx_hash);
    end = new Date().getTime();
    const orders_row_timems = end - start;

    const get_asset_metadata_obj = await getAssetMetadataMaybeQuery(db, orders_row.get_asset);
    const get_asset_metadata_obj_query1_timems = get_asset_metadata_obj.query1_timems;
    const get_asset_metadata_obj_query2_timems = get_asset_metadata_obj.query2_timems;

    const give_asset_metadata_obj = await getAssetMetadataMaybeQuery(db, orders_row.give_asset);
    const give_asset_metadata_obj_query1_timems = give_asset_metadata_obj.query1_timems;
    const give_asset_metadata_obj_query2_timems = give_asset_metadata_obj.query2_timems;

    start = new Date().getTime();
    const order_matches_rows = await Queries.getOrderMatchesRows(db, tx_hash);
    end = new Date().getTime();
    const order_matches_rows_timems = end - start;

    let btcpays_rows = [];
    let btcpays_rows_timems = null;
    if (
        orders_row.get_asset === 'BTC' ||
        orders_row.give_asset === 'BTC'
    ) {
        start = new Date().getTime();
        btcpays_rows = await Queries.getOrderMatchesBtcpaysRows(db, tx_hash);
        end = new Date().getTime();
        btcpays_rows_timems = end - start;
    }
    if (!orders_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            tip_blocks_row,
            query1_timems: tip_blocks_row_timems,
            orders_row,
            query2_timems: orders_row_timems,

            // TODO:
            // - should be renamed BTC/XCP are not issuances...
            // - row/rows needs to be consistent!
            get_issuances_row: [get_asset_metadata_obj.asset_metadata],
            query3_timems: get_asset_metadata_obj_query1_timems,
            query4_timems: get_asset_metadata_obj_query2_timems,
            // get_issuances_row,
            give_issuances_row: [give_asset_metadata_obj.asset_metadata],
            query5_timems: give_asset_metadata_obj_query1_timems,
            query6_timems: give_asset_metadata_obj_query2_timems,
            // give_issuances_row,

            order_matches_rows,
            query7_timems: order_matches_rows_timems,
            btcpays_rows,
            query8_timems: btcpays_rows_timems,
        });
    }
});

apiRouter.get('/transactions/:txIndex', async (req, res) => {
    let tx_index;
    try {
        tx_index = Number(req.params.txIndex);
        if (Number.isNaN(tx_index) || tx_index < 0) throw Error();
    }
    catch (err) {
        res.status(400).json({
            error: '400 Bad Request',
        });
        return;
    }
    // const tx_index = Number(req.params.txIndex);
    // get the transactions including the tx and the next 100 transactions
    const to_index = Number(tx_index) + 99;
    // const to_index = Number(tx_index) + 999;
    const start = new Date().getTime();
    const transactions = await Queries.getTransactionsFromTxIndexToTxIndex(db, tx_index, to_index);
    const end = new Date().getTime();
    res.status(200).json({
        node: {
            BITCOIN_VERSION,
            COUNTERPARTY_VERSION,
        },
        from_index: tx_index,
        to_index,
        transactions,
        query_timems: end - start,
    });
});

apiRouter.get('/transactions', async (req, res) => {
    res.status(200).json({
        transactions: cached_transactions,
        query_timems: cached_transactions_timems,
    });
});

apiRouter.get('/txindex/:txIndex', async (req, res) => {
    const tx_index = req.params.txIndex;
    const start = new Date().getTime();
    const transaction_row = await Queries.getTransactionsRowByTxIndex(db, tx_index);
    const end = new Date().getTime();
    if (!transaction_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            transaction_row,
            query_timems: end - start,
        });
    }
});

apiRouter.get('/tx/:txHash', async (req, res) => {
    let start;
    let end;
    let transaction_timems;
    let mempool_timems = null;

    const tx_hash = req.params.txHash;
    // transaction could be in the mempool
    // but first try get direct from table

    let mempool = [];

    start = new Date().getTime();
    const transaction = await Queries.getTransactionsRow(db, tx_hash);
    end = new Date().getTime();
    transaction_timems = end - start;

    if (!transaction) { // try if is in mempool
        start = new Date().getTime();
        mempool = await Queries.getMempoolRowsByTxHash(db, tx_hash);
        end = new Date().getTime();
        mempool_timems = end - start;
    }

    if (!transaction && !mempool.length) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            transaction,
            query1_timems: transaction_timems,
            mempool,
            query2_timems: mempool_timems,
        });
    }
});

apiRouter.get('/address/:address/dispensers/open', async (req, res) => {
    const address = req.params.address;
    const start = new Date().getTime();
    const dispensers_open = await Queries.getOpenDispensersRowsByAddress(db, address);
    const end = new Date().getTime();
    res.status(200).json({
        dispensers_open,
        query_timems: end - start,
    });
});

apiRouter.get('/address/:address/dispensers/closed', async (req, res) => {
    const address = req.params.address;
    const start = new Date().getTime();
    const dispensers_closed = await Queries.getClosedDispensersRowsByAddress(db, address);
    const end = new Date().getTime();
    res.status(200).json({
        dispensers_closed,
        query_timems: end - start,
    });
});

apiRouter.get('/address/:address/broadcasts', async (req, res) => {
    const address = req.params.address;
    const start = new Date().getTime();
    const broadcasts = await Queries.getBroadcastsRowsByAddress(db, address);
    const end = new Date().getTime();
    res.status(200).json({
        broadcasts,
        query_timems: end - start,
    });
});

apiRouter.get('/address/:address/issuances', async (req, res) => {
    const address = req.params.address;
    const start = new Date().getTime();
    const issuances = await Queries.getIssuancesRowsByAssetsByIssuer(db, address);
    const end = new Date().getTime();
    res.status(200).json({
        issuances,
        query_timems: end - start,
    });
});

apiRouter.get('/address/:address/balances', async (req, res) => {
    let start;
    let end;
    let query1_timems;
    let query2_timems;
    let query3_timems = null;

    const address = req.params.address;

    start = new Date().getTime();
    let query1 = await Queries.getBalancesRowsByAddressWithoutXcp(db, address);
    end = new Date().getTime();
    query1_timems = end - start;

    start = new Date().getTime();
    const query2 = await Queries.getBalancesRowsByAddressXcp(db, address);
    end = new Date().getTime();
    query2_timems = end - start;

    // depends on COUNTERPARTY_VERSION
    // detecting reset assets (this project started from 9.59.6 and then 9.60 added reset)
    if (!COUNTERPARTY_VERSION.startsWith('9.59')) {

        start = new Date().getTime();
        const query3 = await Queries.getBalancesResetsCheck(db, address);
        end = new Date().getTime();
        query3_timems = end - start;

        // making the above query already affects EVERYONE (in the latest COUNTERPARTY_VERSION), but the next only affects people that ACTUALLY have/had reset assets
        if (query3.length) {
            const reset_dict = {};
            for (const reset_row of query3) {
                if (reset_dict[reset_row.asset]) {
                    reset_dict[reset_row.asset].push(reset_row);
                }
                else {
                    reset_dict[reset_row.asset] = [reset_row];
                }
            }
            query1 = query1.map(row => {
                if (reset_dict[row.asset]) {
                    row.resets = reset_dict[row.asset];
                }
                return row;
            });
        }
    }

    const balances = [
        ...query1,
        ...query2.map(row => {
            return {
                ...row,
                asset_longname: null,
                divisible: true,
            }
        }
        ),
    ];

    res.status(200).json({
        balances,
        query1_timems,
        query2_timems,
        query3_timems,
    });
});

apiRouter.get('/assets/:fromString', async (req, res) => {
    let start;
    let end;

    const from_string = req.params.fromString;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const assets = await Queries.getAssetsRange(db, from_string);
    end = new Date().getTime();

    const from_asset_adjusted = assets.length ? assets[0].asset_name : from_string;
    const to_asset = assets.length ? assets[assets.length - 1].asset_name : from_string;

    res.status(200).json({
        from_asset: from_asset_adjusted,
        to_asset,
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        assets,
        query2_timems: end - start,
    });
});

// app.get('/asset/:assetName/dispensers/open', async (req, res) => {
apiRouter.get('/asset/:assetName/escrows/dispensers', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const dispensers_open = await Queries.getDispensersRowsByAssetName(db, asset_name);
    end = new Date().getTime();
    const dispensers_open_timems = end - start;

    res.status(200).json({
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        dispensers_open,
        query2_timems: dispensers_open_timems,
    });
});

// app.get('/asset/:assetName/orders/give', async (req, res) => {
apiRouter.get('/asset/:assetName/escrows/orders', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const orders_give_open = await Queries.getOrdersRowsGiveAssetByAssetName(db, asset_name);
    end = new Date().getTime();
    const orders_give_open_timems = end - start;

    res.status(200).json({
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        orders_give_open,
        query2_timems: orders_give_open_timems,
    });
});

// app.get('/asset/:assetName/orders/get', async (req, res) => {
apiRouter.get('/asset/:assetName/exchanges', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const orders_get_open = await Queries.getOrdersRowsGetAssetByAssetName(db, asset_name);
    end = new Date().getTime();
    const orders_get_open_timems = end - start;

    res.status(200).json({
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        orders_get_open,
        query2_timems: orders_get_open_timems,
    });
});

apiRouter.get('/asset/:assetName/issuances', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const issuances = await Queries.getIssuancesRowsByAssetName(db, asset_name);
    end = new Date().getTime();
    const issuances_timems = end - start;

    res.status(200).json({
        tip_blocks_row, // included in all asset page calls for client side verification (but still not perfect)
        query1_timems: tip_blocks_row_timems,
        issuances,
        query2_timems: issuances_timems,
    });
});

apiRouter.get('/asset/:assetName/destructions', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    start = new Date().getTime();
    const destructions = await Queries.getDestructionsRowsByAssetName(db, asset_name);
    end = new Date().getTime();
    const destructions_timems = end - start;

    res.status(200).json({
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        destructions,
        query2_timems: destructions_timems,
    });
});

apiRouter.get('/asset/:assetName/balances', async (req, res) => {
    let start;
    let end;

    const asset_name = req.params.assetName;

    start = new Date().getTime();
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    end = new Date().getTime();
    const tip_blocks_row_timems = end - start;

    const asset_metadata_obj = await getAssetMetadataMaybeQuery(db, asset_name);
    const asset_metadata_obj_query1_timems = asset_metadata_obj.query1_timems;
    const asset_metadata_obj_query2_timems = asset_metadata_obj.query2_timems;

    start = new Date().getTime();
    const balances_rows = await Queries.getBalancesRowsByAssetName(db, asset_name);
    end = new Date().getTime();
    const balances_rows_timems = end - start;

    res.status(200).json({
        tip_blocks_row,
        query1_timems: tip_blocks_row_timems,
        asset_metadata: asset_metadata_obj,
        query2_timems: asset_metadata_obj_query1_timems,
        query3_timems: asset_metadata_obj_query2_timems,
        balances_rows,
        query4_timems: balances_rows_timems,
    });
});

apiRouter.get('/asset/:assetName/subassets', async (req, res) => {
    const asset_name = req.params.assetName;
    const start = new Date().getTime();
    const assets = await Queries.getAssetsRowsForAssetLongname(db, asset_name);
    const end = new Date().getTime();
    res.status(200).json({
        assets,
        query_timems: end - start,
    });
});

apiRouter.get('/asset/:assetName', async (req, res) => {
    const asset_name = req.params.assetName;
    const start = new Date().getTime();
    const asset_row = await Queries.getAssetsRowByAssetName(db, asset_name);
    const end = new Date().getTime();
    if (!asset_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            asset_row,
            query_timems: end - start,
        });
    }
});

apiRouter.get('/subasset/:assetLongname', async (req, res) => {
    const asset_longname = req.params.assetLongname;
    const start = new Date().getTime();
    const asset_row = await Queries.getAssetsRowByAssetLongname(db, asset_longname);
    const end = new Date().getTime();
    if (!asset_row) {
        res.status(404).json({
            error: '404 Not Found'
        });
    }
    else {
        res.status(200).json({
            asset_row,
            query_timems: end - start,
        });
    }
});


///////////////////////////////////////
// messages pages years feature section, hourly updated cached data
///////////////////////////////////////

// https://github.com/CounterpartyXCP/counterparty-core/blob/6378d81dcef9dc3646111e815ed427268b09e9a5/counterparty-core/counterpartycore/lib/blocks.py#L61
const TABLES = [
    // "balances", // not included in messages... :P
    "credits",
    "debits",
    // "messages",
    "order_match_expirations",
    "order_matches",
    "order_expirations",
    "orders",
    "bet_match_expirations",
    "bet_matches",
    "bet_match_resolutions",
    "bet_expirations",
    "bets",
    "broadcasts",
    "btcpays",
    "burns",
    "cancels",
    "dividends",
    "issuances",
    "sends",
    "rps_match_expirations",
    "rps_expirations",
    "rpsresolves",
    "rps_matches",
    "rps",
    "destructions",
    // "assets",
    // "addresses",
    "sweeps",
    "dispensers",
    "dispenses",
    "dispenser_refills",
];

async function getYearsMessages() {
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    const tip_blocks_row_year = Number(timeIsoFormat(tip_blocks_row.block_time).split('-')[0]);

    // from 2014 to tip
    const years = range(2014, tip_blocks_row_year, 1);

    const years_messages = [];
    for (const year of years) {
        const yearDate = new Date(`${year}-01-01T00:00:00Z`);
        const yearTime = yearDate.getTime()/1000;
        const start = new Date().getTime();

        const first_message = await Queries.getBlockRowFirstAfterTimeMessages(db, yearTime);

        const end = new Date().getTime();
        const query_timems = end - start;
        years_messages.push({
            year,
            message_row: first_message,
            query_timems
        });
    }

    return years_messages;
}

async function getYearsMessagesCategory(category) {
    const tip_blocks_row = await Queries.getBlocksRowTip(db);
    const tip_blocks_row_year = Number(timeIsoFormat(tip_blocks_row.block_time).split('-')[0]);

    // from 2014 to tip
    const years = range(2014, tip_blocks_row_year, 1);

    const years_messages = [];
    for (const year of years) {
        const yearDate = new Date(`${year}-01-01T00:00:00Z`);
        const yearTime = yearDate.getTime()/1000;
        const start = new Date().getTime();

        const first_message = await Queries.getBlockRowFirstAfterTimeCategoryMessages(db, yearTime, category);

        const end = new Date().getTime();
        const query_timems = end - start;
        years_messages.push({
            year,
            message_row: first_message,
            query_timems
        });
    }

    return years_messages;
}

// cached responses
let cached_years_messages = [];
let cached_years_messages_category = {};

async function updateHourCache() {
    cached_years_messages = await getYearsMessages();

    for (const table of TABLES) {
        cached_years_messages_category[table] = await getYearsMessagesCategory(table);
    }
}

apiRouter.get('/years/messages/:category', async (req, res) => {

    const category = req.params.category;

    if (!(category in cached_years_messages_category)) {
        res.status(404).json({
            error: '404 Not Found'
        });
        return;
    }

    const years_messages = cached_years_messages_category[category];
    // const years_messages = await getYearsMessagesCategory(category);
    
    res.status(200).json({
        category,
        years_messages,
    });
});

apiRouter.get('/years/messages', async (req, res) => {
    res.status(200).json({
        years_messages: cached_years_messages,
        // years_messages: await getYearsMessages(),
    });
});

///////////////////////////////////////
///////////////////////////////////////


apiRouter.get('/messages/:messageIndex/category/:category', async (req, res) => {
    let message_index;
    try {
        message_index = Number(req.params.messageIndex);
        if (Number.isNaN(message_index) || message_index < 0) throw Error();
    }
    catch (err) {
        res.status(400).json({
            error: '400 Bad Request',
        });
        return;
    }

    const category = req.params.category;
    if (!(category in cached_years_messages_category)) {
        res.status(404).json({
            error: '404 Not Found'
        });
        return;
    }

    const start = new Date().getTime();
    const messages = await Queries.getMessagesFromMessageIndexTable(db, message_index, category);
    const end = new Date().getTime();

    const from_index_adjusted = messages.length ? messages[0].message_index : message_index;
    const to_index = messages.length ? messages[messages.length - 1].message_index : message_index;
    
    // cleanup:

    // first remove years without message results
    const _years = cached_years_messages_category[category].flatMap((row) => {
        if (!row.message_row) {
            // flatMap: return empty to remove the item
            return [];
        }
        else {
            // flatMap: return a 1-element array to keep the item
            return [
                [`${row.year}`, row.message_row.message_index]
            ];
        }
    });
    
    // then removing early repeated data years (quirk of query used)
    const years = [];
    for (let i = 0; i < _years.length; i++) {
        // if is last, just include it
        if (i === (_years.length - 1)) {
            years.push(_years[i]);
        }
        else {
            // for the rest, only include if different from next year
            const i_year = _years[i];
            const i_year_message_index = i_year[1];
            const next_year = _years[i + 1];
            const next_year_message_index = next_year[1];
            if (next_year_message_index !== i_year_message_index) {
                years.push(i_year);
            }
        }
    }

    res.status(200).json({
        node: {
            BITCOIN_VERSION,
            COUNTERPARTY_VERSION,
        },
        from_index: from_index_adjusted,
        to_index,
        messages,
        query_timems: end - start,

        years,
    });
});

apiRouter.get('/messages/:messageIndex', async (req, res) => {
    let message_index;
    try {
        message_index = Number(req.params.messageIndex);
        if (Number.isNaN(message_index) || message_index < 0) throw Error();
    }
    catch (err) {
        res.status(400).json({
            error: '400 Bad Request',
        });
        return;
    }
    // const message_index = Number(req.params.messageIndex);
    // get the messages including the tx and the next 100 transactions
    const to_index = Number(message_index) + 99;
    // const to_index = Number(message_index) + 999;
    const start = new Date().getTime();
    const messages = await Queries.getMessagesFromMessageIndexToMessageIndex(db, message_index, to_index);
    const end = new Date().getTime();
    
    const years = cached_years_messages.map((row) => {
        return [`${row.year}`, row.message_row.message_index];
    });
    
    res.status(200).json({
        node: {
            BITCOIN_VERSION,
            COUNTERPARTY_VERSION,
        },
        from_index: message_index,
        to_index,
        messages,
        query_timems: end - start,

        years,
    });
});

// non-standard on purpose
apiRouter.get('/blocks_messages_range/:startBlockIndex/:endBlockIndex', async (req, res) => {
    let start;
    let end;
    let query1_timems;
    let query2_timems;

    const start_block_index = req.params.startBlockIndex;
    const end_block_index = req.params.endBlockIndex;

    // first get the blocks in the range
    start = new Date().getTime();
    const blocks_all = await Queries.getBlocksInRange(db, start_block_index, end_block_index);
    end = new Date().getTime();
    query1_timems = end - start;

    // then get the messages in the range of blocks
    start = new Date().getTime();
    const messages = await Queries.getMessagesByBlocksInRange(db, start_block_index, end_block_index);
    end = new Date().getTime();
    query2_timems = end - start;

    // do a dict for easy access
    const block_messages_dict = {};
    for (const message_row of messages) {
        if (block_messages_dict[message_row.block_index]) {
            block_messages_dict[message_row.block_index].push(message_row);
        }
        else { // first message for block
            block_messages_dict[message_row.block_index] = [message_row];
        }
    }

    // then add the messages to the blocks
    let blocks_with_messages = [];
    for (const block of blocks_all) {
        blocks_with_messages.push({
            ...block,
            _messages: (block_messages_dict[block.block_index] ? block_messages_dict[block.block_index] : []),
        });
    }

    res.status(200).json({
        blocks: blocks_with_messages,
        query1_timems,
        query2_timems,
    });
});


// counterparty-lib api proxy
async function libApiRequest(method, params = null) {
    const url = `http://counterparty-core:4000/api/`; // trailing slash required!
    // const url = `http://0.0.0.0:4000/api/`; // trailing slash required!
    const username = 'rpc';
    const password = 'rpc';
    const options = {
        "method": "POST",
        "headers": {
            "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
            "Content-Type": "application/json",
        }
    };
    const body = {
        "jsonrpc": "2.0",
        "id": 0,
        "method": method
    };
    if (params) {
        body.params = params;
    }
    options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
        const errorTextPre = await response.text(); // can come empty
        const errorText = errorTextPre.trim().length === 0 ? '' : ` ${errorTextPre}`; // add space if not empty
        throw Error(`[${response.status}:${response.statusText}]${errorText}`);
    }
    const data = await response.json();

    return data;
}
apiRouter.post('/lib_api_proxy', async (req, res) => {
    try {
        // no validation / sanitization, forwarding all this responsibility to counterparty-lib        
        const method = req.body.method;
        const params = req.body.params;
        const start = new Date().getTime();
        const lib_response = await libApiRequest(method, params);
        const end = new Date().getTime();
        res.status(200).json({
            node: {
                BITCOIN_VERSION,
                COUNTERPARTY_VERSION,
            },
            lib_response,
            timems: end - start,
        });
    }
    catch (err) {
        console.log(`lib_api_proxy error:`);
        console.log(err);
        console.log(`req.body: ${JSON.stringify(req.body)}`);
        res.status(500).json({
            error: '500 error!',
        });
    }
});


module.exports = {
    apiRouter,
    updateMinuteCache,
    updateHourCache
};
