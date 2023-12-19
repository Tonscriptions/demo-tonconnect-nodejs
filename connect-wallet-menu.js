
const ton = require('@tonconnect/sdk')
const qr = require("qrcode")
const _bot = require("./bot");
const _wallet = require("./ton/wallets");
const _ctr = require("./ton/connector")
const utils = require("./utils")
const fs = require("fs")
const walletMenuCallbacks = {
    chose_wallet: onChooseWalletClick,
    select_wallet: onWalletClick,
    universal_qr: onOpenUniversalQRClick
};
async function onChooseWalletClick(query) {
    const wallets = await _wallet.getWallets();

    await _bot.editMessageReplyMarkup(
        {
            inline_keyboard: [
                wallets.map(wallet => ({
                    text: wallet.name,
                    callback_data: JSON.stringify({ method: 'select_wallet', data: wallet.appName })
                })),
                [
                    {
                        text: '« Back',
                        callback_data: JSON.stringify({
                            method: 'universal_qr'
                        })
                    }
                ]
            ]
        },
        {
            message_id: query.message?.message_id,
            chat_id: query.message?.chat.id
        }
    );
}

async function onOpenUniversalQRClick(query){
    const chatId = query.message?.chat.id;
    const wallets = await _wallet.getWallets();

    const connector = _ctr.getConnector(chatId);

    const link = connector.connect(wallets);

    await editQR(query.message, link);

    const keyboard = await utils.buildUniversalKeyboard(link, wallets);

    await _bot.editMessageReplyMarkup(
        {
            inline_keyboard: [keyboard]
        },
        {
            message_id: query.message?.message_id,
            chat_id: query.message?.chat.id
        }
    );
}

async function onWalletClick(query, data){
    const chatId = query.message?.chat.id;
    const connector = _ctr.getConnector(chatId);

    const selectedWallet = await _wallet.getWalletInfo(data);
    if (!selectedWallet) {
        return;
    }

    let buttonLink = connector.connect({
        bridgeUrl: selectedWallet.bridgeUrl,
        universalLink: selectedWallet.universalLink
    });

    let qrLink = buttonLink;

    if (ton.isTelegramUrl(selectedWallet.universalLink)) {
        buttonLink = utils.addTGReturnStrategy(buttonLink, process.env.TELEGRAM__bot_LINK);
        qrLink = utils.addTGReturnStrategy(qrLink, 'none');
    }

    await editQR(query.message, qrLink);

    await _bot.editMessageReplyMarkup(
        {
            inline_keyboard: [
                [
                    {
                        text: '« Back',
                        callback_data: JSON.stringify({ method: 'chose_wallet' })
                    },
                    {
                        text: `Open ${selectedWallet.name}`,
                        url: buttonLink
                    }
                ]
            ]
        },
        {
            message_id: query.message?.message_id,
            chat_id: chatId
        }
    );
}

async function editQR(message, link){
    const fileName = 'QR-code-' + Math.round(Math.random() * 10000000000);

    await qr.toFile(`./${fileName}`, link);

    await _bot.editMessageMedia(
        {
            type: 'photo',
            media: `attach://${fileName}`
        },
        {
            message_id: message?.message_id,
            chat_id: message?.chat.id
        }
    );

    await new Promise(r => fs.rm(`./${fileName}`, r));
}
module.exports = {
    walletMenuCallbacks
}