// The film list as plain HTML: for screen readers and search always, and on its own if the scene cannot run.
// Loaded separately from main.js so it survives a CDN or WebGL failure.
import { FILMS } from './films.js?v=22';
import { SITE } from './site.js?v=3';

const list = document.createElement('section');
list.id = 'film-list'; list.className = 'film-list'; list.setAttribute('aria-label', 'Films');
const watch = (f) => (f.episodes ? f.episodes.map((e) => `<a href="${e.video}">${e.label}</a>`).join(' ') : `<a href="${f.video}">Watch</a>`);
const items = FILMS.filter((f) => f.public).map((f) => `<li><strong>${f.title}</strong><small>${[f.client, f.year, f.status].filter(Boolean).join(' · ')}</small>${f.line}${f.note ? ' ' + f.note : ''} ${watch(f)}</li>`).join('');
const details = [SITE.city, SITE.email ? `<a href="mailto:${SITE.email}">${SITE.email}</a>` : '', SITE.linkedin ? `<a href="${SITE.linkedin}">LinkedIn</a>` : ''].filter(Boolean).join(' · ');
list.innerHTML = `<h1>${SITE.name}</h1><p class="lead">${SITE.title} and film director at ${SITE.company}. Films, in the order they appear on the site.</p><ul>${items}</ul>${details ? `<p class="lead">${details}</p>` : ''}`;
document.body.appendChild(list);

function fallback(reason) {
  if (document.body.classList.contains('fallback')) return;
  document.body.classList.add('fallback');
  console.warn('showing the plain film list:', reason);
}
const canvas = document.getElementById('stage');
let gl = null;
try { gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { gl = null; }
if (!gl) fallback('no WebGL');
window.addEventListener('error', (e) => { if (!window.__siteReady) fallback(e.message || 'script error'); });
window.addEventListener('unhandledrejection', () => { if (!window.__siteReady) fallback('script failed to load'); });
setTimeout(() => { if (!window.__siteReady) fallback('scene did not start in time'); }, 9000);
