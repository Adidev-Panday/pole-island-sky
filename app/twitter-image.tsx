import { ImageResponse } from 'next/og';
import { OG_IMAGE_ALT, OG_IMAGE_SIZE, renderShareImage } from '@/lib/ogImage';

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(renderShareImage(), { ...size });
}
