/* global BigInt */
// https://github.com/eslint/eslint/issues/11524#issuecomment-473790677

// copy of <script> from decode_tx.html of https://github.com/Jpja/Electrum-Counterparty/
// version permalink: https://github.com/Jpja/Electrum-Counterparty/blob/cfdb65cf7fc6426a89595c5f7a70f6a81d205c80/decode_tx.html

// let example_txs = [
//     'da3ed1efda82824cb24ea081ef2a8f532a7dd9cd1ebc5efa873498c3958c864e', //0  Classic send - 501 JPGOLD
//     '585f50f12288cd9044705483672fbbddb71dff8198b390b40ab3de30db0a88dd', //1  Classic send - 0.2 XCP
//     'd9bdf3b63b8283744762713aa72621822e9562e5823f44366edde017e00d3da8', //2  Enhanced send - 497.83516484 XCP
//     '11ae7493f5a8ef8691b391a95dd9e649afb21f449c5de67d4f6a02fce72d3645', //3  Enhanced send with memo
//     'b55c5745a6106314e41f68c8f4f96afcdf4f637ecbf2165cb454983e28843e3a', //4  DEX order
//     '1c10c283e7aa2baf8977fa6c15556f4934ac7238c65f47fa47cd836918d5546b', //5  DEX order with BTC
//     'be13ee06eee97c44c550c6297d6845f8963ef3461b4b9668207f65273d8aaf1b', //6  Btcpay (after order match)
//     '49896f6115956c2f9baddb9cf0991ba114d010bfffcc73f1d3ddb8e4267aa272', //7  Dispenser - JPJA 
//     '8aad0368ee12b380d77437a5bfc9a9a19a4b6e96d0127e52b92d4bf44736cb44', //8  Dispenser - LOCHNESS - separate address 
//     'e5e9f6a63ede5315994cf2d8a5f8fe760f1f37f6261e5fbb1263bed54114768a', //9  Issuance - OLGA
//     '34da6ecf10c66ed659054aa6c71900c807875cb57b96abea4cee4f7a831ed690', //10 Issuance - lock OLGA
//     '541e640fbb527c35e0ee32d724efa4a5506c4c52acfba1ebc3b45949780c08a8', //11 Issuance - transfer SALVATION ownership
//     '21c2cd5b369c2e7a350bf92ad43c31e5abb0aa85ccba11368b08f9f4abb8e0af', //12 Broadcast - jpja.net 
//     '9d356c8c455e0be7381c6f35413d0b45c00947797f9df193c583337ac11e1c24', //13 Broadcast - Chinese 
//     '627ae48d6b4cffb2ea734be1016dedef4cee3f8ffefaea5602dd58c696de6b74', //14 Broadcast - OLGA image
//     '756df60b4a97ac41912a03b95ea4b027ed9d9d07fce3fc0a2de8744e6fc5cd94', //15 Dividend - JPBULL to JPBEAR holders
//     '56afd17f57a2815e86b324465ac264d1dee2bcedd847361754ef49887d116ba0', //16 Sweep 
//     '793566ef1644a14c2658aed6b3c2df41bc519941f121f9cff82825f48911e451', //17 Subasset issuance 
//     '940b4fede6ca11446c60e4f89dea1c38b7169b7c8fd1805e85eedc5b448a4f0d', //18 Enhanced send to bech32 addr 
//     'ca3ffd78d333969d333686563080a76830ce4df7c771e47e482317091ef069f4'  //19 Enhanced send to multisig addr 
// ];

let msg_type = [];
msg_type[0] = 'Classic Send';
msg_type[2] = 'Enhanced Send';
msg_type[4] = 'Sweep';
msg_type[10] = 'DEX Order';
msg_type[11] = 'Btcpay';
msg_type[12] = 'Dispenser';
msg_type[20] = 'Issuance';
msg_type[21] = 'Issuance (Subasset)';
msg_type[30] = 'Broadcast';
msg_type[50] = 'Dividend';

// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// let tx = urlParams.get('tx');
// if (tx == 'random') tx = example_txs[Math.floor(Math.random() * example_txs.length)];
// if (!isNaN(tx)) tx = example_txs[parseInt(tx)];

async function get(tx) {
    let url = 'https://api.blockcypher.com/v1/btc/main/txs/' + tx + '?instart=0&outstart=0&limit=200';
    let obj = await (await fetch(url)).json();
    return obj;
}

// let json;

// if (typeof tx !== 'undefined' && tx.length == 64) get_json(tx);

async function get_json(tx) {
    const json = await get(tx);
    return decode(json);
}

// block_height should not be needed, v9.60 changed a message format instead of making a new message type
function decode_data(data_hex, block_height) {
    let cp_msg = data_hex;

    let id_hex = cp_msg.substring(0, 2);
    if (id_hex == '00') {
        id_hex = cp_msg.substring(0, 8);
        cp_msg = cp_msg.substring(8);
    } else {
        cp_msg = cp_msg.substring(2);
    }
    let id = parseInt(id_hex, 16);
    // out += wl('Type (hex)', id_hex);
    // out += wl('Type (int)', id);
    // out += wl('Type', msg_type[id]);

    let json_out = {
        data_hex,
        id_hex,
        id,
        msg_type: msg_type[id],
        msg_hex: cp_msg,
    };

    let msg_decoded;

    if (id == 0) { //Classic Send
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        // out += wl('Recipient', recipient);
        // out += wl('Dust (sat)', first_send_sat);
        // out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Amount (hex)', q_hex);
        // out += wl('Amount (sat)', q);
        msg_decoded = {
            // recipient,
            // first_send_sat,
            // first_send_btc: (first_send_sat / 100000000).toFixed(8),
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
        };
    }

    if (id == 2) { //Enhanced Send
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let recipient_hex = cp_msg.substring(0, 42);
        let recipient = hex_to_address(recipient_hex);
        cp_msg = cp_msg.substring(42);
        let memo_hex = cp_msg;
        let memo = hex2a(memo_hex);
        // out += wl('Recipient (hex)', recipient_hex);
        // out += wl('Recipient', recipient);
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Amount (hex)', q_hex);
        // out += wl('Amount (sat)', q);
        // out += wl('Memo (hex)', memo_hex);
        // out += wl('Memo (text)', memo);
        msg_decoded = {
            recipient_hex,
            recipient,
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            memo_hex,
            memo,
        };
    }

    if (id == 4) { //Sweep
        let recipient_hex = cp_msg.substring(0, 42);
        let recipient = hex_to_address(recipient_hex);
        cp_msg = cp_msg.substring(42);
        let flag_hex = cp_msg.substring(0, 2);
        let flag = parseInt(flag_hex, 16);
        cp_msg = cp_msg.substring(2);
        let memo_hex = cp_msg;
        let memo = hex2a(memo_hex);
        // out += wl('Recipient (hex)', recipient_hex);
        // out += wl('Recipient', recipient);
        // out += wl('Flag (hex)', flag_hex);
        // out += wl('Flag (int)', flag);
        // out += wl('Memo (hex)', memo_hex);
        // out += wl('Memo (text)', memo);
        msg_decoded = {
            recipient_hex,
            recipient,
            flag_hex,
            flag,
            memo_hex,
            memo,
        };
    }

    if (id == 10) { //DEX Order
        let give_asset_hex = cp_msg.substring(0, 16);
        let give_asset = parseInt(give_asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let give_q_hex = cp_msg.substring(0, 16);
        let give_q = parseInt(give_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let get_asset_hex = cp_msg.substring(0, 16);
        let get_asset = parseInt(get_asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let get_q_hex = cp_msg.substring(0, 16);
        let get_q = parseInt(get_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let exp_hex = cp_msg.substring(0, 4);
        let exp = parseInt(exp_hex, 16);
        // out += wl('Give Asset (hex)', give_asset_hex);
        // out += wl('Give Asset (int)', give_asset);
        // out += wl('Give Asset', asset_name(give_asset));
        // out += wl('Give Amount (hex)', give_q_hex);
        // out += wl('Give Amount (sat)', give_q);
        // out += wl('Get Asset (hex)', get_asset_hex);
        // out += wl('Get Asset (int)', get_asset);
        // out += wl('Get Asset', asset_name(get_asset));
        // out += wl('Get Amount (hex)', get_q_hex);
        // out += wl('Get Amount (sat)', get_q);
        // out += wl('Expiration (hex)', exp_hex);
        // out += wl('Expiration (int)', exp);
        msg_decoded = {
            give_asset_hex,
            give_asset,
            give_asset_name: asset_name(give_asset),
            give_q_hex,
            give_q,
            get_asset_hex,
            get_asset,
            get_asset_name: asset_name(get_asset),
            get_q_hex,
            get_q,
            exp_hex,
            exp,
        };
    }

    if (id == 11) { //Btcpay
        let order_0 = cp_msg.substring(0, 64);
        cp_msg = cp_msg.substring(64);
        let order_1 = cp_msg.substring(0, 64);
        // out += wl('Order 0', order_0);
        // out += wl('Order 1', order_1);
        // out += wl('Pay To', recipient);
        // out += wl('Pay (sat)', first_send_sat);
        // out += wl('Pay (btc)', (first_send_sat / 100000000).toFixed(8));
        msg_decoded = {
            order_0,
            order_1,
            // recipient,
            // first_send_sat,
            // first_send_btc: (first_send_sat / 100000000).toFixed(8),
        };
    }

    if (id == 12) { //Dispenser
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let give_q_hex = cp_msg.substring(0, 16);
        let give_q = parseInt(give_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let esc_q_hex = cp_msg.substring(0, 16);
        let esc_q = parseInt(esc_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let btc_q_hex = cp_msg.substring(0, 16);
        let btc_q = parseInt(btc_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let status_hex = cp_msg.substring(0, 2);
        let status = parseInt(status_hex, 16);
        cp_msg = cp_msg.substring(2);
        let disp_addr_hex = cp_msg;
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Give Amount (hex)', give_q_hex);
        // out += wl('Give Amount (sat)', give_q);
        // out += wl('Escr. Amount (hex)', esc_q_hex);
        // out += wl('Escr. Amount (sat)', esc_q);
        // out += wl('BTC Amount (hex)', btc_q_hex);
        // out += wl('BTC Amount (sat)', btc_q);
        // out += wl('BTC Amount', (btc_q / 100000000).toFixed(8));
        // out += wl('Status (hex)', status_hex);
        // out += wl('Status (int)', status);
        // out += wl('Dis. Address (hex)', disp_addr_hex);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            give_q_hex,
            give_q,
            esc_q_hex,
            esc_q,
            btc_q_hex,
            btc_q_sat: btc_q,
            btc_q_btc: (btc_q / 100000000).toFixed(8),
            status_hex,
            status,
            disp_addr_hex,
        };
    }

    if (id == 20 && block_height < 753500) { //Issuance, pre change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let call_hex = cp_msg.substring(0, 2);
        let call = parseInt(call_hex, 16);
        cp_msg = cp_msg.substring(2);
        let call_date_hex = cp_msg.substring(0, 8);
        let call_date = parseInt(call_date_hex, 16);
        cp_msg = cp_msg.substring(8);
        let call_price_hex = cp_msg.substring(0, 8);
        let call_price = parseInt(call_price_hex, 16);
        cp_msg = cp_msg.substring(8);
        let len_hex = cp_msg.substring(0, 2);;
        let len = parseInt(len_hex, 16);
        cp_msg = cp_msg.substring(2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        // if (recipient != '0') {
        //     out += wl('Transfer To', recipient);
        //     out += wl('Dust (sat)', first_send_sat);
        //     out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        // }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // //out += wl('Divisible', div);
        // out += wl('Callable (hex)', call_hex);
        // //out += wl('Callable', call);
        // out += wl('Call Date (hex)', call_date_hex);
        // //out += wl('Call Date (int)', call_date);
        // out += wl('Call Price (hex)', call_price_hex);
        // //out += wl('Call Price (sat)', call_price);
        // out += wl('Descr Length (hex)', len_hex);
        // out += wl('Descr Length (int)', len);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            div,
            call_hex,
            call,
            call_date_hex,
            call_date,
            call_price_hex,
            call_price,
            len_hex,
            len,
            descr_hex,
            descr,
        };
    }

    if (id == 20 && block_height >= 753500) { //Issuance, post change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //remove call data, add lock and reset
        let lock_hex = cp_msg.substring(0, 2);
        let lock = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let reset_hex = cp_msg.substring(0, 2);
        let reset = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //let len_hex = cp_msg.substring(0,2);;
        //let len = parseInt(len_hex, 16);
        //cp_msg = cp_msg.substring(2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        // if (recipient != '0') {
        //     out += wl('Transfer To', recipient);
        //     out += wl('Dust (sat)', first_send_sat);
        //     out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        // }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // out += wl('Lock (hex)', lock_hex);
        // out += wl('Reset (hex)', reset_hex);
        // //out += wl('Descr Length (hex)', len_hex);
        // //out += wl('Descr Length (int)', len);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            div,
            lock_hex,
            lock,
            reset_hex,
            reset,
            descr_hex,
            descr,
        };
    }

    if (id == 21 && block_height >= 753500) { //Issuance (Subasset), post change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = BigInt('0x' + asset_hex).toString(10);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //remove call data, add lock and reset
        let lock_hex = cp_msg.substring(0, 2);
        let lock = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let reset_hex = cp_msg.substring(0, 2);
        let reset = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let len_subasset_hex = cp_msg.substring(0, 2);
        let len_subasset = parseInt(len_subasset_hex, 16);
        cp_msg = cp_msg.substring(2);
        let subasset_hex = cp_msg.substring(0, len_subasset * 2);
        let subasset = hex_to_subasset(subasset_hex);
        cp_msg = cp_msg.substring(len_subasset * 2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        // if (recipient != '0') {
        //     out += wl('Transfer To', recipient);
        //     out += wl('Dust (sat)', first_send_sat);
        //     out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        // }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // out += wl('Lock (hex)', lock_hex);
        // out += wl('Reset (hex)', reset_hex);
        // out += wl('Subasset len (hex)', len_subasset_hex);
        // //out += wl('Subasset len', len_subasset);
        // out += wl('Subasset (hex)', subasset_hex);
        // out += wl('Subasset', subasset);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            div,
            lock_hex,
            lock,
            reset_hex,
            reset,
            len_subasset_hex,
            subasset_hex,
            subasset,
            descr_hex,
            descr,
        };
    }

    if (id == 30) { //Broadcast
        let ts_hex = cp_msg.substring(0, 8);
        let ts = parseInt(ts_hex, 16);
        cp_msg = cp_msg.substring(8);
        let value_hex = cp_msg.substring(0, 16);
        let value = parseInt(value_hex, 16);
        cp_msg = cp_msg.substring(16);
        let fee_hex = cp_msg.substring(0, 8);
        let fee = parseInt(fee_hex, 16);
        cp_msg = cp_msg.substring(8);
        //most broadcast texts begin with a length byte
        // but not all do. I don't know why.
        //assume first byte is length byte if it matches length. 
        // else it's the first text character 
        let chars_left = cp_msg.length;
        let len_hex = cp_msg.substring(0, 2);
        let len = parseInt(len_hex, 16);
        let len_byte = false;
        if (len * 2 + 2 == chars_left) {
            len_byte = true;
            cp_msg = cp_msg.substring(2);
        }
        let text_hex = cp_msg;
        let text = hex2a(text_hex);
        text = decodeURIComponent(escape(text.substring(0)));
        // out += wl('Timestamp (hex)', ts_hex);
        // out += wl('Timestamp (int)', ts);
        // out += wl('Timestamp', print_ts(ts));
        // out += wl('Value (hex)', value_hex);
        // out += wl('Fee (hex)', fee_hex);
        // out += wl('Fee (int)', fee);
        if (len_byte) {
            // out += wl('Text Length (hex)', len_hex);
            // out += wl('Text Length (int)', len);
        }
        // out += wl('Text (hex)', text_hex);
        // out += wl('Text', text);
        msg_decoded = {
            ts_hex,
            ts,
            ts_print: print_ts(ts),
            value_hex,
            value,
            fee_hex,
            fee,
            len_hex,
            len,
            text_hex,
            text,
        };
    }

    if (id == 50) { //Dividend
        let div_q_hex = cp_msg.substring(0, 16);
        let div_q = parseInt(div_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let asset2_hex = cp_msg.substring(0, 16);
        let asset2 = parseInt(asset2_hex, 16);
        cp_msg = cp_msg.substring(16);
        // out += wl('Div. Amount (hex)', div_q_hex);
        // out += wl('Div. Amount (sat)', div_q);
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Div. Asset (hex)', asset2_hex);
        // out += wl('Div. Asset (int)', asset2);
        // out += wl('Div. Asset', asset_name(asset2));
        msg_decoded = {
            div_q_hex,
            div_q,
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            asset2_hex,
            asset2,
            asset2_name: asset_name(asset2),
        };
    }

    if (msg_decoded) {
        json_out = {
            ...json_out,
            msg_decoded,
        }
    }

    return json_out;
}

function decode(_json) {
    const json = JSON.parse(JSON.stringify(_json));
    let hash = json['hash'];
    let block_height = json['block_height'];
    let fees = json['fees'];
    let size = json['size'];
    let vsize = json['vsize'];
    let confirmed = json['confirmed'];
    let from_addr = json['addresses'][0];
    let utxo = json['inputs'][0]['prev_hash'];
    let first_send_sat = json['outputs'][0]['value'];
    console.log('*** API DATA ***');
    console.log(hash);
    console.log(block_height);
    console.log(from_addr);
    console.log('utxo: ' + utxo);
    let script_type = [];
    let script = [];
    let to_addr = [];
    for (const x of json['outputs']) {
        let type = x['script_type'];
        script_type.push(type);
        if (type == 'pay-to-pubkey-hash') {
            script.push('0');
            to_addr.push(x['addresses'][0]);
        } else if (type == 'pay-to-multi-pubkey-hash') {
            script.push(x['script']);
            to_addr.push('0');
        } else if (type == 'null-data') {
            script.push(x['data_hex']);
            to_addr.push('0');
        } else {
            script.push('?');
            to_addr.push('?');
        }
        console.log(script_type.at(-1));
        console.log(script.at(-1));
        console.log(to_addr.at(-1));
    }

    //DECODE TX
    let recipient = '0';
    let cp_msg = '';

    if (script_type[0] == 'pay-to-pubkey-hash') {
        //possibly classic send, asset transfer (issuance) or btc_pay.
        //these always send some btc dust to recipent at output 0.
        recipient = to_addr[0];
    }

    let encoding = '';
    for (let i = 0; i < script.length; i++) {

        if (script_type[i] == 'null-data') {
            encoding = 'op_return';
            let raw = script[i];
            raw = xcp_rc4(utxo, raw);
            if (raw.substring(0, 16) == '434e545250525459') {
                //raw = raw.substring(16);
            } else {
                raw = '';
            }
            cp_msg += raw;
            console.log('opreturn   ' + cp_msg);
        }

        if (script_type[i] == 'pay-to-multi-pubkey-hash' && script[i].length == 142) {
            encoding = 'multisig (old type, not rc4 encoded)';
            let len = script[i].substring(72, 74);
            len = parseInt(hexToDec(len));
            let raw = script[i].substring(74, 74 + (len * 2));
            if (raw.substring(0, 16) == '434e545250525459' || cp_msg.substring(0, 16) == '434e545250525459') {
                cp_msg += raw;
            }
            console.log('old msig   ' + len + '   ' + cp_msg);
        }

        if (script_type[i] == 'pay-to-multi-pubkey-hash' && script[i].length == 210) {
            encoding = 'multisig';
            let raw = script[i].substring(6, 68) + script[i].substring(74, 136);
            raw = xcp_rc4(utxo, raw);
            let len = raw.substring(0, 2);
            len = parseInt(hexToDec(len));
            raw = raw.substring(2, 2 + (len * 2));
            if (raw.substring(0, 16) == '434e545250525459' && cp_msg.substring(0, 16) == '434e545250525459') {
                raw = raw.substring(16);
            } else if (raw.substring(0, 16) == '434e545250525459') {
                //i.e. first msg, keep prefix
            } else {
                raw = '';
            }
            cp_msg += raw;
            console.log('msig   ' + len + '   ' + cp_msg);
        }
    }


    //WRITE TX DATA
    // let out = '';
    // out += wl('BITCOIN DATA', '');
    // out += wl('Tx ID', hash);
    // out += wl('Address', from_addr);
    // out += wl('Timestamp', confirmed);
    // out += wl('Size', size);
    // out += wl('Vsize', vsize);
    // out += wl('Fee (sat)', fees);
    // out += wl('Fee (btc)', (fees / 100000000).toFixed(8));
    // out += wl(' ', '');
    // out += wl('COUNTERPARTY DATA', '');
    const out = {
        hash,
        from_addr,
        confirmed,
        size,
        vsize,
        fees,
        fees_btc: (fees / 100000000).toFixed(8),

        recipient,
        first_send_sat,
        first_send_btc: (first_send_sat / 100000000).toFixed(8),
    };

    if (cp_msg.substring(0, 16) != '434e545250525459') {
        // out += wl('No Counterparty data found!', '');
        // document.getElementById("output").innerHTML = out;
        // output2(hash);
        // return;
        return {
            tx: out,
            cntrprty: null
        };
    }


    //RAW CNTRPRTY DATA
    let raw_ascii = hex2aq(cp_msg);
    console.log(cp_msg);
    console.log(raw_ascii);
    // out += wl('Encoding', encoding);
    // out += wl('Raw (hex)', cp_msg);
    // out += wl('Raw (ascii)', raw_ascii);


    //GENERAL PREFIX
    let prefix_hex = cp_msg.substring(0, 16);
    let prefix = hex2a(prefix_hex);
    // out += wl('Prefix (hex)', prefix_hex);
    // out += wl('Prefix', prefix);


    //DISSECT DATA
    cp_msg = cp_msg.substring(16);
    let id_hex = cp_msg.substring(0, 2);
    if (id_hex == '00') {
        id_hex = cp_msg.substring(0, 8);
        cp_msg = cp_msg.substring(8);
    } else {
        cp_msg = cp_msg.substring(2);
    }
    let id = parseInt(id_hex, 16);
    // out += wl('Type (hex)', id_hex);
    // out += wl('Type (int)', id);
    // out += wl('Type', msg_type[id]);

    const json_out = {
        tx: out,
        cntrprty: {
            encoding,
            cp_msg,
            raw_ascii,
            prefix_hex,
            prefix,
            id_hex,
            id,
            msg_type: msg_type[id],
        }
    };

    let msg_decoded;

    if (id == 0) { //Classic Send
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        // out += wl('Recipient', recipient);
        // out += wl('Dust (sat)', first_send_sat);
        // out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Amount (hex)', q_hex);
        // out += wl('Amount (sat)', q);
        msg_decoded = {
            recipient,
            first_send_sat,
            first_send_btc: (first_send_sat / 100000000).toFixed(8),
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
        };
    }

    if (id == 2) { //Enhanced Send
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let recipient_hex = cp_msg.substring(0, 42);
        let recipient = hex_to_address(recipient_hex);
        cp_msg = cp_msg.substring(42);
        let memo_hex = cp_msg;
        let memo = hex2a(memo_hex);
        // out += wl('Recipient (hex)', recipient_hex);
        // out += wl('Recipient', recipient);
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Amount (hex)', q_hex);
        // out += wl('Amount (sat)', q);
        // out += wl('Memo (hex)', memo_hex);
        // out += wl('Memo (text)', memo);
        msg_decoded = {
            recipient_hex,
            recipient,
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            memo_hex,
            memo,
        };
    }

    if (id == 4) { //Sweep
        let recipient_hex = cp_msg.substring(0, 42);
        let recipient = hex_to_address(recipient_hex);
        cp_msg = cp_msg.substring(42);
        let flag_hex = cp_msg.substring(0, 2);
        let flag = parseInt(flag_hex, 16);
        cp_msg = cp_msg.substring(2);
        let memo_hex = cp_msg;
        let memo = hex2a(memo_hex);
        // out += wl('Recipient (hex)', recipient_hex);
        // out += wl('Recipient', recipient);
        // out += wl('Flag (hex)', flag_hex);
        // out += wl('Flag (int)', flag);
        // out += wl('Memo (hex)', memo_hex);
        // out += wl('Memo (text)', memo);
        msg_decoded = {
            recipient_hex,
            recipient,
            flag_hex,
            flag,
            memo_hex,
            memo,
        };
    }

    if (id == 10) { //DEX Order
        let give_asset_hex = cp_msg.substring(0, 16);
        let give_asset = parseInt(give_asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let give_q_hex = cp_msg.substring(0, 16);
        let give_q = parseInt(give_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let get_asset_hex = cp_msg.substring(0, 16);
        let get_asset = parseInt(get_asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let get_q_hex = cp_msg.substring(0, 16);
        let get_q = parseInt(get_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let exp_hex = cp_msg.substring(0, 4);
        let exp = parseInt(exp_hex, 16);
        // out += wl('Give Asset (hex)', give_asset_hex);
        // out += wl('Give Asset (int)', give_asset);
        // out += wl('Give Asset', asset_name(give_asset));
        // out += wl('Give Amount (hex)', give_q_hex);
        // out += wl('Give Amount (sat)', give_q);
        // out += wl('Get Asset (hex)', get_asset_hex);
        // out += wl('Get Asset (int)', get_asset);
        // out += wl('Get Asset', asset_name(get_asset));
        // out += wl('Get Amount (hex)', get_q_hex);
        // out += wl('Get Amount (sat)', get_q);
        // out += wl('Expiration (hex)', exp_hex);
        // out += wl('Expiration (int)', exp);
        msg_decoded = {
            give_asset_hex,
            give_asset,
            give_asset_name: asset_name(give_asset),
            give_q_hex,
            give_q,
            get_asset_hex,
            get_asset,
            get_asset_name: asset_name(get_asset),
            get_q_hex,
            get_q,
            exp_hex,
            exp,
        };
    }

    if (id == 11) { //Btcpay
        let order_0 = cp_msg.substring(0, 64);
        cp_msg = cp_msg.substring(64);
        let order_1 = cp_msg.substring(0, 64);
        // out += wl('Order 0', order_0);
        // out += wl('Order 1', order_1);
        // out += wl('Pay To', recipient);
        // out += wl('Pay (sat)', first_send_sat);
        // out += wl('Pay (btc)', (first_send_sat / 100000000).toFixed(8));
        msg_decoded = {
            order_0,
            order_1,
            recipient,
            first_send_sat,
            first_send_btc: (first_send_sat / 100000000).toFixed(8),
        };
    }

    if (id == 12) { //Dispenser
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let give_q_hex = cp_msg.substring(0, 16);
        let give_q = parseInt(give_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let esc_q_hex = cp_msg.substring(0, 16);
        let esc_q = parseInt(esc_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let btc_q_hex = cp_msg.substring(0, 16);
        let btc_q = parseInt(btc_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let status_hex = cp_msg.substring(0, 2);
        let status = parseInt(status_hex, 16);
        cp_msg = cp_msg.substring(2);
        let disp_addr_hex = cp_msg;
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Give Amount (hex)', give_q_hex);
        // out += wl('Give Amount (sat)', give_q);
        // out += wl('Escr. Amount (hex)', esc_q_hex);
        // out += wl('Escr. Amount (sat)', esc_q);
        // out += wl('BTC Amount (hex)', btc_q_hex);
        // out += wl('BTC Amount (sat)', btc_q);
        // out += wl('BTC Amount', (btc_q / 100000000).toFixed(8));
        // out += wl('Status (hex)', status_hex);
        // out += wl('Status (int)', status);
        // out += wl('Dis. Address (hex)', disp_addr_hex);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            give_q_hex,
            give_q,
            esc_q_hex,
            esc_q,
            btc_q_hex,
            btc_q_sat: btc_q,
            btc_q_btc: (btc_q / 100000000).toFixed(8),
            status_hex,
            status,
            disp_addr_hex,
        };
    }

    if (id == 20 && block_height < 753500) { //Issuance, pre change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let call_hex = cp_msg.substring(0, 2);
        let call = parseInt(call_hex, 16);
        cp_msg = cp_msg.substring(2);
        let call_date_hex = cp_msg.substring(0, 8);
        let call_date = parseInt(call_date_hex, 16);
        cp_msg = cp_msg.substring(8);
        let call_price_hex = cp_msg.substring(0, 8);
        let call_price = parseInt(call_price_hex, 16);
        cp_msg = cp_msg.substring(8);
        let len_hex = cp_msg.substring(0, 2);;
        let len = parseInt(len_hex, 16);
        cp_msg = cp_msg.substring(2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        if (recipient != '0') {
            // out += wl('Transfer To', recipient);
            // out += wl('Dust (sat)', first_send_sat);
            // out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // //out += wl('Divisible', div);
        // out += wl('Callable (hex)', call_hex);
        // //out += wl('Callable', call);
        // out += wl('Call Date (hex)', call_date_hex);
        // //out += wl('Call Date (int)', call_date);
        // out += wl('Call Price (hex)', call_price_hex);
        // //out += wl('Call Price (sat)', call_price);
        // out += wl('Descr Length (hex)', len_hex);
        // out += wl('Descr Length (int)', len);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            call_hex,
            call_date_hex,
            call_price_hex,
            len_hex,
            len,
            descr_hex,
            descr,
        };
    }

    if (id == 20 && block_height >= 753500) { //Issuance, post change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //remove call data, add lock and reset
        let lock_hex = cp_msg.substring(0, 2);
        let lock = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let reset_hex = cp_msg.substring(0, 2);
        let rest = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //let len_hex = cp_msg.substring(0,2);;
        //let len = parseInt(len_hex, 16);
        //cp_msg = cp_msg.substring(2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        if (recipient != '0') {
            // out += wl('Transfer To', recipient);
            // out += wl('Dust (sat)', first_send_sat);
            // out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // out += wl('Lock (hex)', lock_hex);
        // out += wl('Reset (hex)', reset_hex);
        // //out += wl('Descr Length (hex)', len_hex);
        // //out += wl('Descr Length (int)', len);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            lock_hex,
            reset_hex,
            descr_hex,
            descr,
        };
    }

    if (id == 21 && block_height >= 753500) { //Issuance (Subasset), post change 2022
        let asset_hex = cp_msg.substring(0, 16);
        let asset = BigInt('0x' + asset_hex).toString(10);
        cp_msg = cp_msg.substring(16);
        let q_hex = cp_msg.substring(0, 16);
        let q = parseInt(q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let div_hex = cp_msg.substring(0, 2);
        let div = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        //remove call data, add lock and reset
        let lock_hex = cp_msg.substring(0, 2);
        let lock = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let reset_hex = cp_msg.substring(0, 2);
        let rest = parseInt(div_hex, 16);
        cp_msg = cp_msg.substring(2);
        let len_subasset_hex = cp_msg.substring(0, 2);
        let len_subasset = parseInt(len_subasset_hex, 16);
        cp_msg = cp_msg.substring(2);
        let subasset_hex = cp_msg.substring(0, len_subasset * 2);
        let subasset = hex_to_subasset(subasset_hex);
        cp_msg = cp_msg.substring(len_subasset * 2);
        let descr_hex = cp_msg;
        let descr = hex2a(descr_hex);
        //descr = unescape(encodeURIComponent(descr));
        descr = decodeURIComponent(escape(descr));
        if (recipient != '0') {
            // out += wl('Transfer To', recipient);
            // out += wl('Dust (sat)', first_send_sat);
            // out += wl('Dust (btc)', (first_send_sat / 100000000).toFixed(8));
        }
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Issue Amount (hex)', q_hex);
        // out += wl('Issue Amount (sat)', q);
        // out += wl('Divisible (hex)', div_hex);
        // out += wl('Lock (hex)', lock_hex);
        // out += wl('Reset (hex)', reset_hex);
        // out += wl('Subasset len (hex)', len_subasset_hex);
        // //out += wl('Subasset len', len_subasset);
        // out += wl('Subasset (hex)', subasset_hex);
        // out += wl('Subasset', subasset);
        // out += wl('Description (hex)', descr_hex);
        // out += wl('Description', descr);
        msg_decoded = {
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            q_hex,
            q,
            div_hex,
            lock_hex,
            reset_hex,
            len_subasset_hex,
            subasset_hex,
            subasset,
            descr_hex,
            descr,
        };
    }

    if (id == 30) { //Broadcast
        let ts_hex = cp_msg.substring(0, 8);
        let ts = parseInt(ts_hex, 16);
        cp_msg = cp_msg.substring(8);
        let value_hex = cp_msg.substring(0, 16);
        let value = parseInt(value_hex, 16);
        cp_msg = cp_msg.substring(16);
        let fee_hex = cp_msg.substring(0, 8);
        let fee = parseInt(fee_hex, 16);
        cp_msg = cp_msg.substring(8);
        //most broadcast texts begin with a length byte
        // but not all do. I don't know why.
        //assume first byte is length byte if it matches length. 
        // else it's the first text character 
        let chars_left = cp_msg.length;
        let len_hex = cp_msg.substring(0, 2);
        let len = parseInt(len_hex, 16);
        let len_byte = false;
        if (len * 2 + 2 == chars_left) {
            len_byte = true;
            cp_msg = cp_msg.substring(2);
        }
        let text_hex = cp_msg;
        let text = hex2a(text_hex);
        text = decodeURIComponent(escape(text.substring(0)));
        // out += wl('Timestamp (hex)', ts_hex);
        // out += wl('Timestamp (int)', ts);
        // out += wl('Timestamp', print_ts(ts));
        // out += wl('Value (hex)', value_hex);
        // out += wl('Fee (hex)', fee_hex);
        // out += wl('Fee (int)', fee);
        if (len_byte) {
            // out += wl('Text Length (hex)', len_hex);
            // out += wl('Text Length (int)', len);
        }
        // out += wl('Text (hex)', text_hex);
        // out += wl('Text', text);
        msg_decoded = {
            ts_hex,
            ts,
            ts_print: print_ts(ts),
            value_hex,
            fee_hex,
            fee,
            len_hex,
            len,
            text_hex,
            text,
        };
    }

    if (id == 50) { //Dividend
        let div_q_hex = cp_msg.substring(0, 16);
        let div_q = parseInt(div_q_hex, 16);
        cp_msg = cp_msg.substring(16);
        let asset_hex = cp_msg.substring(0, 16);
        let asset = parseInt(asset_hex, 16);
        cp_msg = cp_msg.substring(16);
        let asset2_hex = cp_msg.substring(0, 16);
        let asset2 = parseInt(asset2_hex, 16);
        cp_msg = cp_msg.substring(16);
        // out += wl('Div. Amount (hex)', div_q_hex);
        // out += wl('Div. Amount (sat)', div_q);
        // out += wl('Asset (hex)', asset_hex);
        // out += wl('Asset (int)', asset);
        // out += wl('Asset', asset_name(asset));
        // out += wl('Div. Asset (hex)', asset2_hex);
        // out += wl('Div. Asset (int)', asset2);
        // out += wl('Div. Asset', asset_name(asset2));
        msg_decoded = {
            div_q_hex,
            div_q,
            asset_hex,
            asset,
            asset_name: asset_name(asset),
            asset2_hex,
            asset2,
            asset2_name: asset_name(asset2),
        };
    }

    // document.getElementById("output").innerHTML = out;
    // output2(hash);
    // return { out };

    if (msg_decoded) {
        json_out.cntrprty = {
            ...json_out.cntrprty,
            msg_decoded,
        }
    }

    return json_out;
}

// function output2(tx) {
//     let out = '<br><br>';
//     out += 'View on: ';
//     out += '<a href="https://xchain.io/tx/' + tx + '">Xchain</a> – ';
//     out += '<a href="https://xcp.dev/tx/' + tx + '">xcp.dev</a> – ';
//     out += '<a href="https://live.blockcypher.com/btc/tx/' + tx + '/">BlockCypher</a> – ';
//     out += '<a href="https://www.blockchain.com/btc/tx/' + tx + '">Blockchain.com</a> – ';
//     out += '<a href="https://blockstream.info/tx/' + tx + '">Blockstream</a>';
//     document.getElementById("output2").innerHTML = out;
// }

// function wl(title, info) {
//     return title.padEnd(18, ' ') + ' ' + chunk(info, '<br>' + ''.padEnd(19, ' '), 64) + '<br>';
// }

// function chunk(str, sep, n) {
//     str = String(str);
//     var ret = [];
//     var i;
//     var len;
//     for (i = 0, len = str.length; i < len; i += n) {
//         ret.push(str.substr(i, n))
//     }
//     return ret.join(sep);
// };

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function hex2aq(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        let int = parseInt(hex.substr(i, 2), 16);
        if (int >= 32 && int <= 126) {
            str += String.fromCharCode(int);
        } else {
            str += '?';
        }
    }
    return str;
}

function xcp_rc4(key, datachunk) {
    return bin2hex(rc4(hex2bin(key), hex2bin(datachunk)));
}

function hex2bin(hex) {
    var bytes = [];
    var str;
    for (var i = 0; i < hex.length - 1; i += 2) {
        var ch = parseInt(hex.substr(i, 2), 16);
        bytes.push(ch);
    }
    str = String.fromCharCode.apply(String, bytes);
    return str;
};

function bin2hex(s) {
    // http://kevin.vanzonneveld.net
    var i, l, o = "",
        n;
    s += "";
    for (i = 0, l = s.length; i < l; i++) {
        n = s.charCodeAt(i).toString(16);
        o += n.length < 2 ? "0" + n : n;
    }
    return o;
};

function rc4(key, str) {
    //https://gist.github.com/farhadi/2185197
    var s = [], j = 0, x, res = '';
    for (var i = 0; i < 256; i++) {
        s[i] = i;
    }
    for (i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        x = s[i];
        s[i] = s[j];
        s[j] = x;
    }
    i = 0;
    j = 0;
    for (var y = 0; y < str.length; y++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        x = s[i];
        s[i] = s[j];
        s[j] = x;
        res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
    }
    return res;
}

function hexToDec(s) {
    var i, j, digits = [0], carry;
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = digits[j] / 10 | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = carry / 10 | 0;
        }
    }
    return digits.reverse().join('');
}

function asset_name(id) {
    if (id == 0) return 'BTC';
    if (id == 1) return 'XCP';
    if (id >= 95428956661682177) return 'numerical or sub-asset';
    if (id > 9007199254740991) return 'max int error'; //a few very long asset names. would need bigint
    let b26_digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let n = id;
    let name = '';
    do {
        let mod = n % 26;
        name = b26_digits[mod] + name;
        n -= mod;
        n /= 26;
    } while (n > 0);
    return name;
}

function print_ts(ts) {
    //integer timestamp to ISO string
    let d = new Date(ts * 1000);
    return d.toISOString();
}

function hex_to_address(hex) { //21 byte hex encoded in cntrprty message 
    let version_byte = hex.substring(0, 2);
    if (version_byte == '00' || version_byte == '05') {
        return hex_to_base58addr(hex);
    }
    if (version_byte == '80') {
        return hex_to_bech32addr(hex);
    }
    return 'cannot decode address';
}

function hex_to_base58addr(hex) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const base = BigInt(58);
    let checksum = sha256(hex2a(hex));
    checksum = sha256(hex2a(checksum));
    checksum = checksum.substring(0, 8);
    hex += checksum
    let decimal = BigInt('0x' + hex);
    let output = '';
    while (decimal > 0) {
        let rem = decimal % base;
        decimal = BigInt(decimal / base);
        output = ALPHABET[Number(rem)] + output;
    }
    //Leading 00's must be converted to 1's
    let numLeadingZeros = Math.floor(hex.match(/^0+/)[0].length / 2);
    for (let i = 0; i < numLeadingZeros; i++) {
        output = "1" + output;
    }
    return output;
}

function hex_to_bech32addr(hex) {
    const version = 0;
    const hrp = 'bc';

    //remove version byte ('80') from hex string
    hex = hex.substring(2);

    //the rest follows step 3 on https://en.bitcoin.it/wiki/Bech32
    // convert hex string to binary format
    const binaryString = hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16).toString(2).padStart(8, '0')).join('');

    //Split binary string into 5-bit chunks and convert to integer array
    const intArray = binaryString.match(/.{1,5}/g).map(chunk => parseInt(chunk, 2));

    //Add the witness version byte in front
    intArray.unshift(version);

    //Calculate checksum
    let chk = bech32_checksum(hrp, intArray);

    //Append checksum
    intArray.push(...chk);

    //Map to bech32 charset
    const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    let addr = hrp + '1';
    for (let i = 0; i < intArray.length; i++) {
        addr += charset.charAt(intArray[i]);
    }
    return addr;
}

//Calculate bech32 checksum
//Copied from https://github.com/sipa/bech32/blob/master/ref/javascript/bech32.js
//Modified to assume BECH32 encoding (not BECH32M)
function bech32_checksum(hrp, data) {
    var values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    var mod = polymod(values) ^ 1;
    var ret = [];
    for (var p = 0; p < 6; ++p) {
        ret.push((mod >> 5 * (5 - p)) & 31);
    }
    return ret;
}
function polymod(values) {
    const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    var chk = 1;
    for (var p = 0; p < values.length; ++p) {
        var top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ values[p];
        for (var i = 0; i < 5; ++i) {
            if ((top >> i) & 1) {
                chk ^= GENERATOR[i];
            }
        }
    }
    return chk;
}
function hrpExpand(hrp) {
    var ret = [];
    var p;
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) & 31);
    }
    return ret;
}

function hex_to_subasset(hex) {
    const SUBASSET_DIGITS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-_@!'
    let integer = BigInt('0x' + hex)
    let ret = ''
    while (integer != 0n) {
        ret = SUBASSET_DIGITS[(integer % 68n) - 1n] + ret
        integer = integer / 68n
    }
    return ret
}


// copying only dependency inline https://github.com/Jpja/Electrum-Counterparty/blob/master/js/lib/sha256.js
// version permalink: https://github.com/Jpja/Electrum-Counterparty/blob/cfdb65cf7fc6426a89595c5f7a70f6a81d205c80/js/lib/sha256.js

//https://stackoverflow.com/questions/59777670/how-can-i-hash-a-string-with-sha256-in-js

function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    };

    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length'
    var i, j; // Used as a counter across the whole file
    var result = ''

    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;

    //* caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash = sha256.h = sha256.h || [];
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    /*/
      var hash = [], k = [];
      var primeCounter = 0;
      //*/

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80' // Append Ƈ' bit (plus zero padding)
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00' // More zero padding
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return; // ASCII check: only accept characters in range 0-255
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength)

    // process each chunk
    for (j = 0; j < words[lengthProperty];) {
        var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
        var oldHash = hash;
        // This is now the undefinedworking hash", often labelled as variables a...g
        // (we have to truncate as well, otherwise extra entries at the end accumulate
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            var i2 = i + j;
            // Expand the message into 64 words
            // Used below if 
            var w15 = w[i - 15], w2 = w[i - 2];

            // Iterate
            var a = hash[0], e = hash[4];
            var temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
                + ((e & hash[5]) ^ ((~e) & hash[6])) // ch
                + k[i]
                // Expand the message schedule if needed
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) // s0
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)) // s1
                ) | 0
                );
            // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
            var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj

            hash = [(temp1 + temp2) | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? 0 : '') + b.toString(16);
        }
    }
    return result;
};


module.exports = {
    get_json,
    decode_data,
};
