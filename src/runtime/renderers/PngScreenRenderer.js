import * as runtime from "runtime";

export default class PngScreenRenderer extends runtime.BaseRenderer {
  render(sheet, snapshot, destRect) {
    const r = this.cssRect(snapshot, destRect);
    // const src = new URL(snapshot.imgPath, window.location.origin).href;
    const src = snapshot.imgPath;

    const img = document.createElement('img');
    Object.assign(img, { alt:'', decoding:'async', loading:'eager', src });
    Object.assign(img.style, {
      position:'absolute', left:r.x+'px', top:r.y+'px',
      width:r.width+'px', height:r.height+'px', pointerEvents:'none'
    });
    sheet.appendChild(img);
    sheet.dataset.snapShotType = 'screen';
    sheet.style.zIndex = snapshot.z || this.rs._getNextZIndexForGroup(sheet.group) || 0;
    // overlay ui defines the coordinate system;
    sheet.style.width  = r.width + 'px';
    sheet.style.height = r.height + 'px';
    var overlayUI = this.rs._ensureLayer('overlay-ui');
    this.rs.scaleStageToViewport(overlayUI, r.width, r.height);

    return { container: sheet, rect: r, img };
  }
}