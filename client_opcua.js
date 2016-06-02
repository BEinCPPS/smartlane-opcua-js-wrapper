//Read Enviroment Variable NODE_ENV 
var env=process.env.NODE_ENV;

var PropertiesReader = require(env+'/node_modules/properties-reader');
var configPath=""+process.argv.slice(2);

if(configPath==null || configPath==""){
	configPath='./config.properties';
}
var properties="";
try{
	properties = PropertiesReader(configPath);
}catch(e){
	console.error("configuration File not valid");
	return;
}

var pathModules =env+properties.get('pathModules');
console.log(pathModules);
//Read from properties File the Url of OPCUA Server;
var serverOPCUrl= properties.get("serverOPCUrl");
//Load the Module nodejs needed
var opcua = require(pathModules+"/node-opcua");
var async = require(pathModules+"/async");
var color = require(pathModules+"/colors");

//require RMQ_Sender to send the data from client_opcua to RMQ_Sender.
var rmqSender= require('./RMQ_Sender.js');

var client = new opcua.OPCUAClient({

});

var endpointUrl=serverOPCUrl;
var the_subscription,the_session;

async.series([
    function(callback) {
        console.log(" connecting to ", endpointUrl.cyan.bold);
        client.connect(endpointUrl,callback);
    },
    function(callback) {
        client.createSession(function (err,session){
            if (!err) {
                the_session = session;
                console.log(" session created".yellow);
            }
            callback(err);
        });
    },
    function(callback) {
        the_subscription=new opcua.ClientSubscription(the_session,{
            requestedPublishingInterval: 2000,
            requestedMaxKeepAliveCount:  2000,
            requestedLifetimeCount:      6000,
            maxNotificationsPerPublish:  1000,
            publishingEnabled: true,
            priority: 10
        });

        the_subscription.on("started",function(){
            console.log("subscription started");
            callback();

        }).on("keepalive",function(){
            console.log("keepalive");

        }).on("terminated",function(){
            console.log(" TERMINATED ------------------------------>")
        });

    }
],function(err) {
    if (!err) {
        startHTTPServer();
    } else {
        // cannot connect to client
        console.log(err);
    }
});


var nodeIdToMonitor = properties.get('node.id');

function startHTTPServer() {
	
//define the node to be monitored
    var monitoredItem = the_subscription.monitor(
        {
            nodeId: nodeIdToMonitor,
            attributeId: 13
        },
        {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 100
        },opcua.read_service.TimestampsToReturn.Both,function(err) {
            if (err) {
                console.log("Monitor  "+ nodeIdToMonitor.toString() +  " failed");
                console.loo("ERR = ",err.message);
            }

        });
		
	//if the node changed send the value;
    monitoredItem.on("changed", function(dataValue){

        //xx 
		console.log(" value has changed " +  dataValue.toString());
		//
		rmqSender(dataValue.value.value);
    });

}

