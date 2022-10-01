const algosdk = require('algosdk');
const { Client } = require("pg");

const token = { "X-API-Key": 'PYEJEyam2A53h6jKnbPRpawjVyv5WQq56N82pTdR' };
const server = 'https://mainnet-algorand.api.purestake.io/idx2';
const port = '';
const client = new algosdk.Indexer(token, server, port);

const credentials = {
    user: "lambda_user",
    host: "alchemon-game-cluster.cluster-coym176g1lh9.us-east-1.rds.amazonaws.com",
    database: "alchemon_game_instance_1",
    password: "B}Zpg6!5#+w-qH]ep0P",
    port: 5432,
};

let userBalances = {};

const liquidityPools = {
    "779144639":"X5IP2POFOMYNPGTE6HIMZOIIJPLEWZBVZZU3D5BZ45LUROXD6GYNCN55KM"
}

const lpAccounts = [];

const clientDb = new Client(credentials);

async function getAlchecoinAmounts () {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)

        await clientDb.connect();
        console.log('connected')
        const minAmount = 0
        const limit = 1000
        try {
            while (numtx > 0) {
                // execute code as long as condition is true
                const nextPage = nexttoken
                const response = await client.lookupAssetBalances(310014962)
                    .limit(limit)
                    .currencyGreaterThan(minAmount)
                    .nextToken(nextPage).do()
                const transactions = response.balances
                numtx = transactions.length
                if (numtx > 0) {
                    nexttoken = response['next-token']
                    for (const key of transactions) {
                        await clientDb.query("INSERT INTO governance_accounts(wallet_address, alchecoin_amount) VALUES ($1, $2)", [key.address, key.amount]);
                        userBalances[key.address] = key.amount
                    }
                }
            }

            console.log("done")
        } catch (e) {
            console.log(e)
        }
}

async function getLPAlchecoinAmounts() {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
    for (const asset in liquidityPools) {
        try {
            console.log('starting lp alchecoin')
            const minAmount = 1
            const limit = 1000
            while (numtx > 0) {
                // execute code as long as condition is true
                const nextPage = nexttoken
                const response = await client.lookupAssetBalances(asset)
                    .limit(limit)
                    .currencyGreaterThan(minAmount)
                    .nextToken(nextPage).do()
                const transactions = response.balances
                numtx = transactions.length
                if (numtx > 0) {
                    nexttoken = response['next-token']
                    for (const key of transactions) {
                        lpAccounts.push(key.address)
                    }
                }
            }
            console.log("done")

            let nexttoken2 = '';
            let numtx2 = 1;

            for (const account of lpAccounts) {
                try {
                    let lpAlch = 0;
                    console.log('starting alchecoin sent to lp')
                    const limit = 1000
                    while (numtx2 > 0) {
                        // execute code as long as condition is true
                        const nextPage = nexttoken2
                        const response = await client.searchForTransactions()
                            .address(account)
                            .assetID(310014962)
                            .limit(limit)
                            .nextToken(nextPage).do()
                        const transactions = response.transactions
                        numtx2 = transactions.length
                        if (numtx2 > 0) {
                            nexttoken2 = response['next-token']
                            for (const key in transactions) {
                                const trans = transactions[key]
                                const assetTransfer = trans['asset-transfer-transaction']
                                const applTrans = trans['application-transaction']
                                try {
                                    if (trans.sender === account && trans['tx-type'] === 'axfer') {
                                        if (assetTransfer.receiver === liquidityPools[asset] && assetTransfer.amount > 0) {
                                            lpAlch += assetTransfer.amount
                                        }
                                    } else if (trans['tx-type'] === 'appl' && applTrans['application-id'] === 779144473) {
                                        const innerTxns = trans['inner-txns']
                                        for (const key of innerTxns) {
                                            const assetTransferTrans = key['asset-transfer-transaction']
                                            if (key['tx-type'] === 'axfer' && key.sender === liquidityPools[asset]) {
                                                lpAlch -= assetTransferTrans.amount
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.log(e)
                                }
                            }
                        }
                    }

                    if (lpAlch < 0) {
                        lpAlch = 0
                    }
                    console.log(userBalances[account] + "+" + lpAlch)
                    userBalances[account] += lpAlch
                    console.log(userBalances[account])
                    console.log('done')

                } catch(e) {
                    console.log(e)
                }
            }
        }catch(e) {
            console.log(e)
        }
    }
}

async function insertAlchAmountsIntoDb () {
    clientDb.connect()
    for (const user in userBalances) {
        console.log(user)
        await clientDb.query("INSERT INTO testing_governance(wallet_address, alchecoin_amount) VALUES ($1, $2)", [user, userBalances[user]]);
    }
    clientDb.end();

}

getAlchecoinAmounts();
getLPAlchecoinAmounts();
insertAlchAmountsIntoDb();
