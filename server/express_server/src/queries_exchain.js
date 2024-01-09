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
            SELECT COUNT(*) AS count
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
            SELECT COUNT(*) AS count
            FROM issuances
            WHERE issuer = $issuer
            AND status = 'valid'
            GROUP BY asset;
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

    static async getAssetRowByAssetName(db, asset_name) {
        const sql = `
            SELECT *
            FROM assets
            WHERE asset_name = $asset_name;
        `;
        const params_obj = {
            $asset_name: asset_name,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows[0];
        }
    }

    static async getGenesisIssuanceByAssetName(db, asset_name) {
        // genesis (could be multiple with same block)
        const sql = `
            SELECT i.*, CAST(i.quantity AS TEXT) AS quantity_text
            FROM assets a
            JOIN issuances i ON (
                a.asset_name = i.asset AND
                a.block_index = i.block_index AND
                i.status = 'valid'
            )
            WHERE a.asset_name = $asset_name
        `;
        const params_obj = {
            $asset_name: asset_name,
        };
        let rows = await queryDBRows(db, sql, params_obj);

        if (asset_name === 'XCP') {
            rows = [{
                asset: 'XCP',
                asset_longname: null,
                divisible: true,
            }];
        }
        else if (asset_name === 'BTC') {
            rows = [{
                asset: 'BTC',
                asset_longname: null,
                divisible: true,
            }];
        }

        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows[0];
        }
    }

}