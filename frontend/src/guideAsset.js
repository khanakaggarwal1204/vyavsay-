// Inline fallback keeps the guide visible even when a 3D asset is still loading.
const guideSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d9f1ed"/><stop offset="1" stop-color="#9fcfc9"/></linearGradient></defs>
<rect width="240" height="320" rx="28" fill="url(#bg)"/>
<circle cx="120" cy="126" r="83" fill="#0d5f67" opacity=".12"/>
<path d="M55 290c5-54 31-78 65-78s60 24 65 78H55Z" fill="#123b57"/>
<path d="M88 217h64l15 73H73l15-73Z" fill="#f6f8f7"/>
<path d="M62 125c0-65 26-98 62-98 42 0 57 36 57 93v46H62v-41Z" fill="#2d2025"/>
<ellipse cx="120" cy="130" rx="54" ry="63" fill="#f1c6aa"/>
<path d="M67 114c6-54 25-79 58-79 31 0 50 24 54 67-20-19-40-26-66-25-16 1-31 10-46 37Z" fill="#302126"/>
<path d="M75 145c-15-29-14-67 6-89l13 58Z" fill="#302126"/><path d="M165 111c23-20 30-48 16-69l-15 43Z" fill="#302126"/>
<g fill="none" stroke="#27343d" stroke-width="3"><rect x="79" y="119" width="35" height="24" rx="11"/><rect x="126" y="119" width="35" height="24" rx="11"/><path d="M114 128h12"/></g>
<circle cx="97" cy="131" r="4" fill="#27343d"/><circle cx="143" cy="131" r="4" fill="#27343d"/>
<path d="M112 158c6 5 12 5 18 0" fill="none" stroke="#a65858" stroke-width="3" stroke-linecap="round"/>
<path d="M92 214c9 12 18 18 28 18s19-6 28-18" fill="none" stroke="#d7a08b" stroke-width="5"/>
<circle cx="120" cy="247" r="5" fill="#d07a1f"/><path d="M120 252v30" stroke="#d07a1f" stroke-width="2"/>
</svg>`;

export const SAFE_GUIDE_AVATAR = `data:image/svg+xml,${encodeURIComponent(guideSvg)}`;

export function keepAvatarVisible(event) {
  if (event.currentTarget.src !== SAFE_GUIDE_AVATAR) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = SAFE_GUIDE_AVATAR;
  }
}
