import { getBTCPrice, getXCPPrice } from './util.js';

function queryDBRows(db, sql, params_obj) {
    return new Promise(function (resolve, reject) {
        db.all(sql, params_obj, function (err, rows) {
            if (err) return reject(err);
            else return resolve(rows);
        });
    });
}



export class QueriesExchain {

    static async getAddressInfo(db, address) {
        const heldedQuery = `SELECT COUNT(*) AS helded FROM balances WHERE address = ? AND asset != 'XCP';`;
        const ownedQuery = `SELECT COUNT(*) AS owned FROM issuances WHERE issuer = ?;`;
        const xcpBalanceQuery = `SELECT quantity FROM balances WHERE address = ? AND asset = 'XCP';`;
        try {
            const countHelded = await queryDBRows(db, heldedQuery, [address]);
            const countOwned = await queryDBRows(db, ownedQuery, [address]);
            const xcpBalance = await queryDBRows(db, xcpBalanceQuery, [address]);
            //TODO: calculate estimated_value
            return {
                assets: {
                    held: countHelded[0]?.helded || 0,
                    owned: countOwned[0]?.owned || 0,
                },
                estimated_value: {
                    btc: "0",
                    usd: "0",
                    xcp: "0",
                },
                xcp_balance: (xcpBalance[0]?.quantity * 1e-8).toFixed(8) || 0,
            };
        } catch (error) {
            console.error('Internal server error', error);
            throw error;
        }
    }

    static async getAssetInfo(db, asset) {
        try {
            
            return {
                asset: asset.toUpperCase(),
            }
        } catch (error) {
            console.error('Internal server error', error);
            throw error;
        }
    }
}