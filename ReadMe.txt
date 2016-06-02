Install NodeJS
Install Node-OPCUAi
	In NodeJs install node-opcua with command "npm install node-opcua". 
	This module is used by simple_server.js(the opcua server, that sends the data) 
	and by client-opcua that recevie the data and by socket send the date to rabbitMQ.
Install properties-reader
	with the command "npm install properties-reader". 
	This module is used for read the configuration file, and is used from client_opcua, simple_server, RMQ_sender and revicer
Install in nodeJs npm install socket.io
	is use to send the data from client-opcua and RMQ_sender.


Install in nodeJs npm install color
Install in nodeJs npm install express
Install in nodeJs npm install async
	This three are used by client-opcua.

Add Enviroment variable Nodejs called NODE_ENV with value = path nodejs.

