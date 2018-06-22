const socketio = require('socket.io');
let io;
let guestNumber = 1; // 用户数量
let nickNames = {}; // 用户socket id与用户名的映射
let namesUsed = []; // 已被使用的用户名
let currentRoom = {}; // 存储用户与房间的映射

exports.listen = function (server) {
    // 启动Socket.IO服务器
    /*v0.9配置
    io = socketio.listen(server);
    io.set('log level', 1); // v1中已移除set
    */
    // v1配置
    io = socketio(server);

    // 用户连接时的处理逻辑
    io.on('connection', (socket)=>{

        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);// 为用户分配一个名称

        joinRoom(socket, 'Lobby');// 将用户存储在 "Lobby" 聊天室中

        handleMessageBroadcasting(socket, nickNames);// 用户消息处理

        handleNameChangeAttempts(socket, nickNames, namesUsed);// 用户名修改处理

        handleRoomJoining(socket);// 进入房间处理

        // 当用户请求房间时，为用户提供一个正在使用的房间列表
        socket.on('rooms', ()=>{
            socket.emit('rooms', io.sockets.adapter.rooms);// 旧版本io.sockets.manager.rooms
        });

        handleClientDisconnection(socket, nickNames, namesUsed);// 用户断开连接处理
    })
};

/**
 * 为用户分配用户名
 * @param socket
 * @param guestNumber
 * @param nickNames
 * @param namesUsed
 * @returns {*}
 */
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    let name = 'Guest' + guestNumber; // 创建一个用户名
    nickNames[socket.id] = name; // 用户名与connection id关联
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name); // 记录已经被使用的用户名
    return guestNumber + 1; // 用户数+1
}

/**
 * 用户加入房间
 * @param socket
 * @param room
 */
function joinRoom(socket, room) {
    socket.join(room); // 把用户加入房间
    currentRoom[socket.id] = room; // 标记该用户已经在此房间
    socket.emit('joinResult', {room: room}); // 让用户知道知道已经在新房间
    // 通知其他用户新用户加入房间
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });
    let usersInRoom = io.sockets.adapter.rooms[room]; // 获取其他在此room的用户
    console.log(usersInRoom);
    // 如果房间中有其他用户，列出其他用户
    if (usersInRoom.length > 1) {
        let usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (let index in usersInRoom) {
            let userSocketId = usersInRoom[index].id;
            if (userSocketId !== socket.id) {
                if (index > 0) {
                    usersInRoomSummary + ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', {text: usersInRoomSummary});// 给当前用户发送其它用户数据
    }
}

/**
 * 名称修改
 * @param socket
 * @param nickNames
 * @param namesUsed
 */
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', (name)=>{
        // 名字不能以Guest开头
        if (name.indexOf('Guest') === 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            // 如果名字未被使用，注册该名字
            if (namesUsed.indexOf(name) === -1) {
                let previousName = nickNames[socket.id];
                let previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name); // 添加新名字
                nickNames[socket.id] = name; // 更新用户名字
                delete namesUsed[previousNameIndex]; // 删除旧名字
                // 通知用户改名成功
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                // 将改名成功结果通知当前房间的其它用户
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                // 名称已被占用
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    })
}

/**
 * 消息广播
 * @param socket
 */
function handleMessageBroadcasting(socket) {
    socket.on('message', (message)=>{
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}

/**
 * 进入房间
 * @param socket
 */
function handleRoomJoining(socket) {
    socket.on('join', (room)=>{
        socket.leave(currentRoom[socket.id], null); // 退出当前房间
        joinRoom(socket, room.newRoom); // 加入新房间
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', ()=>{
        let nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}