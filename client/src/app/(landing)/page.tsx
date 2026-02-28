'use client';

import dynamic from 'next/dynamic';

const LandingView = dynamic(() => import('@/views/landing'), { ssr: false });

export default function LandingPage() {
  return <LandingView />;
}
