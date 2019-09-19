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
    console.log(hass)
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
      
      .content-panel .content-text,
      .content-panel .content-audio{padding:10px;border-radius:5px;margin-bottom:8px;
        border: 1px solid #eee;
        display: inline-block;
        max-width: 80%;
        word-break: break-all;
        background:white;
        box-shadow: 1px 1px 2px silver;}

      .input-panel{
        display:flex;
        width:100%;
        height:40px;
        border-top: 1px solid #eee;
      }      
      .input-panel iron-icon{width:30px;height:30px;display:inline-block;padding: 5px 8px 0 8px;}
      .input-panel input{width:100%;background:white;border:none;text-indent:1em;outline:none;height: 40px;line-height: 40px;}
      .input-panel input[type='text']{display:none;}
      .input-panel input[type='button']:active{background:#eee;}
    `
    // 内容面板
    this._createdContentPanel(cardContainer)
    // 输入面板
    this._createdInputPanel(cardContainer)

    this.shadowRoot.appendChild(cardContainer)
    this.shadowRoot.appendChild(cardContainerStyle)
  }

  // 创建内容面板
  _createdContentPanel(cardContainer) {
    let div = document.createElement('div')
    div.classList.add('content-panel')
    cardContainer.appendChild(div)
  }

  // 创建输入面板
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
    ele_icons[1].addEventListener('click', function () {
      console.log('设置面板')
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
    ele_button.addEventListener('mousedown', function (event) {
      console.log('开始监听语音输入')
      ele_button.value = '松开 结束'
      isPress = true

      recorder = Recorder({ type: "mp3", sampleRate: 16000 });
      recorder.open(function () {//打开麦克风授权获得相关资源
        //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
        recorder.start();//开始录音
      }, function (msg, isUserNotAllow) {//用户拒绝未授权或不支持
        //dialog&&dialog.Cancel(); 如果开启了弹框，此处需要取消
        console.log((isUserNotAllow ? "UserNotAllow，" : "") + "无法录音:" + msg);
      });
    })
    ele_button.addEventListener('mouseup', function (event) {
      isPress = false
      ele_button.value = '按住 说话'
      event.stopPropagation()
      _this._stopRecording.bind(_this)(recorder, 1)
    })
    document.addEventListener('mouseup', function (event) {
      if (isPress) {
        isPress = false
        ele_button.value = '按住 说话'
        _this._stopRecording.bind(_this)(recorder, 0)
      }
    })

    this.card = cardContainer
  }

  // 停止录音
  _stopRecording(recorder, flags) {
    recorder.stop((blob, duration) => {//到达指定条件停止录音
      console.log((window.URL || webkitURL).createObjectURL(blob), "时长:" + duration + "ms");
      recorder.close();//释放录音资源
      if (duration > 3000) {
        //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
        this._inputAudio(blob)
      } else {
        this._inputText('提示：当前录音时间没有3秒')
      }
    }, function (msg) {
      console.log("录音失败:" + msg);
    });
  }

  // 发送语音
  _inputAudio(blob) {
    let div = document.createElement("div");
    div.classList.add('content-audio')
    let audio = document.createElement("audio");
    audio.controls = true;
    div.appendChild(audio);
    audio.src = (window.URL || webkitURL).createObjectURL(blob);
    // audio.play();
    this._buildContent(div)
  }

  // 输入文字
  _inputText(value) {
    let div = document.createElement("div");
    div.classList.add('content-text')
    div.textContent = value
    console.log('https://api.jiluxinqing.com/api/service/tts?text=' + value)
    this._buildContent(div)
  }

  // 添加到聊天列表中
  _buildContent(child){
    let div = document.createElement("div");
    div.classList.add('content-item')
    div.appendChild(child)
    let contentPanel = this.card.querySelector('.content-panel')
    contentPanel.insertBefore(div, contentPanel.childNodes[0]);
    contentPanel.childNodes[0].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('voice-speak', VoiceSpeak);