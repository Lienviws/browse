/**********************
 * core.js
 * 公共函数
 *********************/
var fs = require("fs"),
	_ = require("lodash"),
	os = require("os");

module.exports = {
    
    /**
     * 格式化时间文本
     * @param {Date} text 要格式化的文本
     * @param {String} date 时间对象
     * @returns {String}
     * @example
     * $Date.format("现在是yyyy年MM月dd日 hh点mm分ss秒，星期w",new Date());
     * y 表示年份
     * M 大写M表示月份
     * d 表示几号
     * h 表示小时
     * m 表示分
     * s 表示秒
     * w 表示星期几
     **/
    formatDate: function(text, date) {
        var reg = /yyyy|yy|M+|d+|h+|m+|s+|q+|S|w/g;
        text = text.replace(reg, function (pattern) {
            var result;
            switch (pattern) {
                case "yyyy":
                    result = date.getFullYear();
                    break;
                case "yy":
                    result = date.getFullYear().toString().substring(2);
                    break;
                case "M":
                case "MM":
                    result = date.getMonth() + 1;
                    break;
                case "dd":
                case "d":
                    result = date.getDate();
                    break;
                case "hh":
                case "h":
                    result = date.getHours();
                    break;
                case "mm":
                case "m":
                    result = date.getMinutes();
                    break;
                case "ss":
                case "s":
                    result = date.getSeconds();
                    break;
                case "q":
                    result = Math.floor((date.getMonth() + 3) / 3);
                    break;
                case "S":
                    result = date.getMilliseconds();
                    break;
                case "w":
                    result = "日一二三四五六".charAt(date.getDay());
                    break;
                default:
                    result = "";
                    break;
            }
            if (pattern.length == 2 && result.toString().length == 1) {
                result = "0" + result;
            }
            return result;
        });
        return text;
    },
    /**
     * 得到服务器信息
     */
    getServerInfo: function() {
        var ipv4,mac;
        for(var i = 0;i < os.networkInterfaces().en0.length; i++){
            if(os.networkInterfaces().en0[i].family == "IPv4"){
                ipv4 = os.networkInterfaces().en0[i].address;
                mac = os.networkInterfaces().en0[i].mac;
            }
        }
        return{
            host: os.hostname(),
            ipv4: ipv4,
            mac: mac
        }
    },
    /**
     * 获取服务器时间
     */
    getServerTime: function(){
        return this.formatDate("[yyyy.MM.dd hh:mm:ss]",new Date());
    },
    
    /**
     * 获取访问者的信息
     * @params req 请求
     * @params data 数据对象
     */
    getReqInfo: function(req, data){
        var info = {
            ___reqTime: new Date(),
            ___reqAddr: req ? req.connection.remoteAddress : ""
        };
        
        if(!arguments[0]){//如果没传第一个参数req
            var schemaBase = {};
            schemaBase["___reqTime"] = Date;
            schemaBase["___reqAddr"] = String;
            return schemaBase;
        }
        
        if(!arguments[1]){//如果没传第二个参数data
            return _.assign(req.body,info);
        }else{
            return _.assign(data,info);
        }
    },
    /**
     * 检查文件夹是否存在
     * @params folderDir 文件夹路径
     * @params ifCreate 如果不存在是否自动创建
     */
    folderExist: function(folderDir, ifCreate) {
        fs.stat(folderDir,function(err,stats) {
            if(!err){
                return true;
            }
            if(err.errno == -2){    //文件不存在
                if(ifCreate){
                    fs.mkdir(folderDir);
                    return true;
                }else{
                    return false;
                }
            }else{
                return false;
            }
        });
    }
};