require('dotenv').config()


const ton = require('@tonconnect/sdk')
const qr = require("qrcode")
const _bot = require("./bot");
const _wallet = require("./ton/wallets");
const _ctr = require("./ton/connector")
const utils = require("./utils")
const cwm = require("./connect-wallet-menu")
const ch = require("./commands-handlers");


async function main(){

    const callbacks = {
        ...cwm.walletMenuCallbacks
    };

    _bot.on('callback_query', query => {
        if (!query.data) {
            return;
        }

        let request= { method: "", data: "" };

        try {
            request = JSON.parse(query.data);
        } catch {
            return;
        }

    });

    _bot.onText(/\/connect/, ch.handleConnectCommand);

    _bot.onText(/\/send_tx/, ch.handleSendTXCommand);

    _bot.onText(/\/disconnect/, ch.handleDisconnectCommand);

    _bot.onText(/\/my_wallet/, ch.handleShowMyWalletCommand);

    _bot.onText(/\/start/, (msg) => {
        _bot.sendMessage(
            msg.chat.id,
            `
This is an example of a telegram _bot for connecting to TON wallets and sending transactions with TonConnect.
            
Commands list: 
/connect - Connect to a wallet
/my_wallet - Show connected wallet
/send_tx - Send transaction
/disconnect - Disconnect from the wallet

GitHub: https://github.com/ton-connect/demo-telegram-_bot
`
        );
    });
}

main();
