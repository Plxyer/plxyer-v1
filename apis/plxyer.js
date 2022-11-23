//import { Connection, Account, programs } from '@metaplex/js';

const express = require('express');
const router = express.Router();
const config = require('../config');
const web3 = require('@solana/web3.js');
const metaplex = require('@metaplex/js');
const splToken = require('@solana/spl-token');
const Base58 = require('base-58');
const { metaplex: { Store, AuctionManager }, metadata: { Metadata }, auction: { Auction }, vault: { Vault } } = metaplex.programs;
const mintNFT = metaplex.actions.mintNFT;
const aws = require('aws-sdk');
var streams = require('memory-streams');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');


/* GET home page. */
router.get('/', async function(req, res, next) {
    if (req.query.publicKey === undefined) {
        res.status(400).json({ resultCode: 'BadRequest' });
        return;
    }

    var publicKey = new web3.PublicKey(req.query.publicKey);

    const connection = new metaplex.Connection('devnet');
    // Find metadata by owner
    const ownedMetadata = await Metadata.findByOwnerV2(connection, publicKey);
    console.log(ownedMetadata);

    var metadatas = [];
    for (var i = 0; i != ownedMetadata.length; ++i) {
        var mintKey = ownedMetadata[i].data.mint;
        var uri = ownedMetadata[i].data.data.uri;

        const { name, collection, attributes } = await metaplex.utils.metadata.lookup(uri);
        if (collection === undefined || collection.family === undefined || collection.family != 'PlxyerGame')
            continue;

        metadatas.push({ mintKey, name, attributes });
    }
    res.status(200).json({
        resultCode: 'Ok',
        metadatas
    });
});

/**
 * @swagger
 */
router.post('/create-nft', async function(req, res, next) {
    if (req.body.publicKey === undefined || req.body.privateKey === undefined || req.body.heroName === undefined || req.body.heroName.trim().length == 0 || req.body.cardGroup === undefined) {
        res.status(400).json({ resultCode: 'BadRequest' });
        return;
    }

    var publicKey = req.body.publicKey;
    var privateKey = req.body.privateKey;
    var heroName = req.body.heroName;
    var shardID = req.body.shardID;
    var cardSeq = req.body.cardSeq;
    var cardID = req.body.cardID;
    var cardGroup = req.body.cardGroup;

    // write metadata 
    var jsonString = `{"name": "[PlxyerGame] ${heroName}","symbol": "","description": "${heroName} NFT Card","seller_fee_basis_points": 1000,"image": "https://plxyer.s3.ap-southeast-1.amazonaws.com/nft-meta/portrait/${cardGroup}.png?ext=png","attributes": [{"trait_type": "ShardID","value": "${shardID}"},{"trait_type": "CardSeq","value": "${cardSeq}"},{"trait_type": "CardID","value": "${cardID}"}],"external_url": "","collection": {"name": "[PlxyerGame] ${heroName}","family": "PlxyerGame"},"properties": {"files": [{"uri": "https://plxyer.s3.ap-southeast-1.amazonaws.com/nft-meta/portrait/${cardGroup}.png?ext=png","type": "image/png"}],"category": "image","creators": [{"address": "${publicKey}","share": 100}]}}`;
    var reader = new streams.ReadableStream();
    reader.append(jsonString);
    //console.log(reader.toString());

    // upload json in s3
    var filePath = "nft-meta/json";
    var tmp = publicKey + '-' + uuidv4();
    var fileName = crypto.createHash('sha512').update(tmp).digest('hex') + ".json";
    var uri = "https://plxyer.s3.ap-southeast-1.amazonaws.com/nft-meta/json/" + fileName;
    console.log(uri);

    const s3 = new aws.S3({
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretKey,
        region: config.aws.region
    });

    var param = {
        'Bucket': 'PlxyerGame',
        'Key': filePath + '/' + fileName,
        'ACL': 'public-read',
        'Body': reader,
        'ContentType': 'application/json'
    }
    const stored = await s3.upload(param).promise();

    // mint NFT
    const connection = new metaplex.Connection('devnet');
    const payer = web3.Keypair.fromSecretKey(Base58.decode(privateKey));
    const wallet = new metaplex.NodeWallet(payer);
    console.log(wallet);

    var mintResponse = await mintNFT({
        connection: connection,
        wallet: wallet,
        uri: uri,
        maxSupply: 1
    });
    console.log(mintResponse);

    res.status(200).json({
        resultCode: 'Ok',
        signature: mintResponse.txId,
        mint: mintResponse.mint.toString()
    });
});

/**
 * @swagger
 */
router.post('/burn', async function(req, res, next) {
    if (req.body.publicKey === undefined || req.body.privateKey === undefined || req.body.mint === undefined) {
        res.status(400).json({ resultCode: 'BadRequest' });
        return;
    }

    var publicKey = req.body.publicKey;
    var privateKey = req.body.privateKey;
    var mint = req.body.mint;

    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'recent',
    );

    const owner = web3.Keypair.fromSecretKey(Base58.decode(privateKey));
    var mintKey = new web3.PublicKey(mint);

    const token = new splToken.Token(
        connection,
        mintKey,
        new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        owner,
    );

    const account = await token.getOrCreateAssociatedAccountInfo(owner.publicKey);
    const transaction = new web3.Transaction().add(
        splToken.Token.createBurnInstruction(
            splToken.TOKEN_PROGRAM_ID,
            mintKey,
            account.address,
            owner.publicKey, [],
            1
        ),
    );

    // Sign transaction, broadcast, and confirm
    const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction, [owner], { commitment: 'confirmed' },
    );

    res.status(200).json({
        resultCode: 'Ok',
        signature: signature
    });
});



router.get('/getOwner', async function(req, res, next) {
    if (req.query.mint === undefined) {
        res.status(400).json({ resultCode: 'BadRequest' });
        return;
    }

    var mintKey = new web3.PublicKey(req.query.mint);

    const connection = new metaplex.Connection('devnet');
    var metadata = await Metadata.findMany(connection, { mint: mintKey });
    //var info = await metaplex.Account.getInfo(connection, mintKey);
    console.log(metadata);
    console.log('publicKey' + metadata[0].pubkey.toString());
    console.log('owner' + metadata[0].info.owner.toString());

    const ownedMetadata = await Metadata.findByOwnerV2(connection, mintKey);
    console.log(ownedMetadata);

    const edition = await Metadata.getEdition(connection, mintKey);
    console.log(edition);
    console.log('publicKey' + edition.pubkey.toString());
    console.log('owner' + edition.info.owner.toString());
    //console.log('owner = ' + info.owner.toString());
    /*
    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'recent',
    );

    var programId = new web3.PublicKey(splToken.TOKEN_PROGRAM_ID);
    var response = await connection.getTokenAccountsByOwner(mintKey, {programId});
    console.log(response);
    */

    res.status(200).json({
        resultCode: 'Ok'
    });

});

module.exports = router;