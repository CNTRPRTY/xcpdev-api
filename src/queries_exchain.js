import { getBTCPrice, getXCPPrice } from './util.js';

function queryDBRows(db, sql, params_obj) {
    return new Promise(function (resolve, reject) {
        db.all(sql, params_obj, function (err, rows) {
            if (err) return reject(err);
            else return resolve(rows);
        });
    });
}



// all quantities are integers as text (no divisibility applied)
export class QueriesExchain {

    static async getAddressBalanceAssetsCount(db, address) {
        // excludes XCP
        const sql = `
            SELECT COUNT(*)
            FROM balances
            WHERE address = $address
            AND quantity != 0
            AND asset != 'XCP';
        `;
        const params_obj = {
            $address: address,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return 0;
        else { // rows.length === 1
            return rows[0].count;
        }
    }

    static async getIssuerAssetsCount(db, address) {
        // TODO does not consider issuance transfers
        const sql = `
            SELECT COUNT(*)
            FROM issuances
            WHERE issuer = $issuer
            AND status = 'valid'
            GROUP BY asset_name;
        `;
        const params_obj = {
            $issuer: address,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return 0;
        else { // rows.length === 1
            return rows[0].count;
        }
    }

    static async getXcpBalance(db, address) {
        const sql = `
            SELECT CAST(quantity AS TEXT) AS quantity_text
            FROM balances
            WHERE address = $address
            AND asset = 'XCP';
        `;
        const params_obj = {
            $address: address,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return '0';
        else { // rows.length === 1
            return rows[0].quantity_text;
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