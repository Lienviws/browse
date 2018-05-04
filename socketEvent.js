const socket = require('socket.io');

module.exports = (server) => {
    const io = socket(server);
    io.on('connection', (client) => {
        console.log('a user connected');

        client.on('disconnect', () => {
            console.log('user disconnected');
        });

        client.on('message', (msg) => {
            console.log('message: \n' + msg);
            io.emit('message res', 'send succ');
        });

        client.on("broadcast", (msg) =>{
            client.broadcast.emit('broadcast res', { for: 'others', msg: msg });
        });
    });
};