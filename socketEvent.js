var socket = require('socket.io');

module.exports = function(server){
    var io = socket(server);
    io.on('connection', function(client){
        console.log('a user connected');

        client.on('disconnect', function(){
            console.log('user disconnected');
        });

        client.on('message',function(msg){
            console.log('message: ' + msg);
            io.emit('message res', 'send succ');
        });
    });
};