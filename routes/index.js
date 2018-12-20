const express = require('express');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const archiver = require('archiver');
const multer = require('multer');

const fs_ext = require('../utils/fs_ext')();
const core = require('../utils/core');
const router = express.Router();
const Password = require('../utils/password')

const sysInfo = core.getServerInfo();
const rootDir = path.resolve(__dirname, "../..");
const zipDir = path.join(path.resolve(__dirname, "../"), "zip");
const uploadDir = path.join(path.resolve(__dirname, "../"), "uploads");
const zipName = "moreFiles.zip";
const supportOpen = ".html/.htm";

const ipDir = {}

const requestList = [
    '/preview',
    '/hasPassword',
    '/login',
    '/downloadSingle',
    '/download',
    '/uploadFile',
    '/existFile',
    '/loadFile'
]

router.get("*", function(req, res, next) {
    const urlPath = req.url && req.url.split('?')[0]
    if (requestList.includes(urlPath)) {
        next()
        return
    }
    const currDir = req.cookies.dir
    const fileDir = path.join(currDir, req.url);

    let fileInfo = {}
    try {
        fileInfo = fs.statSync(fileDir)
    } catch (error) {
        // debugger;
    }
    res.sendFile(fileDir)
});

router.get(/\/preview.*/, function(req, res, next) {
    const currDir = req.cookies.dir
    const fileName = req.url.split('filename=') && req.url.split('filename=')[1]
    if (!fileName) {
        next()
        return
    }
    const fileDir = path.join(currDir, fileName)
    
    let fileInfo = {}
    try {
        fileInfo = fs.statSync(fileDir)
    } catch (error) {
        // debugger;
    }
    res.sendFile(fileDir)
});

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index');
    core.folderExist(zipDir, true);
    core.folderExist(uploadDir, true);
    core.getServerInfo();
});

router.get('/hasPassword', (req, res, next) => {
    if (!Password.hasPassword()) {
        res.send({ "code": "s_ok", "res": false });
    } else {
        res.send({ "code": "s_ok", "res": true });
    }
});

router.post('/login', (req, res, next) => {
    if (Password.pass(req)) {
        res.send({ "code": "s_ok", "res": true });
    } else {
        res.send({ "code": "s_ok", "res": false });
    }
});

//下载单个文件
router.get('/downloadSingle', (req, res, next) => {
    if (!Password.pass(req)) {
        res.status(403).end()
    }
    let currDir = path.normalize(req.query.dir),
        comefrom = req.query.comefrom,
        fileName = req.query.name,
        currFile = path.join(currDir, fileName),
        fReadStream;

    fs.exists(currFile, (exist) => {
        if (exist) {
            res.set({
                "Content-type": "application/octet-stream",
                "Content-Disposition": "attachment;filename=" + encodeURI(fileName)
            });
            fReadStream = fs.createReadStream(currFile);
            fReadStream.on("data", (chunk) => res.write(chunk, "binary"));
            fReadStream.on("end", () => {
                res.end();
                //删除生成的压缩文件
                if (comefrom == "archive") {
                    setTimeout(() => fs.unlink(path.join(zipDir, zipName)), 100);
                }
            });
        } else {
            res.set("Content-type", "text/html");
            res.send("file not exist!");
            res.end();
        }
    });
});

//获取下载文件的地址
router.post('/download', (req, res) => {
    if (!Password.pass(req)) {
        res.status(403).end()
    }
    let currDir = path.normalize(req.body.dir),
        fileArray = req.body.fileArray,
        filesCount = 0,     //非文件夹文件个数
        fileNameArray = [];

    //将文件和文件夹分开命名
    fileArray.forEach((file) => {
        if (file.type == 1) {
            filesCount++;
            fileNameArray.push(file.name);
        } else {
            fileNameArray.push(path.join(file.name, "**"));  //文件夹格式：folderName/**
        }
    });

    if (fileArray.length == 0) {
        res.send({ "code": "fail", "summary": "no files" });
        return;
    }

    if (filesCount == 1 && fileNameArray.length == 1) {
        //只有一个文件的时候直接走get
        let downloadUrl = "/downloadSingle?dir=" + encodeURIComponent(currDir) + "&name=" + encodeURIComponent(fileNameArray[0]);
        res.send({ "code": "s_ok", "url": downloadUrl });
    } else {
        //多个文件就压缩后再走get
        let exists = fs.existsSync(zipDir)
        if (!exists) {
            fs.mkdirSync(zipDir)
        }

        let output = fs.createWriteStream(path.join(zipDir, zipName));

        let archive = archiver.create('zip', { zlib: { level: 9 } });
        archive.pipe(output);   //和输出流相接
        //压入文件
        fileNameArray
            .map(fileName => path.join(currDir, fileName))
            .forEach(filePath => {
                archive.file(filePath, { name: path.basename(filePath) })
            })

        archive.on('error', (err) => {
            res.send({ "code": "failed", "summary": err });
            throw err;
        });
        archive.on('end', (a) => {
            //输出下载链接
            var downloadUrl = "/downloadSingle?dir=" + encodeURIComponent(zipDir) + "&name=" + encodeURIComponent(zipName) + "&comefrom=archive";
            res.send({ "code": "s_ok", "url": downloadUrl });
        });
        archive.finalize();
    }
});

// 用multer中间件保存文件
const upload = multer({ dest: './uploads/' });
const cpUpload = upload.fields([
    { name: 'file' },
    { name: 'src' }
]);
router.post("/uploadFile", cpUpload, (req, res, next) => {
    if (!Password.pass(req)) {
        res.status(403).end()
    }
    const files = req.files.file,
        dir = req.body.dir;

    let fsPromise = (file) => {
        return new Promise((resolved, rejected) => {
            // 剪切并重命名
            fs.rename(path.join(uploadDir, file.filename), path.join(dir, file.originalname), (err) => {
                if (err) {
                    rejected(err);
                } else {
                    resolved();
                }
            });
        });
    }
    Promise.all(files.map(fsPromise))
        .then(() => {
            res.set({
                'Content-Type': 'text/html'
            });
            res.send({ "code": "s_ok" });
            // res.end();
        })
        .catch((err) => {
            res.send({ "code": "failed", "summary": err });
        });
});

router.post('/existFile', (req, res) => {
    if (!Password.pass(req)) {
        res.status(403).end()
    }
    let targetDir = req.body.filePath

    if (!targetDir) {
        res.send({ "code": "failed", "summary": 'args err' })
        return
    }

    res.set("Content-type", "text/json");
    fs.exists(targetDir, exist => {
        if (exist) {
            res.send({ "code": "s_ok", "res": true});
        } else {
            res.send({ "code": "s_ok", "res": false});
        }
    })
})

//读取目录文件
router.post('/loadFile', (req, res) => {
    if (!Password.pass(req)) {
        res.status(403).end()
    }
    let currDir = "",
    order = "";
    
    const reqIp = req.ip
    if (!req.body.dir) {
        currDir = ipDir[reqIp] || rootDir;
    } else {
        currDir = path.join(req.body.dir, req.body.folderName);
    }

    if (!req.body.order) {
        order = "name";
    } else {
        order = req.body.order;
    }
    res.set("Content-type", "text/json");

    //是否打开html文件
    const fileInfo = fs.statSync(currDir);
    if (fileInfo.isFile()) { //文件
        const extName = path.extname(currDir).toLocaleLowerCase();
        //是否支持拓展名打开
        if(extName && supportOpen.indexOf(extName) !== -1){
            const result = {"code":"s_ok", "var":{fileName:path.basename(currDir)}, type:"html"};
            res.send(result);
        } else {
            let result = { "code": "failed", "path": currDir, summary: 'only support open .html' };
            res.send(result);
        }
        return
    }

    fs_ext.readdir(currDir)
        .then((files) => {
            return _.clone(files);
        })
        .then((fileArray) => {
            let fileDetailArray = [];

            function getFileInfo(fileName) {
                return new Promise((resolve, rejected) => {
                    fs.lstat(path.join(currDir, fileName), (err, stats) => {
                        if (!err) {
                            let obj = {
                                name: fileName,
                                type: stats.isFile() ? 1 : 0,
                                isFile: stats.isFile(),
                                isDirectory: stats.isDirectory(),
                                size: stats.size,
                                birthtime: stats.birthtime.getTime(),
                                ctime: stats.ctime.getTime(),   // create time
                                mtime: stats.mtime.getTime()    // modify time
                            };
                            fileDetailArray.push(obj);
                            resolve();
                        } else {
                            if (err.errno = -4048) {//无权限访问的文件夹
                                resolve();
                            } else {
                                rejected(err);
                            }
                        }

                    })
                });
            }

            Promise.all(fileArray.map(getFileInfo))
                .then(() => {
                    //TODO:sort 按文件夹在上的顺序
                    fileDetailArray.sort(sortOrder);
                    let result = { "code": "s_ok", "path": currDir, "var": fileDetailArray, sysInfo: sysInfo };
                    res.send(result);
                    ipDir[reqIp] = currDir

                    //排序
                    function sortOrder(a, b) {
                        if (a.type != b.type) {
                            if (a.type > b.type) {   //文件夹总是排在上面
                                return 1;
                            } else {
                                return -1;
                            }
                        }

                        //文件类型相同再第二级比较
                        let forward = null;
                        switch (order) {
                            case "size":
                                if (a.size >= b.size) {
                                    forward = -1;
                                } else {
                                    forward = 1;
                                }
                                break;
                            case "birthtime":
                                if (a.birthtime >= b.birthtime) {
                                    forward = -1;
                                } else {
                                    forward = 1;
                                }
                                break;
                            case "ctime":
                                if (a.ctime >= b.ctime) {
                                    forward = -1;
                                } else {
                                    forward = 1;
                                }
                                break;
                            default:
                                if (a.name <= b.name) {
                                    forward = -1;
                                } else {
                                    forward = 1;
                                }
                                break;
                        }
                        return forward;
                    }
                })
                .catch((err) => {
                    let result = { "code": "failed", "path": currDir, "summary": err };
                    res.send(result);
                })
                .done();
        })
        .catch((err) => {
            let result = { "code": "failed", "path": currDir, "summary": err };
            res.send(result);
        })
        .done();
    });

module.exports = router;
