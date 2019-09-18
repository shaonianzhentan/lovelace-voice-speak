class VoiceSpeak extends HTMLElement {

  constructor() {
    super()

    let script = document.createElement('script')
    script.src = './dist/recorder.mp3.min.js'
    document.body.appendChild(script)
    this.attachShadow({ mode: 'open' })
  }

  set hass(hass) {

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
        background:#eee;
        height:500px;
        display: flex;
        flex-direction: column;
        padding:8px;
      }
      iron-icon{width:30px;height:30px;display:inline-block;background:red;}
      .content-panel{
        width: 100%;
        flex: 1;
        overflow: auto;        
      }      
      
      .content-panel .content-text,
      .content-panel .content-audio{padding:10px;background:white;border-radius:5px;margin-bottom:8px;}

      .input-panel{
        display:flex;
        width:100%;
        height:30px;
      }
      .input-panel input{width:100%;background:white;border:none;text-indent:1em;outline:none;}
      .input-panel input[type='text']{display:none;}
      .input-panel input[type='button']:active{background:silver;color:white;}
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
      <iron-icon icon="mdi:power">
      </iron-icon><input type="text" placeholder="请输入要说的文字" maxlength="100" />
      <input type="button" value="按住 说话" />
    `
    cardContainer.appendChild(div)
    let _this = this
    let ele_icon = div.querySelector('iron-icon')
    let ele_text = div.querySelector("input[type='text']")
    let ele_button = div.querySelector("input[type='button']")
    // 输入模式切换
    ele_icon.addEventListener('click', function () {
      let icon = this.getAttribute('icon')
      let iconVoice = 'mdi:power'
      let isVoice = iconVoice === icon
      this.setAttribute('icon', isVoice ? 'mdi:text' : iconVoice)
      ele_text.style.display = isVoice ? 'block' : 'none'
      ele_button.style.display = !isVoice ? 'block' : 'none'
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
      //已经拿到blob文件对象想干嘛就干嘛：立即播放、上传
      this._inputAudio(blob)

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
    audio.play();
    this.card.querySelector('.content-panel').appendChild(div);
  }

  // 输入文字
  _inputText(value) {
    let div = document.createElement("div");
    div.classList.add('content-text')
    div.textContent = value    
    div.ondblclick = () => {
      if (confirm('确定重发')) {
        this._inputText(value)
      }
    }
    this.card.querySelector('.content-panel').appendChild(div);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('voice-speak', VoiceSpeak);