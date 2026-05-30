export async function compressVideo(file, maxSizeMB = 10) {
  if (!file || !file.type.startsWith('video/')) return file;
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const stream = video.captureStream();
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const chunks = [];
      const targetBitrate = 1_000_000;
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: targetBitrate,
      });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
          type: mime,
          lastModified: Date.now(),
        });
        resolve(compressed);
      };
      recorder.onerror = () => resolve(file);
      recorder.start();
      video.currentTime = 0;
      video.ontimeupdate = () => {
        if (video.currentTime >= video.duration) {
          recorder.stop();
          video.ontimeupdate = null;
        }
      };
      video.play().catch(() => resolve(file));
    };
    video.onerror = () => resolve(file);
    video.src = URL.createObjectURL(file);
  });
}