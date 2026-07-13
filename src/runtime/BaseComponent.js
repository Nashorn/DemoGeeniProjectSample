export default namespace `runtime` 
(
  class BaseComponent extends Component {
    static csstext = true;

    hasOwnSkin() {
      return this.classname && this.classname !== "BaseComponent";
    }

    // Document-level stylesheet adoption now lives in IHtmlComponent
    // (shouldAdoptDocumentStyleSheets() / adoptDocumentStyleSheets()).

    inShadow() { return true; }

    css() {
      return `
          :host([data-highlight-state='true']) pulse-effect {
            opacity: 0 !important;
          }
          :host {
            .demo-highlight[data-highlight-state] {
              transition: all .3s ease;
              border-radius: 5px;

              &[data-highlight-state='true'] {
                background: #79ff83 !important;
                color: #4c4c4c !important;
              
                /* possible pulse-effect selector combinations */
                :is(&) pulse-effect,
                > pulse-effect,
                & pulse-effect,
                & + pulse-effect,
                ~ pulse-effect {
                  opacity: 0 !important;
                }
              }
            }
          }
          `
    }
  }
);

globalThis.BaseComponent = runtime.BaseComponent;