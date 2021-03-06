class VoiceSpeak extends HTMLElement {

  constructor() {
    super()

    let script = document.createElement('script')
    // 如果在hass下，则使用hacs的路径
    if (location.pathname.indexOf('/lovelace') === 0) {
      script.src = '/community_plugin/lovelace-voice-speak/recorder.mp3.min.js'
    } else {
      script.src = './dist/recorder.mp3.min.js'
    }
    document.body.appendChild(script)
    this.attachShadow({ mode: 'open' })
  }

  set hass(hass) {
    // 这里更新数据
    this._hass = hass
  }

  setConfig(config) {
    this.config = config;
    let cardContainer = document.createElement('ha-card')
    let cardContainerStyle = document.createElement('style')
    cardContainerStyle.textContent = `
    ::-webkit-scrollbar{
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-thumb{
      background-color: #e5e5e5;
      border-radius: 10px;
      box-shadow: inset 1px 1px 0 rgba(0,0,0,.1);
    }
      ha-card {
        height:500px;
        display: flex;
        flex-direction: column;
      }
      .content-panel{
        width: 100%;
        flex: 1;
        box-sizing: border-box;
        overflow: auto;
        padding:8px;
      }      
      .content-panel .content-item-icon{
        width: 30px;
        height: 30px;
        float: left;
        border: 1px solid var(--primary-color);
        border-radius: 50%;
        margin-right: 8px;
        overflow: hidden;
        text-align: center;
        cursor:pointer;
      }
      .content-panel .content-item-icon iron-icon{margin-top: 2px;}
      .content-panel .content-text,
      .content-panel .content-audio{padding:10px;border-radius:5px;margin-bottom:8px;
        display: inline-block;
        max-width: 80%;
        word-break: break-all;
        background-color: var(--primary-color);
        color:white;}

      .input-panel{
        display:flex;
        width:100%;
        height:40px;
        border-top: 1px solid #eee;
      }      
      .input-panel iron-icon{width:30px;height:30px;display:inline-block;padding: 5px 8px 0 8px;cursor:pointer;}
      .input-panel input{width:100%;background:white;border:none;text-indent:1em;outline:none;height: 38px;line-height: 38px;}
      .input-panel input[type='text']{display:none;}
      .input-panel input[type='button']:active{background:#eee;}
      // 弹窗
      .dialog-setting{
        display:block;
      }
      .dialog-setting.is-show{
        width: 100%;
        height: 500px;        
        position: relative;
        float: left;
        text-align:center;        
        box-sizing: border-box;
        padding: 10px;
        box-shadow: 0 0 3px silver;
        background: var(--primary-background-color);}
      .dialog-setting.is-hide{display:none;}
      
      .select-media{padding:10px;
        border: 1px solid var(--primary-color);
      }
      .close-dialog{
        padding: 10px;width: 100px;
        background: var(--primary-color);
        border: none;
        color: var(--primary-background-color);}
    `
    // 内容面板
    this._createdContentPanel(cardContainer)
    // 输入面板
    this._createdInputPanel(cardContainer)

    this.shadowRoot.appendChild(cardContainer)
    this.shadowRoot.appendChild(cardContainerStyle)
  }

  // ***************************************** 创建内容面板
  _createdContentPanel(cardContainer) {
    let div = document.createElement('div')
    div.classList.add('content-panel')
    cardContainer.appendChild(div)
  }

  // ***************************************** 创建输入面板
  _createdInputPanel(cardContainer) {
    let div = document.createElement('div')
    div.classList.add('input-panel')
    div.innerHTML = `
      <iron-icon icon="mdi:microphone"></iron-icon>
      <input type="text" placeholder="请输入要说的文字" maxlength="100" />
      <input type="button" value="按住 说话" />
      <iron-icon icon="mdi:settings"></iron-icon>
    `
    cardContainer.appendChild(div)
    let _this = this
    let ele_icons = div.querySelectorAll('iron-icon')
    let ele_text = div.querySelector("input[type='text']")
    let ele_button = div.querySelector("input[type='button']")
    // 输入模式切换
    ele_icons[0].addEventListener('click', function () {
      let icon = this.getAttribute('icon')
      let iconVoice = 'mdi:microphone'
      let isVoice = iconVoice === icon
      this.setAttribute('icon', isVoice ? 'mdi:text' : iconVoice)
      ele_text.style.display = isVoice ? 'block' : 'none'
      ele_button.style.display = !isVoice ? 'block' : 'none'
    })
    // 设置弹窗
    ele_icons[1].addEventListener('click', () => {
      this._createdSettingPanel()
    })
    // 处理文字输入
    ele_text.addEventListener('keypress', function (event) {
      if (event.keyCode === 13) {
        let val = this.value.trim()
        if (val) _this._inputText.bind(_this)(val);
        this.value = ''
      }
    })
    // 处理语音输入    
    let recorder = null
    let isPress = false
    let isMobile = /Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent)
    // 按下事件
    let mousedownFunc = function (event) {
      console.log('开始监听语音输入')
      ele_button.value = '松开 结束'
      isPress = true

      recorder = Recorder({ type: "mp3", sampleRate: 16000 });
      recorder.open(function () {//打开麦克风授权获得相关资源
        //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
        recorder.start();//开始录音
      }, function (msg, isUserNotAllow) {//用户拒绝未授权或不支持
        console.log((isUserNotAllow ? "UserNotAllow，" : "") + "无法录音:" + msg);
        // 如果没有权限，则显示提示
        if (isUserNotAllow) {
          alert('无法录音：' + msg)
        }
      });
    }
    // 放开事件
    let mouseupFunc = function (event) {
      isPress = false
      ele_button.value = '按住 说话'
      event.stopPropagation()
      event.stopImmediatePropagation()
      event.preventDefault()
      _this._stopRecording.bind(_this)(recorder, 1)
    }
    // 判断是否为移动端
    if (isMobile) {
      ele_button.addEventListener('touchstart', mousedownFunc)
      ele_button.addEventListener('touchend', mouseupFunc)
    } else {
      ele_button.addEventListener('mousedown', mousedownFunc)
      ele_button.addEventListener('mouseup', mouseupFunc)
      document.addEventListener('mouseup', function (event) {
        if (isPress) {
          isPress = false
          ele_button.value = '按住 说话'
          _this._stopRecording.bind(_this)(recorder, 0)
        }
      })
    }
    this.card = cardContainer
  }

  // 停止录音
  _stopRecording(recorder, flags) {
    recorder.stop((blob, duration) => {//到达指定条件停止录音
      console.log((window.URL || webkitURL).createObjectURL(blob), "时长:" + duration + "ms");
      recorder.close();//释放录音资源
      if (duration > 2000) {
        //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
        this._inputAudio(blob)
      } else {
        this._inputText('提示：当前录音时间没有2秒', -1)
      }
    }, function (msg) {
      console.log("录音失败:" + msg);
    });
  }

  // 发送语音
  _inputAudio(blob) {

    let formData = new FormData()
    formData.append('mp3', blob)
    fetch(`https://api.jiluxinqing.com/api/service/tts`, {
      method: 'post',
      body: formData
    }).then(res => res.json()).then(res => {
      if (res.code == 0) {
        let mp3 = res.data

        let div = document.createElement("div");
        div.classList.add('content-audio')
        let audio = document.createElement("audio");
        audio.controls = true;
        div.appendChild(audio);
        audio.src = (window.URL || webkitURL).createObjectURL(blob);
        // audio.play();
        div.dataset['url'] = mp3
        this._buildContent(div)

        this._play(mp3)
      }
    })

  }

  // 输入文字
  _inputText(value, type) {
    let url = 'https://api.jiluxinqing.com/api/service/tts?text=' + encodeURIComponent(value)
    let div = document.createElement("div");
    div.classList.add('content-text')
    div.textContent = value
    div.dataset['type'] = type
    div.dataset['url'] = url
    this._buildContent(div)

    if (type != -1) {
      this._play(url)
    }
  }

  // 添加到聊天列表中
  _buildContent(child) {
    // 生成节点
    let div = document.createElement("div");
    div.classList.add('content-item')

    // 添加重试
    if (child.dataset['type'] != -1) {
      let op = document.createElement('div')
      op.classList.add('content-item-icon')
      op.innerHTML = `
      <iron-icon icon="mdi:refresh"></iron-icon>
      `
      op.onclick = () => {
        let url = child.dataset['url']
        if (url) this._play(url)
      }
      div.appendChild(op)
    }

    div.appendChild(child)

    let contentPanel = this.card.querySelector('.content-panel')
    contentPanel.insertBefore(div, contentPanel.childNodes[0]);
    contentPanel.childNodes[0].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }

  // ***************************************** 设置面板
  _createdSettingPanel() {
    if (this.dialog == null) {
      let dialog = document.createElement('div')
      dialog.classList.add('dialog-setting')

      let arr = []
      this._getMediaPlayerList().forEach(ele => {
        arr.push(`<option>${ele}</option>`)
      })
      dialog.innerHTML = `
        <br/><br/>
        更新日期：2019-9-20
        <br/><br/>
        选择播放器：<select class='select-media'>${arr.join('')}</select>
        <br/><br/>
        <button class="close-dialog">关闭设置</button>
      `
      this.shadowRoot.insertBefore(dialog, this.shadowRoot.childNodes[0])
      this.dialog = dialog
      this.dialog.classList.add('is-show')
      let _this = this
      dialog.querySelector('.select-media').onchange = function () {
        _this._selectPlayer = this.value
      }
      // 关闭弹窗
      dialog.querySelector('.close-dialog').onclick = () => {
        this.dialog.classList.add('is-hide')
      }

    } else {
      if (this.dialog.classList.contains('is-hide')) {
        this.dialog.classList.remove('is-hide')
      } else {
        this.dialog.classList.add('is-hide')
      }
    }
  }

  _getMediaPlayerList() {
    if (this._hass) return Object.keys(this._hass.states).filter(ele => ele.includes('media_player.'))
    return []
  }

  // 调用服务
  _play(url) {
    if (this._selectPlayer == null) {
      let arr = this._getMediaPlayerList()
      if (arr.length > 0) this._selectPlayer = arr[0]
    }

    if (this._selectPlayer) {
      this._hass.callService('media_player', 'play_media', {
        entity_id: this._selectPlayer,
        media_content_id: url,
        media_content_type: 'music'
      });
    } else {
      alert("你的HomeAssistant里没有配置媒体播放器")
    }
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('voice-speak', VoiceSpeak);