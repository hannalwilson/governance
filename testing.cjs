const algosdk = require('algosdk');

const token = { "X-API-Key": 'PYEJEyam2A53h6jKnbPRpawjVyv5WQq56N82pTdR' };
const server = 'https://mainnet-algorand.api.purestake.io/idx2';
const port = '';
const client = new algosdk.Indexer(token, server, port);

let userBalances = {};

const liquidityPools = {
    "779144639": "X5IP2POFOMYNPGTE6HIMZOIIJPLEWZBVZZU3D5BZ45LUROXD6GYNCN55KM"
}

const lpAccounts = [];

async function getAlchecoinAmounts() {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
    (async () => {
        console.log('starting alchecoin')
        const minAmount = 1
        const limit = 1000
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
                    userBalances[key.address] = key.amount
                }
            }
        }
        console.log("done")
        getLPAlchecoinAmounts()
    })().catch(e => {
        console.log(e)
        console.trace()
    })
}

async function getLPAlchecoinAmounts() {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
    for (const key in liquidityPools) {
        (async () => {
            console.log('starting lp alchecoin')
            const minAmount = 1
            const limit = 1000
            while (numtx > 0) {
                // execute code as long as condition is true
                const nextPage = nexttoken
                const response = await client.lookupAssetBalances(key)
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
            let lpAlch = 0
            console.log("done")

            lpAlch = await getAlchAmountsSentToLP('QTOCX5EVIH73V5QSO5TXEHZW2WW7EUYIVLBLYDBLFO4MSXXBBDY6RVWZ2E');

        })().catch(e => {
            console.log(e)
            console.trace()
        })
    }
}

async function getAlchAmountsSentToLP(account) {
    let lpAlch = 0;
    let nexttoken = '';
    let numtx = 1;


    (async () => {
        console.log('starting alchecoin sent to lp')
        const limit = 1000
        while (numtx > 0) {
            // execute code as long as condition is true
            const nextPage = nexttoken
            const response = await client.searchForTransactions()
                .address(account)
                .assetID(310014962)
                .limit(limit)
                .txType('axfer')
                .nextToken(nextPage).do()
            const transactions = response.transactions
            numtx = transactions.length
            if (numtx > 0) {
                nexttoken = response['next-token']
                for (const key in transactions) {
                    const trans = transactions[key]
                    const assetTransfer = trans['asset-transfer-transaction']
                    if (trans.sender === account) {
                        if (assetTransfer.receiver === 'X5IP2POFOMYNPGTE6HIMZOIIJPLEWZBVZZU3D5BZ45LUROXD6GYNCN55KM') {
                            console.log('here')
                            console.log(assetTransfer.amount)
                            lpAlch += assetTransfer.amount
                        }
                    }
                }
            }
        }
        console.log('done')
        return lpAlch

    })().catch(e => {
        console.log(e)
        console.trace()
    })


}


getAlchecoinAmounts();
