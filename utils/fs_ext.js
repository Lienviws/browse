var fs = require('fs');

/**
 * promise的readdir
 */
function readdir(src) {
    return new Promise(function(resolved,rejected){
        fs.readdir(src,function(err,files) {
            if(err){
                rejected(err);
            }else{
                resolved(files);
            }
        });
    });
}

/**
 * promise的readdir
 */
function lstat(src) {
    return new Promise(function(resolved,rejected){
        fs.lstat(src,function(err,stats) {
            if(err){
                rejected(err);
            }else{
                resolved(stats);
            }
        });
    });
}

/**
 * promise的全局保险
 */
function addPromiseDone(){
    Promise.prototype.done = function(onFulfilled, onRejected){
        this.then(onFulfilled, onRejected)
            .catch(function(reason){
                //抛出全局错误
                setTimeout(() => {throw reason},0)
            });
    }
}

module.exports = function(){
    addPromiseDone();
    return {
        readdir: readdir,
        lstat: lstat
    }
};