import * as runtime from "runtime";

export default class PngRegionRenderer extends runtime.BaseRenderer {
  render(sheet, snapshot, destRect) {
    const r = this.cssRect(snapshot, destRect);
    const src = new URL(snapshot.filePath, window.location.origin).href;

    // Scale region coordinates to match the scaled backdrop
    const viewportWidth = window.innerWidth;
    const LEFT_TRAY_WIDTH = 55; // Match the collapsed tray width
    const constrainedWidth = viewportWidth - LEFT_TRAY_WIDTH;
    const scaleFactor = viewportWidth / constrainedWidth;
    
    // Apply same scaling as PngScreenRenderer
    const scaledRect = {
      x: r.x * scaleFactor,
      y: r.y * scaleFactor,
      width: r.width * scaleFactor,
      height: r.height * scaleFactor
    };
    
    console.log('Scaling region coordinates:', {
      original: `${r.x},${r.y} ${r.width}x${r.height}`,
      scaled: `${scaledRect.x},${scaledRect.y} ${scaledRect.width}x${scaledRect.height}`,
      scaleFactor: scaleFactor
    });

    // container at scaled region position/size
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      left:  scaledRect.x + 'px',
      top:   scaledRect.y + 'px',
      width: scaledRect.width + 'px',
      height:scaledRect.height + 'px',
      pointerEvents: 'auto'
    });

    // image fills the container
    const img = document.createElement('img');
    Object.assign(img, { alt:'', decoding:'async', loading:'eager', src });
    img.src = new URL(snapshot.filePath, location.origin).href;
    Object.assign(img.style, {
      position:'absolute',
      left:'0', top:'0', width:'100%', height:'100%',
      pointerEvents:'none'
    });

    container.appendChild(img);
    sheet.appendChild(container);
    sheet.dataset.snapShotType = 'region';
    sheet.style.zIndex = snapshot.z || this.rs._getNextZIndexForGroup(sheet.group) || 0;
    return { container, rect: scaledRect, img };

    // No sheet scaling here; regions must align 1:1 over backdrop.
    // return { contentEl: img, cssRect: r };
  }
}