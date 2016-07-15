
var AWS = require('aws-sdk');
var qs = require('querystring');
var token, kmsEncyptedToken;

var dynamodb = new AWS.DynamoDB({region:'ap-northeast-1'});

kmsEncyptedToken = "****";

exports.handler = function (event, context) {
    if (token) {
        // Container reuse, simply process the event with the key in memory
        processEvent(event, context);
    } else if (kmsEncyptedToken && kmsEncyptedToken !== "<kmsEncryptedToken>") {
        var encryptedBuf = new Buffer(kmsEncyptedToken, 'base64');
        var cipherText = {CiphertextBlob: encryptedBuf};

        var kms = new AWS.KMS();
        kms.decrypt(cipherText, function (err, data) {
            if (err) {
                console.log("Decrypt error: " + err);
                context.fail(err);
            } else {
                token = data.Plaintext.toString('ascii');
                processEvent(event, context);
            }
        });
    } else {
        context.fail("Token has not been set.");
    }
};

var processEvent = function(event, context) {
    var body = event.body;
    var params = qs.parse(body);
    var requestToken = params.token;
    
    if (requestToken !== token) {
        console.error("Request token (" + requestToken + ") does not match exptected");
        context.fail("Invalid request token");
    }

    var user = params.user_name;
    var command = params.command;
    var channel = params.channel_name;
    var commandText = params.text;

    var number = Math.floor(Math.random() * 6 + 1);
    
    var date = new Date();
    var unixTimestamp = date.getTime();
    
    var params = {
        TableName:'test-itou',
        Item:{
            "timestamp":{
                "S":String(unixTimestamp)
            },
            "number":{
                "S":String(number)
            },
            "user":{
                "S":user
            }
        }
    };
    dynamodb.putItem(params, function (err, data) {
        if (err) {
            context.fail(err);
        } else {
            context.succeed({"response_type":"in_channel","text":number + " (" + user + ")"});
        }
    });

};
