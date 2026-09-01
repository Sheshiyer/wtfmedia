/**
 * Approved episode-scoped Frame.io links for the activated uncut catalogue.
 *
 * These links identify the episode asset as a whole. They are deliberately
 * kept separate from timestamp metadata so stale or legacy vectors can still
 * produce a truthful episode link without reprocessing the transcript.
 */
const FRAME_IO_BY_VIDEO_ID: Readonly<Record<string, string>> = Object.freeze({
  "tWzalcN_Inc": "https://f.io/9vjmQqEA",
  "SkU3J2vWUK8": "https://f.io/fA3BzLzZ",
  "UKag4LVAEdU": "https://f.io/ID2MkTj4",
  "-HkBwSazZsM": "https://f.io/apQ6XFvM",
  "01qfxLY2rhQ": "https://f.io/4OEkae3E",
  "6HE6d0lKh4o": "https://f.io/xKOYgf0f",
  "58i057QXl1A": "https://f.io/xh03e-0J",
  "hNV6urpwrk8": "https://f.io/lDz14jbo",
  "zCTm1wHcfkI": "https://f.io/3C8FH0fm",
  "nGpir4oUfJI": "https://f.io/roSn_hfx",
  "hjiZ11lKCrU": "https://f.io/FdaVCdPT",
  "M72Wu2rZE7Y": "https://f.io/9H0F83Nu",
  "JjDjDvNgkFo": "https://f.io/XqPP-aoj",
  "FPV5fAkqyBs": "https://f.io/N5sFK9qk",
  "VIlfHB7Jk2s": "https://f.io/y7J9kbnu",
  "0JDsFpU6pGQ": "https://f.io/aZ15dDlA",
  "2_yA6GoqUnY": "https://f.io/Il34e-9n",
  "LqSEfz4YUFA": "https://f.io/QdX681Sj",
  "fEUoJSTYtyc": "https://f.io/vJUYjvkR",
  "wHQiewz8k9g": "https://f.io/M2G-uR15",
  "lRjprPQHuXw": "https://f.io/xo4c2nV5",
  "g0CjWbgsdTQ": "https://f.io/koo0kn6a",
  "AdI_XWv-ZTk": "https://f.io/-x0cqh2d",
  "WMRO9dvD5T0": "https://f.io/gruOdHXR",
  "ckNEdxQ0Tc0": "https://f.io/od24Cnit",
  "fEnwMyHejtQ": "https://f.io/vhz7jmbx",
  "YqdJSu1DX48": "https://f.io/hHt88AjJ",
  "JAgHUDhaTU0": "https://f.io/oVTG8UKh",
  "e6FqC4pWy8I": "https://f.io/TR8BZT5h",
  "YY7J1pHfSyY": "https://f.io/W2Dbpxq0",
  "8uFOBdle3WY": "https://f.io/LOyVvO6O",
  "QT2FGbR0nIM": "https://f.io/kf5XQpLO",
  "O7O204wD82s": "https://f.io/0I8LmYs9",
  "SfOaZIGJ_gs": "https://f.io/5MyTq5gL",
  "2B8gABDfh7I": "https://f.io/SYYyV5U7",
  "ohjXRswUYqM": "https://f.io/yTrG5qoS",
  "Rni7Fz7208c": "https://f.io/h405_tNt",
  "N0S048D2tj4": "https://f.io/2_pmQ5af",
  "68ylaeBbdsg": "https://f.io/VrTLEcyQ",
  "hAgqDdPgA3g": "https://f.io/Vt7rIJbv",
  "spdUv7OFOu4": "https://f.io/qIms_Py4",
  "QdWHGjReLUo": "https://f.io/ENKs96GR",
  "SPLFyVyTI1A": "https://f.io/Z7qDGH2j",
  "RSB58m7Xwhg": "https://f.io/wlEoMfP3",
  "lTCzIDITaac": "https://f.io/uDyQHcOm",
  "0YKTsHr5bDE": "https://f.io/g7neSQCC",
  "y5Ewu8wYgqM": "https://f.io/eHYIs3Fg",
  "fL2wyVLX08o": "https://f.io/7veY-Q3a",
  "ef3D5Ak1HP4": "https://f.io/sNEkfU7i",
});

export function frameIoUrlForVideoId(videoId: unknown): string | null {
  if (typeof videoId !== "string") return null;
  return FRAME_IO_BY_VIDEO_ID[videoId.trim()] ?? null;
}
