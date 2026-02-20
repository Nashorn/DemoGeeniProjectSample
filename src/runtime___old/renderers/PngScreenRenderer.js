import * as runtime from "runtime";

export default class PngScreenRenderer extends runtime.BaseRenderer {
  render(sheet, snapshot, destRect) {
    const r = this.cssRect(snapshot, destRect);
    const src = new URL(snapshot.imgPath, window.location.origin).href;

    // Always scale screenshots to full viewport width
    const viewportWidth = window.innerWidth;
    const LEFT_TRAY_WIDTH = 55; // Match the collapsed tray width
    const constrainedWidth = viewportWidth - LEFT_TRAY_WIDTH;
    const scaleFactor = viewportWidth / constrainedWidth;
    const renderWidth = viewportWidth;
    const renderHeight = r.height * scaleFactor;
    
    console.log('Scaling screenshot to full width:', {
      originalSize: `${r.width}x${r.height}`,
      scaledSize: `${renderWidth}x${renderHeight}`,
      scaleFactor: scaleFactor
    });

    const img = document.createElement('img');
    Object.assign(img, { alt:'', decoding:'async', loading:'eager', src });
    Object.assign(img.style, {
      position:'absolute', left:r.x+'px', top:r.y+'px',
      width:renderWidth+'px', height:renderHeight+'px', pointerEvents:'none'
    });
    sheet.appendChild(img);
    sheet.dataset.snapShotType = 'screen';
    sheet.style.zIndex = snapshot.z || this.rs._getNextZIndexForGroup(sheet.group) || 0;
    
    // Use the scaled dimensions for overlay coordinate system
    sheet.style.width  = renderWidth + 'px';
    sheet.style.height = renderHeight + 'px';
    var overlayUI = this.rs._ensureLayer('overlay-ui');
    this.rs.scaleStageToViewport(overlayUI, renderWidth, renderHeight);

    return { container: sheet, rect: { ...r, width: renderWidth, height: renderHeight }, img };
  }
}