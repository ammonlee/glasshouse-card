/** Decides when to throw confetti: only when the chore list goes from "some left" to "all done"
 *  within one session — never on load when everything is already done, and at most once per session. */
export class CelebrationGate {
  private _key = '';
  private _sawOpen = false;
  private _fired = false;

  /** `key` identifies the session (day + morning/evening); `total`/`done` are the chore counts. */
  check(key: string, total: number, done: number): boolean {
    if (key !== this._key) { this._key = key; this._sawOpen = false; this._fired = false; }
    if (!total) return false;
    if (done < total) { this._sawOpen = true; return false; }
    if (this._sawOpen && !this._fired) { this._fired = true; return true; }
    return false;
  }
}
