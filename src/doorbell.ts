export class RingDetector {
  private last: string | undefined;
  private primed = false;
  seen(state: string | undefined): boolean {
    const valid = !!state && Number.isFinite(Date.parse(state));
    if (!this.primed) { this.primed = valid; this.last = valid ? state : undefined; return false; }
    if (!valid || state === this.last) return false;
    this.last = state;
    return true;
  }
}
