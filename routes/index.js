var express = require('express');
var path = require('path');
var _ = require('lodash');
var fs = require('fs');
var archiver = require('archiver');
var multer = require('multer');

var fs_ext = require('../utils/fs_ext')();
var core = require('../utils/core');
var router = express.Router();

var sysInfo = core.getServerInfo();
var rootDir = path.resolve(__dirname,"../..");
var zipDir = path.join(path.resolve(__dirname,"../"), "zip");
var uploadDir = path.join(path.resolve(__dirname,"../"), "uploads");
var zipName = "moreFiles.zip";

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
    core.folderExist(zipDir, true);
    core.folderExist(uploadDir, true);
    core.getServerInfo();
});

//下载单个文件
router.get('/downloadSingle',function(req, res, next){
    var currDir = path.normalize(req.query.dir),
        comefrom = req.query.comefrom,
        fileName = req.query.name,
        currFile = path.join(currDir,fileName),
        fReadStream;

    fs.exists(currFile,function(exist) {
        if(exist){
            res.set({
                "Content-type":"application/octet-stream",
                "Content-Disposition":"attachment;filename="+encodeURI(fileName)
            });
            fReadStream = fs.createReadStream(currFile);
            fReadStream.on("data",(chunk) => res.write(chunk,"binary"));
            fReadStream.on("end",function () {
                res.end();
                //删除生成的压缩文件
                if(comefrom == "archive"){
                    setTimeout(() => fs.unlink(path.join(zipDir,zipName)), 100);
                }
            });
        }else{
            res.set("Content-type","text/html");
            res.send("file not exist!");
            res.end();
        }
    });
});

//获取下载文件的地址
router.post('/download',function(req, res){
    var currDir = path.normalize(req.body.dir),
    	fileArray = req.body.fileArray,
        filesCount = 0,     //非文件夹文件个数
        fileNameArray = [];
    
    //将文件和文件夹分开命名
    fileArray.forEach(function(file) {
        if(file.type == 1){
            filesCount++;
            fileNameArray.push(file.name);
        }else{
            fileNameArray.push(path.join(file.name,"**"));  //文件夹格式：folderName/**
        }
    });

    if(fileArray.length == 0){
        res.send({"code":"fail", "summary":"no files"});
        return;
    }

    if(filesCount == 1 && fileNameArray.length == 1){
        //只有一个文件的时候直接走get
        var downloadUrl = "/downloadSingle?dir="+encodeURIComponent(currDir)+"&name="+encodeURIComponent(fileNameArray[0]);
        res.send({"code":"s_ok", "url":downloadUrl});
    }else{
        //多个文件就压缩后再走get
        var output = fs.createWriteStream(path.join("zip",zipName));
        var archive = archiver.create('zip', {});
        archive.pipe(output);   //和输出流相接
        //打包文件
        archive.bulk([ 
            {
                cwd:currDir,    //设置相对路径
                src: fileNameArray,
                expand: currDir
            }
        ]);

        archive.on('error', function(err){
            res.send({"code":"failed", "summary":err});
            throw err;
        });
        archive.on('end', function(a){
            //输出下载链接
            var downloadUrl = "/downloadSingle?dir="+encodeURIComponent(zipDir)+"&name="+encodeURIComponent(zipName)+"&comefrom=archive";
            res.send({"code":"s_ok", "url":downloadUrl});
        });
        archive.finalize();
    }
});

var count = 0;
//上传文件
var upload = multer({ dest: './uploads/'});
var cpUpload = upload.fields([
    {name: 'file', maxCount:20},
    {name: 'src'}
]);
router.post("/uploadFile",cpUpload, function(req, res, next){
    var files = req.files.file,
        dir = req.body.dir;

    var fsPromise = function(file){
        return new Promise(function(resolved,rejected){
            fs.rename(path.join(uploadDir,file.filename),path.join(dir,file.originalname),function(err){
                if(err){
                    rejected(err);
                }else{
                    resolved();
                }
            });
        });
    }
    Promise.all(files.map(fsPromise))
    .then(function(){
        res.set({
            'Content-Type':'text/html'
        });
        res.send({"code":"s_ok"});
        // res.end();
    })
    .catch(function(err) {
        res.send({"code":"failed", "summary":err});
    });
});

//读取目录文件
router.post('/loadFile',function(req, res) {
    var currDir = "",
    	order = "";

    if(!req.body.dir){
        currDir = rootDir;
    }else{
        currDir = path.join(req.body.dir,req.body.folderName);
    }

    if(!req.body.order){
        order = "name";
    }else{
        order = req.body.order;
    }
    res.set("Content-type","text/json");
    fs_ext.readdir(currDir)
          .then(function(files){
              return _.clone(files);
          })
          .then(function(fileArray){
              var fileDetailArray = [];

              function getFileInfo(fileName){
                  return new Promise(function(resolve,rejected){
                      fs.lstat(path.join(currDir,fileName),function(err,stats){
                          if(!err){
                              var obj = {
                                  name: fileName,
                                  type: stats.isFile() ? 1:0,
                                  isFile: stats.isFile(),
                                  isDirectory: stats.isDirectory(),
                                  size: stats.size,
                                  birthtime: core.formatDate("yyyy-MM-dd hh:mm:ss",stats.birthtime),
                                  ctime: core.formatDate("yyyy-MM-dd hh:mm:ss",stats.ctime),   //create time
                                  mtime: core.formatDate("yyyy-MM-dd hh:mm:ss",stats.mtime)    //modify time
                              };
                              fileDetailArray.push(obj);
                              resolve();
                          }else{
                              if(err.errno = -4048){//无权限访问的文件夹
                                  resolve();
                              }else{
                                  rejected(err);
                              }
                          }
                          
                      })
                  });
              }

              Promise.all(fileArray.map(getFileInfo))
                     .then(function() {
                         //TODO:sort 按文件夹在上的顺序
                         fileDetailArray.sort(sortOrder);
                         var result = {"code":"s_ok", "path":currDir, "var":fileDetailArray, sysInfo:sysInfo};
                         res.send(result);

                         //排序
                         function sortOrder(a,b) {
                             if(a.type != b.type){
                                 if(a.type > b.type){   //文件夹总是排在上面
                                     return 1;
                                 }else{
                                     return -1;
                                 }
                             }

                             //文件类型相同再第二级比较
                             var forward;
                             switch (order) {
                                 case "size":
                                     if(a.size >= b.size){
                                         forward = -1;
                                     }else{
                                         forward = 1;
                                     }
                                     break;
                                 case "birthtime":
                                     if(a.birthtime >= b.birthtime){
                                         forward = -1;
                                     }else{
                                         forward = 1;
                                     }
                                     break;
                                 case "ctime":
                                     if(a.ctime >= b.ctime){
                                         forward = -1;
                                     }else{
                                         forward = 1;
                                     }
                                     break;
                                 default:
                                     if(a.name <= b.name){
                                         forward = -1;
                                     }else{
                                         forward = 1;
                                     }
                                     break;
                             }
                             return forward;
                         }
                     })
                     .catch(function(err){
                         var result = {"code":"failed", "path":currDir, "summary":err};
                         res.send(result);
                     })
                     .done();
          })
          .catch(function(err){
              var result = {"code":"failed", "path":currDir, "summary":err};
              res.send(result);
          })
          .done();
});


module.exports = router;
