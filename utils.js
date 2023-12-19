require('dotenv').config()
const ton = require('@tonconnect/sdk')

const AT_WALLET_APP_NAME = 'telegram-wallet';

const pTimeoutException = Symbol();

function pTimeout(
    promise,
    time,
    exception
){
    let timer;
    return Promise.race([
        promise,
        new Promise((_r, rej) => (timer = setTimeout(rej, time, exception)))
    ]).finally(() => clearTimeout(timer));
}

function addTGReturnStrategy(link, strategy){
    const parsed = new URL(link);
    parsed.searchParams.append('ret', strategy);
    link = parsed.toString();

    const lastParam = link.slice(link.lastIndexOf('&') + 1);
    return link.slice(0, link.lastIndexOf('&')) + '-' + ton.encodeTelegramUrlParameters(lastParam);
}

function convertDeeplinkToUniversalLink(link, walletUniversalLink){
    const search = new URL(link).search;
    const url = new URL(walletUniversalLink);

    if (ton.isTelegramUrl(walletUniversalLink)) {
        const startattach = 'tonconnect-' + ton.encodeTelegramUrlParameters(search.slice(1));
        url.searchParams.append('startattach', startattach);
    } else {
        url.search = search;
    }

    return url.toString();
}

async function buildUniversalKeyboard(
    link,
    wallets
) {
    const atWallet = wallets.find(wallet => wallet.appName.toLowerCase() === AT_WALLET_APP_NAME);
    const atWalletLink = atWallet
        ? addTGReturnStrategy(
              convertDeeplinkToUniversalLink(link, atWallet?.universalLink),
              process.env.TELEGRAM_BOT_LINK
          )
        : undefined;

    const keyboard = [
        {
            text: 'Choose a Wallet',
            callback_data: JSON.stringify({ method: 'chose_wallet' })
        },
        {
            text: 'Open Link',
            url: `https://ton-connect.github.io/open-tc?connect=${encodeURIComponent(link)}`
        }
    ];

    if (atWalletLink) {
        keyboard.unshift({
            text: '@wallet',
            url: atWalletLink
        });
    }

    return keyboard;
}

module.exports = {
    buildUniversalKeyboard,
    convertDeeplinkToUniversalLink,
    addTGReturnStrategy,
    pTimeout,
    pTimeoutException,
    AT_WALLET_APP_NAME
}