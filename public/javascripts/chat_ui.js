/**
 * 处理用户消息，不安全的javascript代码将被格式化
 * @param message 消息文本
 * @returns {jQuery}
 */
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

/**
 * 处理系统消息
 * @param message
 * @returns {*|jQuery}
 */
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
    let message = $('#send-message').val();
    let systemMessage;

    if (message.charAt(0) === '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    } else {
        chatApp.sendMessage($('#room').text(), message); // 广播非命令消息给其它用户
        $('#messages').append(divEscapedContentElement(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');
}

const socket = io.connect();

$(document).ready(function () {
    let chatApp = new Chat(socket);

    socket.on('nameResult', (result)=>{
        let message;
        if (result.success) {
            message = 'You are now known as ' + result.name + '.';
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    // 显示更改房间结果
    socket.on('joinResult', (result)=>{
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed'));
    });

    // 显示接收到的消息
    socket.on('message', (message)=>{
        let newElement = divEscapedContentElement(message.text);
        $('#messages').append(newElement);
    })

    // 显示rooms列表
    socket.on('rooms', (rooms)=>{
        $('#room-list').empty();
        console.log(rooms)
        for (let room in rooms) {
            room = room.substring(0, room.length);
            if (room !== '') {
                $('#room-list').append(divEscapedContentElement(room));
            }
        }
        $('#room-list div').click(function(){
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    })

    // 每秒更新一次房间信息
    setInterval(()=>{
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    // 提交表单时发送消息
    $('#send-form').submit(()=>{
        processUserInput(chatApp, socket);
        return false;
    })
})