import * as runtime from "runtime";

export default class PngRegionRenderer extends runtime.BaseRenderer {
  render(sheet, snapshot, destRect) {

    const r = this.cssRect(snapshot, destRect);
    const src = snapshot.imgPath;

    // container at region position/size
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      left:  r.x + 'px',
      top:   r.y + 'px',
      width: r.width + 'px',
      height:r.height + 'px',
      pointerEvents: 'auto'
    });

    // image fills the container
    const img = document.createElement('img');
    Object.assign(img, { alt:'', decoding:'async', loading:'eager', src });
    Object.assign(img.style, {
      position:'absolute',
      left:'0', top:'0', width:'100%', height:'100%',
      pointerEvents:'none'
    });

    container.appendChild(img);
    sheet.appendChild(container);
    sheet.dataset.snapShotType = 'region';
    sheet.style.zIndex = snapshot.z || this.rs._getNextZIndexForGroup(sheet.group) || 0;
    return { container, rect: r, img };

    // No sheet scaling here; regions must align 1:1 over backdrop.
    // return { contentEl: img, cssRect: r };
  }
}