const http = require('http'); // 加载http模块
const fs = require('fs'); // 加载文件系统模块
const path = require('path'); // 加载path模块
const mime = require('mime'); // 用于选择MIME Type

const cache = {}; // 缓存

/**
 * 处理404错误
 * @param response
 */
function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'}); // 设置请求头
    response.write('404 请求的资源不存在');
    response.end();
}

/**
 * 发送文件
 * @param response
 * @param filePath 文件路径
 * @param fileContents 文件数据
 */
function sendFile(response, filePath, fileContents) {
    // path.basename获取文件名，mime.getType(string)返回MIME type
    response.writeHead(200, {'Content-Type':mime.getType(path.basename(filePath)), 'charset': 'utf-8'})
    response.end(fileContents);
}

/**
 * 静态文件服务
 * @param response
 * @param cache 缓存
 * @param absPath 绝对路径
 */
function serveStatic(response, cache, absPath) {
    // 如果资源已经被缓存，从缓冲区中读取
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        // 检查文件是否存在
        fs.exists(absPath, (exist)=>{
            if (exist) {
                fs.readFile(absPath, (err, data)=>{
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;//缓存文件
                        sendFile(response, absPath, data);
                    }
                })
            } else {
                // 文件不存在
                send404(response);
            }
        })
    }
}

const server = http.createServer((request, response)=>{
    let filePath = false; // 相对路径
    let prefix = 'public';// 范围路径前缀
    let suffix = '';// 范围路径后缀
    if (request.url == '/') {
        // 根路径
        filePath = path.join(prefix, '/index.html');
    } else {
        filePath = prefix + request.url + suffix;
    }
    let absPath = path.join(__dirname, filePath);
    // 绝对路径
    console.log(absPath);
    serveStatic(response, cache, absPath);
})

server.listen(3000, '127.0.0.1', ()=>{
    console.log("Server listening on port 3000");
});