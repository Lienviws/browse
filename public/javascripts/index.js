var vm = new Vue({
    el: "#app",
    ready:function(){
        this.getFolder();
        this.initEvents();
    },
    data:{
        files:[],
        dir:"",
        imgSrc:{
            folder:"images/normal_folder.png",
            file:"images/normal.png",
        },
        sIP:""  //服务器ip
    },
    methods:{
        initEvents: function(params) {
            var self = this;
            var fileInput = document.getElementById("fileUp");
            fileInput.onchange = function(){
                var files = this.files;
                var rootDir = self.$data.dir;
                if(files){
                    for (var key in files) {
                        if (parseInt(key,10) >= 0) {
                            var formData = new FormData();
                            formData.append("file",files[key]);
                            formData.append("dir",rootDir);

                            xhrSend({
                                method: "POST",
                                url: "/uploadFile",
                                data: formData,
                                success: function(result) {
                                    console.log("succ");
                                },
                                done: function() {
                                    self.refresh();
                                }
                            });

                            // 解决xhr唯一回调问题的demo
                            // xhrTest();
                            // function xhrTest(){
                            //     var xhr = new XMLHttpRequest();
                            //     var id = ++xhrId;
                            //     xhr.open("POST","/uploadFile");
                            //     xhr.send(formData);
                            //     callback = function(){
                            //         if(xhr.readyState == 4){
                            //             xhr.onreadystatechange = function(){};
                            //             if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304){
                            //                 console.log("succ");
                            //             }else{
                            //                 console.log("error");
                            //             }
                            //         }
                            //     }
                            //     xhr.onreadystatechange = callback;
                            // }
                        }
                    }
                }else{
                    //ie
                    var form = document.getElementById("form1");
                    var iframe = document.getElementById("iframe");
                    if(!iframe){
                        iframe = document.createElement("iframe");
                    }
                    form.action = "/uploadFile";
                    form.target = "iframe";
                    iframe.name = "iframe";
                    iframe.src = "";
                    iframe.style.display = "none";
                    iframe.onload = function(){
                        var result = iframe.contentWindow.document.body.innerText;
                        if(!result){
                            return;
                        }
                        result = JSON.parse(result);
                        if(result.code == "s_ok"){
                            console.log("succ");
                        }else{
                            alert("failed!-2");
                        }
                    };

                    document.getElementById("options").appendChild(iframe);
                    form.submit();
                }
            }
        },
        /**
         * 打开文件夹
         */
        enterFolder: function (event) {
            var tdContent = findParentUntil(event.target,"td");
            if(!tdContent){
                return false;
            }
            var folderName = tdContent.getElementsByTagName("span")[0].innerText;
            var rootDir = this.$data.dir;
            this.getFolder(rootDir,folderName);
        },
        /**
         * 按照关键字排序
         */
        orderBy: function(order){
            var rootDir = this.$data.dir;
            this.getFolder(rootDir, "", order);
        },
        /**
         * 切换全选
         */
        toggleAll: function(){
            var count = 0;
            this.$data.files.forEach(function(file){
                if(file.check){
                    count++;
                }
            });
            if(count > 0){
                this.$data.files.map(function(file){
                    file.check = false;
                })
            }else{
                this.$data.files.map(function(file){
                    file.check = true;
                })
            }
        },
        /**
         * 前一个文件夹
         */
        forwardFolder: function(){
            var self = this;
            var dir = "";
            var rootDir = this.$data.dir;
            this.getFolder(rootDir,"..");
        },
        /**
         * 通过ajax得到文件夹数据
         */
        getFolder: function(dir,folderName,order){
            this.$http.post("/loadFile",{
                dir:dir,
                folderName:folderName,
                order: order
            }).then(function(result) {
                var data = result.data;
                var self = this;
                if(data.code != "s_ok"){
                    alert(data.summary.code);
                    return false;
                }
                self.$data.dir = data.path;
                self.$data.sIP = data.sysInfo.ipv4;
                self.$data.files = [];
                data["var"].map(function(file){
                    file.check = false;
                    self.$data.files.push(file);
                })
            });
        },
        /**
         * 下载文件
         */
        download:function(){
            var downloadFileArray = [];
            this.$data.files.forEach(function(file,index) {
                if(file.check){
                    downloadFileArray.push({name:file.name,type:file.type});
                }
            });
            if(!downloadFileArray.length){
                return false;
            }
            var rootDir = this.$data.dir;
            this.$http.post("/download",{
                dir:rootDir,
                fileArray: downloadFileArray
            }).then(function(result){
                var data = result.data;
                if(data.code == "s_ok"){
                    downloadByIframe(data.url);
                }else{
                    alert(data.summary);
                }
            });
        },
        //上传文件的按钮
        upload:function() {
            var fileInput = document.getElementById("fileUp");
            fileInput.click();
        },
        refresh:function() {
            var rootDir = this.$data.dir;
            this.getFolder(rootDir,"");
        }
    }
});

/**
 * 遍历寻找父节点
 * @params target 当前节点
 * @params nodeName 父节点名称
 */
function findParentUntil(target, nodeName){
    if(!target || !target.nodeType){
        return false;
    }
    var nodeName = nodeName.toLowerCase();
    var rootNodeName = "#document";
    var tmpNode = target;
    while(true){
        if(tmpNode.nodeName.toLowerCase() == rootNodeName){
            return false;
        }
        tmpNode = tmpNode.parentNode;
        if(tmpNode.nodeName.toLowerCase() == nodeName){
            break;
        }
    }
    return tmpNode;
}

/**
 * 用iframe下载
 * @params url 下载地址
 */
function downloadByIframe(url){
    var iframe = document.getElementById("myIframe");
    if(iframe){
        iframe.src = url;
    }else{
        iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        iframe.id = "myIframe";
        document.body.appendChild(iframe);
    }
}


var xhrId = 0;
var xhrCallbacks = {};
var xhrCallbackCount = 0;
/**
 * XMLHttpRequest的封装
 * @params options 参考jquery.ajax
 */
function xhrSend(options){
    var callback;
    return (function(){
        var xhr = new XMLHttpRequest();
        var id = ++xhrId;
        xhr.open(options.method,options.url);
        xhr.send(options.data);
        callback = function(){
            if(xhr.readyState == 4){
                delete xhrCallbacks[id];
                xhrCallbackCount--;
                xhr.onreadystatechange = function(){};
                if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304){
                    options.success && options.success(xhr.responseText);
                }else{
                    options.error && options.error(xhr.responseText);
                }
                if(xhrCallbackCount == 0){
                    options.done && options.done();
                }
            }
        }
        xhrCallbackCount++;
        xhr.onreadystatechange = xhrCallbacks[id] = callback;
    })();
}