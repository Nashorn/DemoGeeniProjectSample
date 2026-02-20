export default class HelloWorldAction {
  static meta = {
    id: "HelloWorldAction",
    label: "Hello World",
    fields: [
      { kind:"text", name:"greeting", label:"Greeting Message", placeholder:"Enter your greeting" }
    ],
    persist: ["greeting"],
    validate: v => ({}) // always OK
  };

  constructor(cfg={}) { Object.assign(this, cfg); }

  async run(controller, vars, trigger) {
    const RS = controller.renderService;

    const msg = this.greeting || "Hello, World!";
    alert(msg);
  }
}

globalThis.HelloWorldAction = HelloWorldAction;
