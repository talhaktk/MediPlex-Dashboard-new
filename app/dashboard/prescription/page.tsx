import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';
import PrescriptionClient from './PrescriptionClient';

export const revalidate = 60;

export default async function PrescriptionPage() {
  const data = await fetchAppointmentsFromSheet();
  return (
    <>
      <Topbar title="Prescription Pad" subtitle="Write and print digital prescriptions" />
      <main className="flex-1 p-8">
        <PrescriptionClient
          data={data}
          clinicName={process.env.NEXT_PUBLIC_CLINIC_NAME   || 'MediPlex Pediatric Clinic'}
          doctorName={process.env.NEXT_PUBLIC_DOCTOR_NAME   || 'Dr. Talha'}
          clinicPhone={process.env.NEXT_PUBLIC_CLINIC_PHONE || ''}
          clinicAddress={process.env.NEXT_PUBLIC_CLINIC_ADDRESS || ''}
        />
      </main>
    </>
  );
}
