import { toBlob } from 'html-to-image';

export async function exportCareerResume(source, action, acronym) {
  await document.fonts.ready;
  const snapshot = source.cloneNode(true);
  snapshot.classList.add('legacy-export');
  snapshot.setAttribute('aria-hidden', 'true');
  snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  Object.assign(snapshot.style, { position: 'fixed', left: '-20000px', top: '0', width: '1600px', height: '900px', margin: '0' });
  document.body.append(snapshot);
  let blob;
  try {
    await Promise.all([...snapshot.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
    blob = await toBlob(snapshot, { width: 1600, height: 900, pixelRatio: 1.5, backgroundColor: '#090d10', style: { position: 'static' } });
    if (!blob) throw new Error('Image export failed');
  } finally {
    snapshot.remove();
  }
  const file = new File([blob], `${acronym}-GM-Legacy.png`, { type: 'image/png' });
  if (action === 'share' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${acronym} GM Legacy` });
      return 'Resume shared.';
    } catch (error) {
      if (error.name === 'AbortError') return 'Sharing cancelled.';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return action === 'share' ? 'Resume saved. Image sharing is unavailable in this browser.' : 'Resume image saved.';
}