import UploadClient from './UploadClient';

export default function LabUploadPage({ params }: { params: { token: string } }) {
  return <UploadClient token={params.token} />;
}
