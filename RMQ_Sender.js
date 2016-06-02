#!/usr/bin/env node
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
var amqp = require(pathModules+'/amqplib/callback_api');
//Set RabbitMQ URL
var rabbitMqUrl="amqp://"+properties.get('rabbitMqUser')+":"+properties.get('rabbitMqPsw')
						+"@"+properties.get('rabbitMqServer')+"/"+properties.get('rabbitMqvHost');
var channel=null;
var connection=null;
var ex = properties.get('rabbitMqExchange');
var queue=properties.get('rabbitMqQueue');

//this is the method called from client_opcua.js
module.exports = function(values){
	createConnection();
	if(channel!=null){	
				var value=  values; 
				//create exchange
				channel.assertExchange(ex, 'fanout', {durable: false});
				//publish data to rabbitMQ
				channel.publish(ex, queue, new Buffer(value));
				console.log(" [x] Sent %s", value);
			}
}

//createConnection with RabbitMQ if this not exist
function createConnection(){
	if (connection==null){
		amqp.connect(rabbitMqUrl, function(err, conn) {
			if(channel==null){
			  conn.createChannel(function(err, ch) {
				var msg= "";
				channel=ch;
			  });
			}
			connection=conn;
		});
	}
}