<template>
  <div>
    <div id="options" style="border-bottom:1px solid black;margin-bottom:5px;padding-bottom:5px;">
        <input type="button" @click="refresh" value="fresh">
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
              <td @click="orderBy('ctime')">ModifyTime</td>
              <td @click="orderBy('birthtime')">CreateTime</td>
            </tr>
          </thead>
          <tbody :path="dir">
            <tr :index="index" v-for="(file, index) in files" :key="index">
              <td><input v-model="file.check" type="checkbox"></td>
              <td @click="enterFolder">
                <a href="javascript:void(0)" v-if="file.isDirectory"><img class="folder" :src="imgSrc.folder" width="16" height="16"></a>
                <img v-else :src="imgSrc.file" width="16" height="16">
                <span class="new" v-if="file.new"></span>
                <a :class="{'folder':file.isDirectory,'file':file.isFile}" href="javascript:void(0)"><span>{{file.name}}</span></a>
              </td>
              <td>{{file.size}}</td>
              <td>{{file.modifyTime}}</td>
              <td>{{file.createTime}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Dialog :visible.sync="modelVisible" @confirm="sendMessage" @boardcast="boardcastMessage">
        <span class="title">set content</span>
        <textarea rows="5" cols="55" v-model="modelInput" @keydown="onTextareaKeydown"></textarea>
        <span class="messageHit" v-show="hitVisible">{{hitText}}</span>
      </Dialog>
      <Confirm :visible.sync="confirmVisible" :height="300">
        <span class="title">broadcast</span>
        <textarea rows="15" cols="55" v-model="broadcastInput"></textarea>
      </Confirm>
  </div>
</template>

<script>
import fileImg from '@/../static/images/file.png'
import folderImg from '@/../static/images/folder.png'
import newImg from '@/../static/images/new.png'
import Dialog from './dialog'
import Confirm from './confirm'
import { formatDate } from '@/utils'
import io from 'socket.io-client'
import Cookies from 'js-cookie'

const socket = io(location.host)

export default {
  components: {
    Dialog,
    Confirm
  },
  data () {
    return {
      clientId: new Date().getTime(),
      files: [],
      dir: '',
      inputDir: '',
      tipText: '',
      hitText: '',
      modelInput: '',
      broadcastInput: '',
      sIP: '', // 服务器ip
      imgSrc: {
        folder: folderImg,
        file: fileImg,
        new: newImg
      },
      pathEditable: false,
      modelVisible: false,
      confirmVisible: false,
      hitVisible: false,
      tipVisible: false,
      uploading: false
    }
  },
  methods: {
    initSocket () {
      const clientId = this.clientId
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
      socket.on('broadcast res', (res) => {
        const msg = res.msg
        switch (res.for) {
          case 'others':
            if (msg.id === clientId) return
            this.broadcastInput = msg.text
            this.confirmVisible = true
            break
          case 'sender':
            this.hitVisible = true
            this.hitText = msg
            break
          default:
            break
        }
      })
    },
    uploadFile (e) {
      this.showTip('uploading...')
      let files = e.target.files

      if (files.length === 0) return
      let rootDir = this.dir
      if (files) {
        const formData = new FormData()
        formData.append('file', files[0])
        formData.append('dir', rootDir)

        var xhr = new XMLHttpRequest()
        /* 事件监听 */
        xhr.upload.addEventListener('progress', (event) => {
          if (!event.total) return
          const percent = Math.round((event.loaded / event.total) * 100)
          this.showTip(`${files[0].name}: ${percent}%`)
        }, false)
        xhr.addEventListener('load', (e) => {
        }, false)
        xhr.addEventListener('error', () => {
        }, false)
        xhr.addEventListener('abort', () => {
        }, false)
        /* 下面的url一定要改成你要发送文件的服务器url */
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4 && xhr.status === 200) {
            this.uploading = false
            try {
              const data = JSON.parse(xhr.responseText)
              if (data.code === 's_ok') {
                console.log('succ')
                this.refresh()
              } else {
                if (data.err && data.err.errno === -4058) {
                  alert('folder name unsupported！')
                } else if (data.err && data.err.errno) {
                  alert('err: ' + data.err.errno)
                } else {
                  alert('err')
                }
              }
              e.target.value = ''
            } catch (error) {
              console.log(error)
            }
            this.hideTip()
          } else if (xhr.status === 403) {
            this.uploading = false
            this.gotoLogin()
            console.log('identity error，relogin')
          }
        }
        xhr.open('POST', '/uploadFile')
        xhr.send(formData)

        this.uploading = true
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
          this.uploading = false
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
        this.uploading = true
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
    boardcastMessage () {
      socket.emit('broadcast', {
        id: this.clientId,
        text: this.modelInput
      })
    },
    addFileTag (file) {
      file.check = false
      file.createTime = formatDate(file.ctime, 'yyyy-MM-dd hh:mm:ss')
      file.modifyTime = formatDate(file.mtime, 'yyyy-MM-dd hh:mm:ss')
      addNew(file)
      function addNew (file) {
        if (Date.now() - file.mtime < 1000 * 5) { // 5秒内标记new
          file.new = true
        }
      }
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
      }).then(res => {
        if (res.status === 403) {
          this.gotoLogin()
          throw new Error('identity error，relogin')
        }
        return res.json()
      }).then(data => {
        if (data.code !== 's_ok') {
          if (data.summary) {
            alert(data.summary)
          } else {
            alert(data.err.code)
          }
          return false
        } else if (data.type === 'html') {
          window.open('/preview?filename=' + data['var'].fileName)
          return
        }
        this.dir = data.path
        Cookies.set('dir', this.dir)
        this.inputDir = this.dir
        this.sIP = data.sysInfo.ipv4[0]
        this.files = []
        data['var'].map(file => {
          this.addFileTag(file)
          this.files.push(file)
        })
      }).catch((e) => console.log(e.message))
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
      }).then(res => {
        if (res.status === 403) {
          this.gotoLogin()
          throw new Error('identity error，relogin')
        }
        return res.json()
      }).then(data => {
        if (data.code === 's_ok') {
          cb && cb(data.res)
        } else {
          alert(data.err.code)
        }
      }).catch((e) => console.log(e.message))
    },
    changeDir () {
      this.pathEditable = true
      this.$nextTick(() => {
        this.$refs.pathInput.focus()
        this.$refs.pathInput.addEventListener('keypress', (e) => {
          if (e.keyCode === 13) {
            this.confirmDir()
          }
        })
      })
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
      }).then(res => {
        if (res.status === 403) {
          this.gotoLogin()
          throw new Error('identity error，relogin')
        }
        return res.json()
      }).then(data => {
        if (data.code === 's_ok') {
          this.downloadByIframe(data.url)
        } else {
          alert(data.err)
        }
      }).catch((e) => console.log(e.message))
    },
    // 上传文件的按钮
    upload () {
      if (this.uploading) {
        alert('has uploading file')
        return
      }
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
    },
    gotoLogin () {
      this.$router.push({
        path: 'login'
      })
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
