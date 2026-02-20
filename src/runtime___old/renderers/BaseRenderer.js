export default class BaseRenderer {
  constructor(rs) { this.rs = rs; }
  cssRect(snapshot, destRect) {
    const dpr  = snapshot.dpr || 1;
    const rect = destRect || snapshot.destRect || snapshot.sourceRect;
    return this.rs.toCssRect(rect, dpr);
  }
  render(/* sheet, snapshot, destRect */) {
    throw new Error('override render()');
  }
}