const algosdk = require('algosdk');
const { Client } = require("pg");

const token1 = { "X-API-Key": 'PYEJEyam2A53h6jKnbPRpawjVyv5WQq56N82pTdR' };
const token2 = { "X-API-Key": 'sxwIKIENYg9Es5rsmoanF5WAYXBBHDQ70vGvhI4g' };
const token3 = { "X-API-Key": 'unD5uuW8C186BFO7Z9KkC5JNCuPVE3Wb8lkQnDGT' };


const server = 'https://mainnet-algorand.api.purestake.io/idx2';
const port = '';
const client1 = new algosdk.Indexer(token1, server, port);
const client2 = new algosdk.Indexer(token2, server, port);
const client3 = new algosdk.Indexer(token3, server, port);

const clients = [client1, client2, client3];

const credentials = {
    user: "lambda_user",
    host: "alchemon-game-cluster.cluster-coym176g1lh9.us-east-1.rds.amazonaws.com",
    database: "alchemon_game_instance_1",
    password: "B}Zpg6!5#+w-qH]ep0P",
    port: 5432,
};

let userBalances = {};

const liquidityPools = [
    {
        name: 'Humble',
        token: 779144639,
        id: 779144473,
        address: 'X5IP2POFOMYNPGTE6HIMZOIIJPLEWZBVZZU3D5BZ45LUROXD6GYNCN55KM'
},
    {
        name: 'TinyMan',
        token: 552701368,
        id: 552635992,
        address: 'EJGN54S3OSQXDX5NYOGYZBGLIZZEKQSROO3AXKX2WPJ2CRMAW57YMDXWWE'
    }
]


const lpAccounts = [];

const clientDb = new Client(credentials);

async function getAlchecoinAmounts () {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
        console.log('connected')
        const minAmount = 0
        const limit = 1000
        while (numtx > 0) {
            // execute code as long as condition is true
            const nextPage = nexttoken
            const response = await client1.lookupAssetBalances(310014962)
                .limit(limit)
                .currencyGreaterThan(minAmount)
                .nextToken(nextPage).do()
            const balances = response.balances
            numtx = balances.length
            if (numtx > 0) {
                nexttoken = response['next-token']
                for (const key of balances) {
                    userBalances[key.address] = key.amount  
                }
            }
        }
    console.log("done")
}

async function getLPAlchecoinAmounts() {
    let nexttoken = ''

    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
    for (const pool of liquidityPools) {
        try {
            console.log('starting lp alchecoin')
            const minAmount = 1
            const limit = 1000
            while (numtx > 0) {
                // execute code as long as condition is true
                const nextPage = nexttoken
                const response = await client2.lookupAssetBalances(pool.token)
                    .limit(limit)
                    .currencyGreaterThan(minAmount)
                    .nextToken(nextPage).do()
                const transactions = response.balances
                numtx = transactions.length
                if (numtx > 0) {
                    nexttoken = response['next-token']
                    for (const key of transactions) {
                        if(!liquidityPools.includes(key.address)) {
                            lpAccounts.push(key.address)
                        }
                    }
                }
            }
            console.log("done")

            let nexttoken2 = '';
            let numtx2 = 1;
            let clientNumber = 0;

            for (const account of lpAccounts) {
                try {
                    let lpAlch = 0;
                    console.log('starting alchecoin sent to lp')
                    const limit = 1000
                    while (numtx2 > 0) {
                        // execute code as long as condition is true
                        const nextPage = nexttoken2

                        const response = await clients[clientNumber].searchForTransactions()
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
                                        if (assetTransfer.receiver === pool.address && assetTransfer.amount > 0) {
                                            lpAlch += assetTransfer.amount
                                        }
                                    } else if (trans['tx-type'] === 'appl' && applTrans['application-id'] === pool.id) {
                                        const innerTxns = trans['inner-txns']
                                        for (const key of innerTxns) {
                                            const assetTransferTrans = key['asset-transfer-transaction']
                                            if (key['tx-type'] === 'axfer' && key.sender === pool.address) {
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
                    if (clientNumber === 2) {
                        clientNumber = 0
                    } else {
                        clientNumber++
                    }

                    if (lpAlch < 0) {
                        lpAlch = 0
                    }
                    console.log(userBalances[account] + "+" + lpAlch)
                    if (userBalances[account]) {
                    userBalances[account] += lpAlch
                    } else {
                        userBalances[account] = lpAlch
                    }
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

async function insertAlchAmountsIntoDb() {
    await clientDb.connect();
    console.log('========================================DB CONNECTED=====================================')
    for (const user in userBalances) {
        await clientDb.query("INSERT INTO testing_lpgovernance(wallet_address, alchecoin_amount) VALUES ($1, $2)", [user, userBalances[user]]);
    }
    clientDb.end();

}

async function runFunctions () {
    await getAlchecoinAmounts();
    await getLPAlchecoinAmounts();
    await insertAlchAmountsIntoDb();
    console.log('DONE WITH RUN FUNCTIONS')
}

runFunctions();