// The Blockwork logo at one display size, as small WebP files (1x and 2x)
// instead of the 512px PNG in public/ (which stays for og:image and the
// community site). Spread the result onto a plain <img> so scoped styles apply.
import { getImage } from 'astro:assets';
import logo from '../assets/logo.png';

export async function logoAt(size: number) {
  const image = await getImage({ src: logo, width: size, height: size, densities: [1, 2], format: 'webp' });
  return { src: image.src, srcset: image.srcSet.attribute, width: size, height: size };
}
