import { ImageResponse } from 'next/og';
import { OG_IMAGE_SIZE, renderShareImage } from '@/lib/ogImage';

export const alt = 'Scales of Wonder, a powers-of-ten journey from the Planck length to the observable universe';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default function ScalesOpengraphImage() {
  return new ImageResponse(
    renderShareImage({
      title: 'Scales of Wonder',
      subtitle: 'From the Planck length to the observable universe',
    }),
    { ...size }
  );
}
