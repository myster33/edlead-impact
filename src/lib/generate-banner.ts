/**
 * Generates a social media banner using browser Canvas API.
 * Composites the template background, student photo (circular), and congratulations text.
 * Returns a base64 PNG string ready for upload.
 */

const TEMPLATE_URL = "/social-banner-template.jpg";
const W = 1080;
const H = 1080;
const CIRCLE_X = 540;
const CIRCLE_Y = 360;
const CIRCLE_R = 220;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin if CORS fails
      const img2 = new window.Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img2.src = src;
    };
    img.src = src;
  });
}

export async function generateBannerBase64(
  applicantName: string,
  applicantPhotoUrl?: string | null
): Promise<string> {
  // Load Great Vibes font for "Congratulations"
  const greatVibesFont = new FontFace(
    "Great Vibes",
    "url(https://fonts.gstatic.com/s/greatvibes/v18/RWmMoKWR9v4ksMfaWd_JN9XFiaQo.woff2)"
  );
  try {
    const loaded = await greatVibesFont.load();
    document.fonts.add(loaded);
  } catch (e) {
    console.warn("Could not load Great Vibes font:", e);
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // 1. Draw background template
  const template = await loadImage(TEMPLATE_URL);
  ctx.drawImage(template, 0, 0, W, H);

  // 2. Draw student photo in circle
  if (applicantPhotoUrl?.trim()) {
    try {
      const photo = await loadImage(applicantPhotoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Cover the circle area with the photo
      const size = CIRCLE_R * 2;
      const aspect = photo.width / photo.height;
      let drawW = size, drawH = size;
      if (aspect > 1) {
        drawW = size * aspect;
      } else {
        drawH = size / aspect;
      }
      const drawX = CIRCLE_X - drawW / 2;
      const drawY = CIRCLE_Y - drawH / 2;
      ctx.drawImage(photo, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (e) {
      console.warn("Could not load student photo:", e);
    }
  }

  // 3. Draw text
  ctx.textAlign = "center";

  // "Congratulations" in calligraphy style
  ctx.font = "italic 52px 'Georgia', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif";
  ctx.fillStyle = "#1A1A1A";
  try { ctx.letterSpacing = "2px"; } catch (_) { /* unsupported */ }
  ctx.fillText("Congratulations", W / 2, 680);

  // Student name in brand orange
  ctx.font = "bold 48px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#ED7621";
  try { ctx.letterSpacing = "3px"; } catch (_) { /* unsupported */ }
  ctx.fillText(applicantName.toUpperCase(), W / 2, 750);

  // "APPLICATION ACCEPTED" in bold
  ctx.font = "1000 36px 'Montserrat', Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#1A1A1A";
  try { ctx.letterSpacing = "6px"; } catch (_) { /* unsupported */ }
  ctx.fillText("APPLICATION ACCEPTED", W / 2, 830);

  // "edLEAD Leadership Program"
  ctx.font = "bold 30px Arial, Helvetica, sans-serif";
  ctx.fillStyle = "#4A4A4A";
  try { ctx.letterSpacing = "2px"; } catch (_) { /* unsupported */ }
  ctx.fillText("edLEAD Leadership Program", W / 2, 880);

  // Convert to base64 (strip data URI prefix)
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}
