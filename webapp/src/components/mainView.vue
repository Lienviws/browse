<template>
  <div>
    <div id="options" style="border-bottom:1px solid black;margin-bottom:5px;padding-bottom:5px;">
        <input type="button" @click="forwardFolder" value="forward">
        <input type="button" @click="download" value="download">
        <input type="button" @click="upload" value="upload">
        <input type="button" @click="pushText" value="pushText">
        <form target="iframe" action="/uploadFile" style="display:none;" method="post" id="form1" enctype="multipart/form-data">
          <input ref="fileInput" name="file" type="file" multiple="true" @change="uploadFile">
          <input name="dir" type="text" :value="dir">
        </form>
        <span>serviceIP: {{sIP}};currentPath:
          <span v-show="!pathEditable" @click="changeDir">{{dir}}</span>
          <input ref="pathInput" v-show="pathEditable" v-model="inputDir" style="width:400px" />
          <input type="button" v-show="pathEditable" @click="confirmDir" value="confirm" />
          <input type="button" v-show="pathEditable" @click="cancelPathInput" value="cancel" />
          <span class="tips" v-show="tipVisible">{{tipText}}</span>
        </span>
      </div>
      <div id="data">
        <table style="width:100%">
          <thead>
            <tr>
              <td style="width:40px"><input type="button" @click="toggleAll()" value="[x]"></td>
              <td @click="orderBy('name')">Name</td>
              <td @click="orderBy('size')">Size</td>
              <td @click="orderBy('birthtime')">CreateTime</td>
              <td @click="orderBy('ctime')">ModifyTime</td>
            </tr>
          </thead>
          <tbody :path="dir">
            <tr :index="index" v-for="(file, index) in files" :key="index">
              <td><input v-model="file.check" type="checkbox"></td>
              <td @click="enterFolder">
                <a href="javascript:void(0)" v-if="file.isDirectory"><img class="folder" :src="imgSrc.folder" width="16" height="16"></a>
                <img v-if="file.isFile" :src="imgSrc.normal" width="16" height="16">
                <a v-bind:class="{'folder':file.isDirectory,'file':file.isFile}" href="javascript:void(0)"><span>{{file.name}}</span></a>
              </td>
              <td>{{file.size}}</td>
              <td>{{file.birthtime}}</td>
              <td>{{file.mtime}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Dialog :visible.sync="modelVisible" @confirm="sendMessage">
        <span class="title">set content</span>
        <textarea rows="5" cols="55" v-model="modelInput" @keydown="onTextareaKeydown"></textarea>
        <span class="messageHit" v-show="hitVisible">{{hitText}}</span>
      </Dialog>
  </div>
</template>

<script>
import normal from '@/../static/images/normal.png'
import normalFolder from '@/../static/images/normal_folder.png'
import Dialog from './dialog'
import io from 'socket.io-client'

const socket = io(location.host)

export default {
  components: {
    Dialog
  },
  data () {
    return {
      xhrId: 0,
      xhrCallbacks: {},
      xhrCallbackCount: 0,
      files: [],
      dir: '',
      inputDir: '',
      tipText: '',
      imgSrc: {
        folder: normalFolder,
        file: normal
      },
      pathEditable: false,
      modelVisible: false,
      hitVisible: false,
      tipVisible: false,
      hitText: '',
      modelInput: '',
      sIP: '' // 服务器ip
    }
  },
  methods: {
    initSocket () {
      socket.on('connect', () => {
        console.log('conneted socket')
      })
      socket.on('disconnect', () => {
        console.log('disconneted socket')
      })
      socket.on('message res', (res) => {
        this.hitVisible = true
        this.hitText = res
      })
    },
    uploadFile (e) {
      this.showTip('上传中...')
      let files = e.target.files
      if (files.length === 0) return
      let rootDir = this.dir
      if (files) {
        for (const key in files) {
          if (parseInt(key, 10) >= 0) {
            let formData = new FormData()
            formData.append('file', files[key])
            formData.append('dir', rootDir)
            let test = fetch('/uploadFile', {
              method: 'POST',
              credentials: 'include',
              body: formData
            }).then(res => res.json())
              .then(data => {
                if (data.code === 's_ok') {
                  console.log('succ')
                  this.refresh()
                } else {
                  if (data.summary && data.summary.errno === -4058) {
                    alert('文件名名称不支持！')
                  } else if (data.summary && data.summary.errno) {
                    alert('err: ' + data.summary.errno)
                  } else {
                    alert('err')
                  }
                }
                this.hideTip()
                e.target.value = ''
              })
            console.log(test)
          }
        }
      } else {
        // ie
        let form = document.getElementById('form1')
        let iframe = document.getElementById('iframe')
        if (!iframe) {
          iframe = document.createElement('iframe')
        }
        form.action = '/uploadFile'
        form.target = 'iframe'
        iframe.name = 'iframe'
        iframe.src = ''
        iframe.style.display = 'none'
        iframe.onload = () => {
          let result = iframe.contentWindow.document.body.innerText
          if (!result) {
            return
          }
          result = JSON.parse(result)
          if (result.code === 's_ok') {
            console.log('succ')
            this.hideTip()
          } else {
            alert('failed!-2')
          }
        }

        document.getElementById('options').appendChild(iframe)
        form.submit()
      }
    },
    onTextareaKeydown () {
      this.hitVisible = false
    },
    /**
     * 打开文件夹
     */
    enterFolder (event) {
      let tdContent = this.findParentUntil(event.target, 'td')
      if (!tdContent) {
        return false
      }
      let folderName = tdContent.getElementsByTagName('span')[0].innerText
      let rootDir = this.dir
      this.getFolder(rootDir, folderName)
    },
    /**
     * 按照关键字排序
     */
    orderBy (order) {
      let rootDir = this.dir
      this.getFolder(rootDir, '', order)
    },
    /**
     * 切换全选
     */
    toggleAll () {
      let count = 0
      this.files.forEach(file => {
        if (file.check) {
          count++
        }
      })
      if (count > 0) {
        this.files.map(file => {
          file.check = false
        })
      } else {
        this.files.map(file => {
          file.check = true
        })
      }
    },
    /**
     * 前一个文件夹
     */
    forwardFolder () {
      let rootDir = this.$data.dir
      this.getFolder(rootDir, '..')
    },
    sendMessage () {
      socket.emit('message', this.modelInput)
    },
    /**
     * 通过ajax得到文件夹数据
     */
    getFolder (dir, folderName, order) {
      fetch('/loadFile', {
        method: 'POST',
        credentials: 'include',
        headers: new Headers({
          'Content-Type': 'application/json' // 指定提交方式为表单提交
        }),
        body: JSON.stringify({
          dir,
          folderName,
          order
        })
      }).then(res => res.json())
        .then(data => {
          if (data.code !== 's_ok') {
            alert(data.summary.code)
            return false
          }
          this.dir = data.path
          this.inputDir = this.dir
          this.sIP = data.sysInfo.ipv4[0]
          this.files = []
          data['var'].map(file => {
            file.check = false
            this.files.push(file)
          })
        })
    },
    existFile (filePath, cb) {
      fetch('/existFile', {
        method: 'POST',
        credentials: 'include',
        headers: new Headers({
          'Content-Type': 'application/json' // 指定提交方式为表单提交
        }),
        body: JSON.stringify({
          filePath
        })
      }).then(res => res.json())
        .then(data => {
          if (data.code === 's_ok') {
            cb && cb(data.res)
          } else {
            alert(data.summary.code)
          }
        })
    },
    changeDir () {
      this.pathEditable = true
      setTimeout(() => {
        this.$refs.pathInput.focus()
      }, 0)
    },
    cancelPathInput () {
      this.pathEditable = false
      this.inputDir = this.dir
    },
    confirmDir () {
      this.existFile(this.inputDir, (exist) => {
        if (exist) {
          this.pathEditable = false
          this.getFolder(this.inputDir, '')
        } else {
          alert('wrong filePath')
        }
      })
    },
    /**
     * 下载文件
     */
    download () {
      let downloadFileArray = []
      this.files.forEach((file, index) => {
        if (file.check) {
          downloadFileArray.push({ name: file.name, type: file.type })
        }
      })
      if (!downloadFileArray.length) {
        return false
      }
      let rootDir = this.dir

      fetch('/download', {
        method: 'POST',
        credentials: 'include',
        headers: new Headers({
          'Content-Type': 'application/json' // 指定提交方式为表单提交
        }),
        body: JSON.stringify({
          dir: rootDir,
          fileArray: downloadFileArray
        })
      }).then(res => res.json())
        .then(data => {
          if (data.code === 's_ok') {
            this.downloadByIframe(data.url)
          } else {
            alert(data.summary)
          }
        })
    },
    // 上传文件的按钮
    upload () {
      this.$refs.fileInput.click()
    },
    pushText () {
      this.modelVisible = true
    },
    refresh () {
      let rootDir = this.dir
      this.getFolder(rootDir, '')
    },
    /**
     * 遍历寻找父节点
     * @params target 当前节点
     * @params nodeName 父节点名称
     */
    findParentUntil (target, nodeName) {
      if (!target || !target.nodeType) {
        return false
      }
      nodeName = nodeName.toLowerCase()
      var rootNodeName = '#document'
      var tmpNode = target
      while (true) {
        if (tmpNode.nodeName.toLowerCase() === rootNodeName) {
          return false
        }
        tmpNode = tmpNode.parentNode
        if (tmpNode.nodeName.toLowerCase() === nodeName) {
          break
        }
      }
      return tmpNode
    },
    /**
     * 用iframe下载
     * @params url 下载地址
     */
    downloadByIframe (url) {
      var iframe = document.getElementById('myIframe')
      if (iframe) {
        iframe.src = url
      } else {
        iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = url
        iframe.id = 'myIframe'
        document.body.appendChild(iframe)
      }
    },
    showTip (text, time) {
      this.tipText = text
      this.tipVisible = true
      if (time) {
        setTimeout(() => {
          this.hideTip()
        }, time)
      }
    },
    hideTip () {
      this.tipVisible = false
    }
  },
  mounted () {
    this.getFolder()
    this.initSocket()
  }
}
</script>

<style>

</style>
