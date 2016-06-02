
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

var queue=properties.get('rabbitMqQueue');
var ex = properties.get('rabbitMqExchange');

var serverSocket=properties.get('serverSocket');
var port= properties.get("portSocket");
var express = require(pathModules+"/express");
	
//In this point prepare socket
var app = express();
app.get("/", function(req, res){
	res.send("It works!");
});
app.use(express.static(__dirname + '/'));
var io = require(pathModules+'/socket.io').listen(app.listen(port));	
	

var rabbitMqUrl="amqp://"+properties.get('rabbitMqUser')+":"+properties.get('rabbitMqPsw')
						+"@"+properties.get('rabbitMqServer')+"/"+properties.get('rabbitMqvHost');
						
						
amqp.connect(rabbitMqUrl, function(err, conn) {
 conn.createChannel(function(err, ch) {

	ch.assertExchange(ex, 'fanout', {durable: false});

	ch.assertQueue(queue, {exclusive: true}, function(err, q) {
	  console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
	  ch.bindQueue(q.queue, ex, '');
	//Consume the queue
	  ch.consume(q.queue, function(data) {

		var values=new Array();			
		  for (var i=0; i< data.content.length; i++){
			values.push(data.content[i]);
			//send value with socket
			sendSocket(values);
			console.log(" [x] %s", data.content[i]);
		  }
	  }, {noAck: true});
	});
  });
});

//Send socket Function
function sendSocket(values){
    io.sockets.on('connection', function (socket) {
    });
	io.sockets.emit('message', {
            value: values,
            nodeId:properties.get('node.id'),
            browseName: properties.get('node.name'),
        });

}
