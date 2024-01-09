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
            SELECT
                i.*,
                CAST(i.quantity AS TEXT) AS quantity_text,
                i.divisible AS genesis_divisible
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

    static async getGenesisMetadataBalancesByAddress(db, address) {
        // broken with CIP3 reset assets
        const sql1 = `
            SELECT
                b.*,
                CAST(b.quantity AS TEXT) AS quantity_text,
                ad.asset_longname,
                ad.divisible AS genesis_divisible
            FROM balances b
            JOIN (
                SELECT DISTINCT a.asset_name, a.asset_longname, i.divisible
                FROM assets a
                JOIN issuances i ON (
                    a.asset_name = i.asset AND
                    a.block_index = i.block_index AND
                    i.status = 'valid'
                )
                WHERE a.asset_name IN (
                    SELECT bi.asset
                    FROM balances bi
                    WHERE bi.address = $address
                )
            ) ad ON b.asset = ad.asset_name
            WHERE b.address = $address;
        `; // ad => asset with divisiblity
        const params_obj1 = {
            $address: address,
        };
        const rows1 = await queryDBRows(db, sql1, params_obj1);

        // above query does not include XCP
        const sql2 = `
            SELECT
                *,
                CAST(quantity AS TEXT) AS quantity_text,
                NULL AS asset_longname,
                1 AS genesis_divisible
            FROM balances
            WHERE address = $address
            AND asset = 'XCP';
        `;
        const params_obj2 = {
            $address: address,
        };
        const rows2 = await queryDBRows(db, sql2, params_obj2);

        return [
            ...rows1,
            ...rows2,
        ];
    }

}