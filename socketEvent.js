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
            client.emit('message res', 'send succ');
        });

        client.on("broadcast", (msg) =>{
            client.emit('broadcast res', { for: 'sender', msg: 'broadcast succ' });
            // client.broadcast.emit('broadcast res', { for: 'others', msg: msg }); // 非自己广播
            io.emit('broadcast res', { for: 'others', msg: msg }); // 全体广播
        });
    });
};