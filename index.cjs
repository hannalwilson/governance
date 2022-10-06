const algosdk = require('algosdk');
const { Client } = require("pg");
const axios = require('axios');

const token = { "X-API-Key": 'unD5uuW8C186BFO7Z9KkC5JNCuPVE3Wb8lkQnDGT' };

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

const clientDb = new Client(credentials);

async function getAlchecoinAmounts() {
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
        const response = await client.lookupAssetBalances(310014962)
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
    // loop until there are no more transactions in the response
    // for the limit(max limit is 1000  per request)
        try {
            console.log('starting lp alchecoin')
            axios.get('https://free-api.vestige.fi/asset/310014962/contributors').then(response => {
                for (const user of response.data) {
                    if (userBalances[user.address]) {
                        userBalances[user.address] += Math.round(user.balance)
                    } else {
                        userBalances[user.address] = Math.round(user.balance)
                    }
                }
            });
            console.log("done")
        } catch (e) {
            console.log(e)
        }
}

async function insertAlchAmountsIntoDb() {
    await clientDb.connect();
    console.log('========================================DB CONNECTED=====================================')
    for (const user in userBalances) {
        await clientDb.query("INSERT INTO testing_governance(wallet_address, alchecoin_amount) VALUES ($1, $2)", [user, userBalances[user]]);
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