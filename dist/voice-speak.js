class VoiceSpeak extends HTMLElement {

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set hass(hass) {
 
  }

  setConfig(config) {    
    this.config = config;
    let cardContainer = document.createElement('ha-card')
    let cardContainerStyle = document.createElement('style')
    // cardContainerStyle.textContent = `
    //   ha-card {
    //     padding: calc(${config.padding} / 2);
    //     display: flex;
    //     justify-content: space-around;
    //     flex-wrap: wrap;
    //     ${cardStyle}
    //   }
    // `

    this.shadowRoot.appendChild(cardContainer)
    this.shadowRoot.appendChild(cardContainerStyle)
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('voice-speak', VoiceSpeak);