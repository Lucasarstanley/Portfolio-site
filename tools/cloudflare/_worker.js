// Cloudflare Pages worker. The site is plain files; this exists for one reason. Safari and iPhones ask for a
// video in byte ranges and will not play one from a server that answers a range request with the whole file,
// which is what Pages does for its uploaded files (seen again in October 2026). So for a GET of an .mp4 with a
// Range header, this fetches the file and answers with the bytes asked for as a 206. Everything else, and any
// failure in here, goes straight to the uploaded files. _routes.json limits it to the films.
export default {
  async fetch(request, env) {
    try {
      const range = request.headers.get('Range');
      if (request.method === 'GET' && range && new URL(request.url).pathname.endsWith('.mp4')) {
        return await serveRange(request, env, range);
      }
    } catch (e) {
      console.warn('range worker failed, serving the plain file', e);
    }
    return env.ASSETS.fetch(request);
  },
};

async function serveRange(request, env, range) {
  const headers = new Headers(request.headers);
  headers.delete('If-Range');         // checked here instead, against the file's ETag
  headers.delete('Accept-Encoding');  // so the bytes are the file's own
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers }));
  if (asset.status !== 200) return asset;  // already a 206, a 304, a 404: pass it on

  // If-Range: when the validator the browser holds no longer matches, the whole file is the right answer.
  // Weak and strong tags are compared loosely; the files don't change under a playing video.
  const ifRange = request.headers.get('If-Range');
  if (ifRange) {
    const strip = (s) => s.replace(/^W\//i, '');
    const etag = asset.headers.get('ETag'), modified = asset.headers.get('Last-Modified');
    const isTag = /^(W\/)?"/i.test(ifRange);
    if (isTag ? etag && strip(ifRange) !== strip(etag) : modified && ifRange !== modified) return asset;
  }

  let size = Number(asset.headers.get('Content-Length')), buf = null;
  if (!(size > 0)) { buf = new Uint8Array(await asset.arrayBuffer()); size = buf.byteLength; }
  const r = parseRange(range, size);
  if (r === null) return buf ? new Response(buf, { status: 200, headers: asset.headers }) : asset;  // not a range we serve: whole file
  if (r === 'unsatisfiable') {
    if (!buf) asset.body?.cancel().catch(() => {});
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' } });
  }
  const [start, end] = r, length = end - start + 1;
  const out = new Headers(asset.headers);
  out.set('Content-Range', `bytes ${start}-${end}/${size}`);
  out.set('Content-Length', String(length));
  out.set('Accept-Ranges', 'bytes');
  out.delete('Content-Encoding');
  let body;
  if (buf) body = buf.subarray(start, end + 1);
  else {
    body = slice(asset.body, start, end);
    if (typeof FixedLengthStream === 'function') body = body.pipeThrough(new FixedLengthStream(length));
  }
  return new Response(body, { status: 206, headers: out });
}

// 'bytes=a-b', 'bytes=a-' or 'bytes=-n' → [first, last]; a range past the end → 'unsatisfiable';
// anything else (several ranges, last before first, not bytes) → null, meaning serve the whole file.
function parseRange(header, size) {
  const m = /^bytes\s*=\s*(\d*)-(\d*)$/i.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    return [Math.max(0, size - n), size - 1];
  }
  const start = Number(m[1]);
  if (start >= size) return 'unsatisfiable';
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (end < start) return null;
  return [start, end];
}

// The bytes [start, end] of a stream, and no more: once the last byte is out the source is cancelled.
function slice(stream, start, end) {
  let pos = 0;
  const stop = end + 1;
  return stream.pipeThrough(new TransformStream({
    transform(chunk, ctrl) {
      const a = pos, b = pos + chunk.byteLength;
      pos = b;
      if (b > start && a < stop) {
        const from = Math.max(start, a) - a, to = Math.min(stop, b) - a;
        ctrl.enqueue(from === 0 && to === chunk.byteLength ? chunk : chunk.subarray(from, to));
      }
      if (b >= stop) ctrl.terminate();
    },
  }));
}
