const Chat = function(socket) {
    this.socket = socket;
};

Chat.prototype.sendMessage = function(room, text) {
    let message = {
        room: room,
        text: text
    };
    this.socket.emit('message', message);
}

Chat.prototype.changeRoom = function(room) {
    this.socket.emit('join', {
        newRoom: room
    });
}

Chat.prototype.processCommand = function(command) {
    let words = command.split(' '); // 用空格分割字符串
    var command = words[0]
                    .substring(1, words[0].length)
                    .toLowerCase(); // 第一个元素为命令
    let message = false;

    switch (command) {
        case 'join':
            words.shift(); // 移除命令元素
            let room = words.join(' '); // 用空格重新联合成字符串
            this.changeRoom(room); // 出发改变房间事件
            break;
        case 'nick':
            words.shift();
            let name = words.join(' ');
            this.socket.emit('nameAttempt', name); // 触发改名事件
            break;
        default:
            message = 'Unrecognized command.';
            break;
    }
    return message;
}