
const ton = require('@tonconnect/sdk')
const qr = require("qrcode")
const _bot = require("./bot");
const _wallet = require("./ton/wallets");
const _ctr = require("./ton/connector")
const utils = require("./utils")
const _ton = require('@ton/ton')

async function handleConnectCommand(msg){
    const chatId = msg.chat.id;
    let messageWasDeleted = false;
    const connector =await _ctr.getConnector(chatId);
    console.log(connector)
    await connector.restoreConnection();
    if (connector.connected) {
        const connectedName =
            (await _wallet.getWalletInfo(connector.wallet?.device.appName))?.name ||
            connector.wallet?.device.appName;
        await _bot.sendMessage(
            chatId,
            `You have already connect ${connectedName} wallet\nYour address: ${ton.toUserFriendlyAddress(
                connector.wallet?.account.address,
                connector.wallet?.account.chain === ton.CHAIN.TESTNET
            )}\n\n Disconnect wallet firstly to connect a new one`
        );

        return;
    }

    const unsubscribe = connector.onStatusChange(async wallet => {
        if (wallet) {
            await deleteMessage();

            const walletName =
                (await _wallet.getWalletInfo(wallet.device.appName))?.name || wallet.device.appName;
            await _bot.sendMessage(chatId, `${walletName} wallet connected successfully`);
            unsubscribe();
        }
    });

    const wallets = await _wallet.getWallets();

    const link = connector.connect(wallets);
    const image = await qr.toBuffer(link);

    const keyboard = await utils.buildUniversalKeyboard(link, wallets);

    const _botMessage = await _bot.sendPhoto(chatId, image, {
        reply_markup: {
            inline_keyboard: [keyboard]
        }
    });

    async function deleteMessage() {
        if (!messageWasDeleted) {
            messageWasDeleted = true;
            await _bot.deleteMessage(chatId, _botMessage.message_id);
        }
    };
}

async function handleSendTXCommand(msg){
    const chatId = msg.chat.id;

    const connector = await _ctr.getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await _bot.sendMessage(chatId, 'Connect wallet to send transaction');
        return;
    }

    
    const selfAddress = ton.toUserFriendlyAddress(
        connector.wallet?.account.address,
        connector.wallet?.account.chain === ton.CHAIN.TESTNET
    );
    console.log(selfAddress,connector.wallet?.account.address)
    // const pl = Buffer.from('data:application/json,{"p":"ton-20","op":"mint","tick":"dedust.io","amt":"1000000000"}').toString("base64")
    const body = _ton.beginCell()
        .storeUint(0, 32) 
        .storeStringTail("Hello, TON!") 
        .endCell();

    const pl = body.toBoc().toString("base64");
    utils.pTimeout(
        connector.sendTransaction({
            validUntil: Math.round(
                (Date.now() + Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)) / 1000
            ),
            messages: [
                {
                    amount: '0',
                    address: `${connector.wallet?.account.address}`,
                    payload: pl,
                }
            ]
        }),
        Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)
    )
        .then((d) => {
            console.log(d);
            console.log('txn sent')
            _bot.sendMessage(chatId, `Transaction sent successfully`);
        })
        .catch(e => {
            if (e === utils.pTimeoutException) {
                _bot.sendMessage(chatId, `Transaction was not confirmed`);
                return;
            }

            if (e instanceof ton.UserRejectsError) {
                _bot.sendMessage(chatId, `You rejected the transaction`);
                return;
            }

            _bot.sendMessage(chatId, `Unknown error happened`);
        })
        .finally(() => connector.pauseConnection());

    let deeplink = '';
    const walletInfo = await _wallet.getWalletInfo(connector.wallet?.device.appName);
    if (walletInfo) {
        deeplink = walletInfo.universalLink;
    }

    if (ton.isTelegramUrl(deeplink)) {
        const url = new URL(deeplink);
        url.searchParams.append('startattach', 'tonconnect');
        deeplink = utils.addTGReturnStrategy(url.toString(), process.env.TELEGRAM__bot_LINK);
    }

    await _bot.sendMessage(
        chatId,
        `Open ${walletInfo?.name || connector.wallet?.device.appName} and confirm transaction`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `Open ${walletInfo?.name || connector.wallet?.device.appName}`,
                            url: deeplink
                        }
                    ]
                ]
            }
        }
    );
}

async function handleDisconnectCommand(msg){
    const chatId = msg.chat.id;

    const connector = await _ctr.getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await _bot.sendMessage(chatId, "You didn't connect a wallet");
        return;
    }

    await connector.disconnect();

    await _bot.sendMessage(chatId, 'Wallet has been disconnected');
}

async function handleShowMyWalletCommand(msg){
    const chatId = msg.chat.id;

    const connector =await _ctr.getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await _bot.sendMessage(chatId, "You didn't connect a wallet");
        return;
    }

    const walletName =
        (await _wallet.getWalletInfo(connector.wallet?.device.appName))?.name ||
        connector.wallet?.device.appName;

    await _bot.sendMessage(
        chatId,
        `Connected wallet: ${walletName}\nYour address: ${ton.toUserFriendlyAddress(
            connector.wallet?.account.address,
            connector.wallet?.account.chain === ton.CHAIN.TESTNET
        )}`
    );
}

module.exports = {
    handleShowMyWalletCommand,
    handleDisconnectCommand,
    handleSendTXCommand,
    handleConnectCommand
}