import type { Metadata } from 'next';
import ScalesExperience from '@/components/ScalesExperience';

const DESCRIPTION =
  "A horizontal journey through 61 orders of magnitude, inspired by Alan Lightman's Searching for Stars on an Island in Maine.";

export const metadata: Metadata = {
  title: 'Scales of Wonder, from the Planck length to the observable universe',
  description: DESCRIPTION,
  openGraph: {
    title: 'Scales of Wonder, from the Planck length to the observable universe',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scales of Wonder, from the Planck length to the observable universe',
    description: DESCRIPTION,
  },
};

export default function ScalesPage() {
  return <ScalesExperience />;
}
