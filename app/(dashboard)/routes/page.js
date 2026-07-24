import dynamic from 'next/dynamic';

export const revalidate = 0;

const RoutesContent = dynamic(() => import('@/components/RoutesContent'), { ssr: false });

export default function RoutesPage() {
  return <RoutesContent />;
}
