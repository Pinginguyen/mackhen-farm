import { notFound } from 'next/navigation';
import { getExportDocument } from '@/lib/b2b-export-documents';
import ExportDocumentPreview from './preview';

export default function ExportDocumentPage({ params }: { params: { documentId: string } }) {
  const document = getExportDocument(params.documentId);
  if (!document) notFound();
  return <ExportDocumentPreview document={document} />;
}