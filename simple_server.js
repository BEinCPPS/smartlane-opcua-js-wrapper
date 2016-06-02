/* eslint no-process-exit: 0 */
"use strict";
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
var pathOPC =env+properties.get('pathOPC');
var pathDir =env+properties.get('pathOPCModules');
var port= properties.get("port");
console.log(port);
console.log(pathDir);
console.log(pathOPC);
require(pathDir+"/requirish")._(module);
Error.stackTraceLimit = Infinity;

var argv = require(pathDir+'/yargs')
    .wrap(132)
    .string("alternateHostname")
    .describe("alternateHostname")
    .alias('a', 'alternateHostname')
    .string("port")
    .describe("port")
    .alias('p', 'port')
    .argv;

var opcua = require(pathOPC);
var _ = require(pathDir+"/underscore");
var path = require("path");
var assert = require("assert");

var OPCUAServer = opcua.OPCUAServer;
var Variant = opcua.Variant;
var DataType = opcua.DataType;
var DataValue = opcua.DataValue;
var get_fully_qualified_domain_name = opcua.get_fully_qualified_domain_name;
var makeApplicationUrn = opcua.makeApplicationUrn;

var address_space_for_conformance_testing = require(pathOPC+"/lib/simulation/address_space_for_conformance_testing");
var build_address_space_for_conformance_testing = address_space_for_conformance_testing.build_address_space_for_conformance_testing;

var install_optional_cpu_and_memory_usage_node = require(pathOPC+"/lib/server/vendor_diagnostic_nodes").install_optional_cpu_and_memory_usage_node;

var standard_nodeset_file = opcua.standard_nodeset_file;


var userManager = {
    isValidUser: function (userName, password) {

        if (userName === "user1" && password === "password1") {
            return true;
        }
        if (userName === "user2" && password === "password2") {
            return true;
        }
        return false;
    }
};

var path = require("path");

//var server_certificate_file            = path.join(__dirname, "../certificates/server_selfsigned_cert_2048.pem");
////var server_certificate_file            = path.join(__dirname, "../certificates/server_cert_2048_outofdate.pem");
//var server_certificate_privatekey_file = path.join(__dirname, "../certificates/server_key_2048.pem");
/*
var server_certificate_file            = pathOPC+"/certificates/server_selfsigned_cert_2048.pem"
//var server_certificate_file            = path.join(__dirname, "../certificates/server_cert_2048_outofdate.pem");
var server_certificate_privatekey_file = pathOPC+"/certificates/server_key_2048.pem"
*/
var server_options = {

   // certificateFile: server_certificate_file,
   // privateKeyFile: server_certificate_privatekey_file,

    port: port,
    //xx (not used: causes UAExpert to get confused) resourcePath: "UA/Server",

    maxAllowedSessionNumber: 500,

    nodeset_filename: [
        standard_nodeset_file,
       // path.join(__dirname,"../nodesets/Opc.Ua.Di.NodeSet2.xml")
		pathOPC+"/nodesets/Opc.Ua.Di.NodeSet2.xml"
	],

    serverInfo: {
        applicationUri: makeApplicationUrn(get_fully_qualified_domain_name(), "NodeOPCUA-Server"),
        productUri: "NodeOPCUA-Server",
        applicationName: {text: "NodeOPCUA" ,locale:"en"},
        gatewayServerUri: null,
        discoveryProfileUri: null,
        discoveryUrls: []
    },
    buildInfo: {
        buildNumber: "1234"
    },
    serverCapabilities: {
        operationLimits: {
            maxNodesPerRead: 1000,
            maxNodesPerBrowse: 2000
        }
    },
    userManager: userManager
};
//console.log(server_options.certificateFile);
process.title = "Node OPCUA Server on port : " + server_options.port;

server_options.alternateHostname = argv.alternateHostname;

var server = new OPCUAServer(server_options);

var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;

var hostname = require("os").hostname();


server.on("post_initialize", function () {

    build_address_space_for_conformance_testing(server.engine);

    install_optional_cpu_and_memory_usage_node(server);

    var addressSpace = server.engine.addressSpace;

    var rootFolder = addressSpace.findNode("RootFolder");
    assert(rootFolder.browseName.toString() === "Root");

    var kittingCart = addressSpace.addFolder(rootFolder.objects, {browseName: "KittingCart"});
	
	var varName=properties.get('node.name');
	var id=properties.get('node.id');
	var nodeType=properties.get('node.type');
	
    addressSpace.addVariable({
        organizedBy: kittingCart,
        browseName: varName,
        nodeId: id,
        dataType: nodeType,

        value: {
            refreshFunc: function (callback) {
				var values=new Array();
				for (var i=0; i<4; i++){ 
					var number =  Math.floor((Math.random() * 20));
					values.push(number);
				}
                var value = new Variant({dataType: nodeType,
										arrayType: opcua.VariantArrayType.Array, 
										value: values});
										
				var sourceTimestamp = new Date();
                // simulate a asynchronous behaviour
                setTimeout(function () {
                    callback(null, new DataValue({value: value, sourceTimestamp: sourceTimestamp}));
                }, 2000);
            }
        }
    });

    // UAAnalogItem
    // add a UAAnalogItem

    //------------------------------------------------------------------------------
    // Add a view
    //------------------------------------------------------------------------------
    var view = addressSpace.addView({
        organizedBy: rootFolder.views,
        browseName: "MyView"
    });
});


function dumpObject(obj) {
    function w(str, width) {
        var tmp = str + "                                        ";
        return tmp.substr(0, width);
    }

    return _.map(obj, function (value, key) {
        return "      " + w(key, 30).green + "  : " + ((value === null) ? null : value.toString());
    }).join("\n");
}


console.log("  server PID          :".yellow, process.pid);

server.start(function (err) {
    if (err) {
        console.log(" Server failed to start ... exiting");
        process.exit(-3);
    }
    console.log("  server on port      :".yellow, server.endpoints[0].port.toString().cyan);
    console.log("  endpointUrl         :".yellow, endpointUrl.cyan);

    console.log("  serverInfo          :".yellow);
    console.log(dumpObject(server.serverInfo));
    console.log("  buildInfo           :".yellow);
    console.log(dumpObject(server.engine.buildInfo));

    console.log("\n  server now waiting for connections. CTRL+C to stop".yellow);

  //  console.log = function(){};

});

server.on("create_session", function (session) {

    console.log(" SESSION CREATED");
    console.log("    client application URI: ".cyan, session.clientDescription.applicationUri);
    console.log("        client product URI: ".cyan, session.clientDescription.productUri);
    console.log("   client application name: ".cyan, session.clientDescription.applicationName.toString());
    console.log("   client application type: ".cyan, session.clientDescription.applicationType.toString());
    console.log("              session name: ".cyan, session.sessionName ? session.sessionName.toString() : "<null>");
    console.log("           session timeout: ".cyan, session.sessionTimeout);
    console.log("                session id: ".cyan, session.sessionId);
});

server.on("session_closed", function (session, reason) {
    console.log(" SESSION CLOSED :", reason);
    console.log("              session name: ".cyan, session.sessionName ? session.sessionName.toString() : "<null>");
});

function w(s, w) {
    return ("000" + s).substr(-w);
}
function t(d) {
    return w(d.getHours(), 2) + ":" + w(d.getMinutes(), 2) + ":" + w(d.getSeconds(), 2) + ":" + w(d.getMilliseconds(), 3);
}

server.on("response", function (response) {

    console.log(t(response.responseHeader.timeStamp), response.responseHeader.requestHandle,
        response._schema.name.cyan, " status = ", response.responseHeader.serviceResult.toString().cyan);
    switch (response._schema.name) {
        case "ModifySubscriptionResponse":
        case "CreateMonitoredItemsResponse":
        case "ModifyMonitoredItemsResponse":
        case "RepublishResponse":
            //xx console.log(response.toString());
            break;
        case "BrowseResponse":
        case "TranslateBrowsePathsToNodeIdsResponse":
            //xx console.log(response.toString());
            break;
        case "WriteResponse":
            break;
        case "XXXX":
            var str = "   ";
            response.results.map(function (result) {
                str += result.toString();
            });
            console.log(str);
            break;
    }

});

function indent(str, nb) {
    var spacer = "                                             ".slice(0, nb);
    return str.split("\n").map(function (s) {
        return spacer + s;
    }).join("\n");
}
server.on("request", function (request, channel) {
    console.log(t(request.requestHeader.timeStamp), request.requestHeader.requestHandle,
        request._schema.name.yellow, " ID =", channel.secureChannelId.toString().cyan);
    switch (request._schema.name) {
        case "ModifySubscriptionRequest":
        case "CreateMonitoredItemsRequest":
        case "ModifyMonitoredItemsRequest":
        case "RepublishRequest":
            //xx console.log(request.toString());
            break;
        case "xxReadRequest":
            var str = "    ";
            if (request.nodesToRead) {
                request.nodesToRead.map(function (node) {
                    str += node.nodeId.toString() + " " + node.attributeId + " " + node.indexRange;
                });
            }
            console.log(str);
            break;
        case "xxWriteRequest":
            if (request.nodesToWrite) {
                var lines = request.nodesToWrite.map(function (node) {
                    return "     " + node.nodeId.toString().green + " " + node.attributeId + " " + node.indexRange + "\n" + indent("" + node.value.toString(), 10) + "\n";
                });
                console.log(lines.join("\n"));
            }
            break;

        case "xxTranslateBrowsePathsToNodeIdsRequest":
        case "xxBrowseRequest":
            // do special console output
            //console.log(util.inspect(request, {colors: true, depth: 10}));
            console.log(request.toString());
            break;
    }
});

process.on('SIGINT', function () {
    // only work on linux apparently
    console.log(" Received server interruption from user ".red.bold);
    console.log(" shutting down ...".red.bold);
    server.shutdown(1000, function () {
        console.log(" shutting down completed ".red.bold);
        console.log(" done ".red.bold);
        console.log("");
        process.exit(-1);
    });
});

var discovery_server_endpointUrl = "opc.tcp://" + hostname + ":4840/UADiscovery";

console.log("\nregistering server to :".yellow + discovery_server_endpointUrl);

server.registerServer(discovery_server_endpointUrl, function (err) {
    if (err) {
        // cannot register server in discovery
        console.log("     warning : cannot register server into registry server".cyan);
    } else {

        console.log("     registering server to the discovery server : done.".cyan);
    }
    console.log("");
});

