require('dotenv').config()
const ton = require('@tonconnect/sdk')
const walletsListManager = new ton.WalletsListManager({
    cacheTTLMs: Number(process.env.WALLETS_LIST_CAHCE_TTL_MS)
});

async function getWallets(){
    const wallets = await walletsListManager.getWallets();
    return wallets.filter(ton.isWalletInfoRemote);
}

async function getWalletInfo(walletAppName){
    const wallets = await getWallets();
    return wallets.find(wallet => wallet.appName.toLowerCase() === walletAppName.toLowerCase());
}

module.exports = {
    getWallets,
    getWalletInfo
}