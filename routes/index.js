var express = require('express');
var path = require('path');
var _ = require('lodash');
var fs = require('fs');

var fs_ext = require('../utils/fs_ext')();
var core = require('../utils/core');
var router = express.Router();

var rootDir = path.resolve(__dirname,"../..");

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

router.post('/loadFile',function(req, res) {
    var currDir = "";
    var order = "";
    if(!req.body.dir){
        currDir = rootDir;
    }else{
        currDir = path.normalize(req.body.dir);
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
                         var result = {"code":"s_ok", "path":currDir, "var":fileDetailArray};
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
