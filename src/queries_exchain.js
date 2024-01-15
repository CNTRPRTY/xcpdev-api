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

    static async getDispenserByIdentifier(db, identifier, identifierType) {
        // TODO: need to formalize returnd datatype formats and test
        // maybe not force exact xchain returns, but do what makes the most sense
    
        // note: escrow*,give*,status,tx_index and satoshirate returns are ints (xchain uses strings)
        // also timestamp returns 0 because i dont know where this time comes from
        // additionally and satoshi_price/rate are the same in xchain prices in btc, im leaving it here as sats
        // and only returning satoshi_price
        var sql = `
            SELECT 
                asset,
                "${identifier.indexOf(".") == -1?"":identifier}" as asset_longname,
                block_index,
                escrow_quantity,
                give_quantity,
                give_remaining,
                satoshirate,
                source,
                status,
                tx_hash,
                tx_index
            FROM dispensers 
                WHERE
        `;

        switch(identifierType){
            case "block": sql += `block_index = $identifier;`
                          break;
            
            case "asset": identifier.indexOf(".") == -1 ? 
                          sql += `asset = $identifier;` :
                          sql += `asset = (SELECT asset from issuances where asset_longname = $identifier);` ;
                          break;
            
            case "address": sql += `origin = $identifier;`
                          break;
            
            default:      throw new Error("Invalid identifier!")
          }
        const params_obj = {
            $identifier: identifier,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows;
        }
    }

    static async getDispensesByIdentifier(db, identifier, identifierType) {
        // TODO: need to formalize returnd datatype formats and test
        // maybe not force exact xchain returns, but do what makes the most sense
        var sql = `
            SELECT 
                asset,
                "${identifier.indexOf(".") == -1?"":identifier}" as asset_longname,
                block_index,
                dispense_quantity,
                source,
                destination,
                tx_hash,
                tx_index,
                dispense_index,
                dispenser_tx_hash
            FROM dispenses
            WHERE 
        `;
        switch(identifierType){
            case "block": sql += `block_index = $identifier;`
                          break;
            
            case "asset": identifier.indexOf(".") == -1 ? 
                            sql += `asset = $identifier;` :
                            sql += `asset = (SELECT asset from issuances where asset_longname = $identifier);` ;
                          break;
            
            case "address": sql += `source = $identifier OR destination = $identifier;`
                          break;
            
            default:      throw new Error("Invalid identifier!")
          }
        const params_obj = {
            $identifier: identifier,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows;
        }
    }

    static async getIssuancesByIdentifier(db, identifier, identifierType) {
        // TODO: need to formalize returnd datatype formats and test
        // maybe not force exact xchain returns, but do what makes the most sense
        var sql = `
            SELECT 
                asset,
                "${identifier.indexOf(".") == -1?"":identifier}" as asset_longname,
                block_index,
                description,
                divisible,
                fee_paid,
                issuer,
                source,
                locked,
                quantity,
                status,
                tx_hash,
                tx_index,
                transfer
            FROM issuances
            WHERE 
        `;
        switch(identifierType){
            case "block": sql += `block_index = $identifier;`
                          break;
            
            case "asset": identifier.indexOf(".") == -1 ? 
                            sql += `asset = $identifier;` :
                            sql += `asset_longname = $identifier;` ;
                          break;
            
            case "address": sql += `source = $identifier OR issuer = $identifier;`
                          break;
            
            default:      throw new Error("Invalid identifier!")
          }
        const params_obj = {
            $identifier: identifier,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows;
        }
    }

    static async getDestructionsByIdentifier(db, identifier, identifierType) {
        // TODO: need to formalize returnd datatype formats and test
        // maybe not force exact xchain returns, but do what makes the most sense
        var sql = `
            SELECT
                asset,
                "${identifier.indexOf(".") == -1?"":identifier}" as asset_longname,
                block_index,
                quantity,
                source,
                status,
                tx_index,
                tx_hash,
                tag
            FROM destructions
            WHERE 
        `;
        switch(identifierType){
            case "block": sql += `block_index = $identifier;`
                          break;
            
            case "asset": identifier.indexOf(".") == -1 ? 
                            sql += `asset = $identifier;` :
                            sql += `asset = (SELECT asset from issuances where asset_longname = $identifier);` ;
                          break;
            
            case "address": sql += `source = $identifier`
                          break;
            
            default:      throw new Error("Invalid identifier!")
          }
        const params_obj = {
            $identifier: identifier,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows;
        }
    }

    static async getSendsByIdentifier(db, identifier, identifierType) {
        // TODO: need to formalize returnd datatype formats and test
        // maybe not force exact xchain returns, but do what makes the most sense
        var sql = `
            SELECT
                asset,
                "${identifier.indexOf(".") == -1?"":identifier}" as asset_longname,
                block_index,
                quantity,
                source,
                destination,
                status,
                tx_index,
                tx_hash,
                memo
            FROM sends
            WHERE 
        `;
        switch(identifierType){
            case "block": sql += `block_index = $identifier;`
                          break;
            
            case "asset": identifier.indexOf(".") == -1 ? 
                            sql += `asset = $identifier;` :
                            sql += `asset = (SELECT asset from issuances where asset_longname = $identifier);` ;
                          break;
            
            case "address": sql += `source = $identifier OR destination = $identifier;`
                          break;
            
            default:      throw new Error("Invalid identifier!")
          }
        const params_obj = {
            $identifier: identifier,
        };
        const rows = await queryDBRows(db, sql, params_obj);
        if (rows.length === 0) return null;
        else { // rows.length === 1
            return rows;
        }
    }

}
/*
tx_index|tx_hash|                                                       block_index|    source|                     asset|give_quantity|escrow_quantity|satoshirate|status|give_remaining|oracle_address|last_status_tx_hash|origin
1468609 |4a960783ac0594d25da3d65109e4109e7c3c72b7e7adc0d148f57ebc6909e4aa|600773|1FwkKA9cqpNRFTpVaokdRjT9Xamvebrwcu|XCP|100000000|10000000000|75000|10|0|||1FwkKA9cqpNRFTpVaokdRjT9Xamvebrwcu
*/