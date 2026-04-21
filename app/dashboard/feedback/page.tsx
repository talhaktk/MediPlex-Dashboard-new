import Topbar from '@/components/layout/Topbar';
import FeedbackDashboard from './FeedbackDashboard';
export const revalidate = 0;
export default function FeedbackPage() {
  return (
    <>
      <Topbar title="Patient Feedback" subtitle="Ratings and reviews from patients"/>
      <main className="flex-1 p-8">
        <FeedbackDashboard/>
      </main>
    </>
  );
}
