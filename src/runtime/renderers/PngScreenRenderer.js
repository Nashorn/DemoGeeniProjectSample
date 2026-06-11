import * as runtime from "runtime";

export default class PngScreenRenderer extends runtime.BaseRenderer {
  render(sheet, snapshot, destRect) {
    const r = this.cssRect(snapshot, destRect);
    // const src = new URL(snapshot.imgPath, window.location.origin).href;
    // const src = snapshot.imgPath;
    var src = this.resolveImagePath(snapshot);

    const img = document.createElement('img');
    Object.assign(img, { alt:'', decoding:'async', loading:'eager', src });
    Object.assign(img.style, {
      position:'absolute', left:r.x+'px', top:r.y+'px',
      width:r.width+'px', height:r.height+'px', pointerEvents:'none'
    });
    sheet.appendChild(img);
    sheet.classList.add('snapshot-container');
    sheet.dataset.snapShotType = 'screen';
    sheet.style.zIndex = snapshot.z || this.rs._getNextZIndexForGroup(sheet.group) || 0;
    // overlay ui defines the coordinate system;
    sheet.style.width  = r.width + 'px';
    sheet.style.height = r.height + 'px';
    var overlayUI = this.rs._ensureLayer('overlay-ui');
    const applyAuthoringMode = enabled => {
      if (enabled) {
        overlayUI.style.width = r.width + 'px';
        overlayUI.style.height = r.height + 'px';
        overlayUI.style.transformOrigin = 'top left';
        overlayUI.style.transform = 'none';
        overlayUI.style.willChange = 'auto';
        document.documentElement.style.overflow = 'auto';
        return;
      }
      this.rs.scaleStageToViewport(overlayUI, r.width, r.height);
    };

    window.idehost?.onAuthoringModeChanged?.(applyAuthoringMode);
    applyAuthoringMode(window.idehost?.isAuthoringMode?.() === true);

    return { container: sheet, rect: r, img };
  }

  resolveImagePath(snapshot) {
    // const htmlPath = location.href;
    // const relativePath = snapshot.imgPath;
    // debugger

    // // 1. Get the directory of the HTML file
    // const baseDir = htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1);

    // // 2. Extract only the trailing part of your relative path
    // // This finds the last folder name and everything after it
    // const parts = relativePath.split('/');
    // const fileName = parts.slice(-2).join('/'); // Result: "index2_files/screenshot.png"

    // // 3. Resolve them
    // const fullPath = new URL(fileName, baseDir).href;
    // return fullPath;

    return new URL(snapshot.imgPath, window.location.href).href;
  }
}
