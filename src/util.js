export const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


export function quantityWithDivisibility(divisible, quantity_integer) {
    // return divisible ? (quantity_integer / (10 ** 8)).toFixed(8) : quantity_integer;

    // now done based on string
    // TODO locale formatting
    if (divisible) {
        const quantity_integer_string_length = `${quantity_integer}`.length;
        let to_return;
        if (quantity_integer_string_length < 8) {
            to_return = `${quantity_integer}`;
            while (to_return.length < 8) {
                to_return = '0' + to_return;
            }
            // is 8, add initial '0.'
            to_return = '0.' + to_return;
        }
        else { // quantity_integer_string_length >= 8
            const decimals = `${quantity_integer}`.slice(-8);
            const first_chars_left = `${quantity_integer}`.slice(0, quantity_integer_string_length - 8);
            to_return = `${first_chars_left ? first_chars_left : '0'}.${decimals}`;
        }
        return to_return;
    }
    else {
        return `${quantity_integer}`;
    }
}


async function getBTCPriceFromBlockchainInfo() {
    const response = await fetch('https://blockchain.info/ticker');
    const json = await response.json();
    return parseFloat(json.USD.last);
}

async function getBTCPriceFromCoinbase() {
    const response = await fetch('https://api.coinbase.com/v2/prices/spot?currency=USD');
    const json = await response.json();
    return parseFloat(json.data.amount);
}

async function getBTCPriceFromCoinGecko() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const json = await response.json();
    return parseFloat(json.bitcoin.usd);
}

async function getXCPPriceFromCoinGecko() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=counterparty&vs_currencies=usd');
    const json = await response.json();
    return parseFloat(json.counterparty.usd);
}

export async function getXCPPrice() {
  try {
      return await getXCPPriceFromCoinGecko();
  } catch (error) {
      console.error('Error al obtener el precio de CoinGecko:', error);
      return 0;
  }
}


export async function getBTCPrice() {
  try {
      return await getBTCPriceFromBlockchainInfo();
  } catch (error) {
      console.error('Error getting price from Blockchain.info:', error);
  }
  try {
      return await getBTCPriceFromCoinbase();
  } catch (error) {
      console.error('Error getting price from CoinBase:', error);
  }
  try {
      return await getBTCPriceFromCoinGecko();
  } catch (error) {
      console.error('Error getting price from coingecko:', error);
      return 0;
  }
}
