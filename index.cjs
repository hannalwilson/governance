const algosdk = require('algosdk');
const { Client } = require("pg");

const credentials = {
    user: "lambda_user",
    host: "alchemon-game-cluster.cluster-coym176g1lh9.us-east-1.rds.amazonaws.com",
    database: "alchemon_game_instance_1",
    password: "B}Zpg6!5#+w-qH]ep0P",
    port: 5432,
};

let userBalances = {};

const clientDb = new Client(credentials);

async function getAlchecoinAmounts () {
    let nexttoken = ''
    const token = { "X-API-Key": 'PYEJEyam2A53h6jKnbPRpawjVyv5WQq56N82pTdR' };
    const server = 'https://mainnet-algorand.api.purestake.io/idx2';
    const port = '';
    const client = new algosdk.Indexer(token, server, port);
    let numtx = 1;
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
    (async () => {
        await clientDb.connect();
        console.log('connected')
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
                    await clientDb.query("INSERT INTO governance_accounts(wallet_address, alchecoin_amount) VALUES ($1, $2)", [key.address, key.amount]);
                    userBalances[key.address] = key.amount
                }
            }
        }

        console.log("done")
    })().catch(e => {
        console.log(e)
        console.trace()
    })
}


getAlchecoinAmounts();
