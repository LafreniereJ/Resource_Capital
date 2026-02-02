import { generatePageMetadata } from '@/lib/metadata';
import ApiDocsClient from './ApiDocsClient';

export const metadata = generatePageMetadata({
  title: 'API Documentation',
  description: 'Resource Capital API documentation - access mining stock data, metal prices, and news programmatically.',
  path: '/api-docs',
});

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
