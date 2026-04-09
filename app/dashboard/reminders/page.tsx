import { fetchAppointmentsFromSheet } from '@/lib/sheets';
import Topbar from '@/components/layout/Topbar';

export const revalidate = 60;

export default async function RemindersPage() {
  const data       = await fetchAppointmentsFromSheet();
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic';
  const doctorName = process.env.NEXT_PUBLIC_DOCTOR_NAME || 'Dr. Talha';

  const { default: RemindersClient } = await import('./RemindersClient');

  return (
    <>
      <Topbar title="WhatsApp Reminders" subtitle="Send appointment reminders and follow-ups" />
      <main className="flex-1 p-8">
        <RemindersClient data={data} clinicName={clinicName} doctorName={doctorName} />
      </main>
    </>
  );
}
