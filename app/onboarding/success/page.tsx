import Link from 'next/link';

export default function OnboardingSuccess() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f0f4f8', fontFamily: 'Inter, sans-serif', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '480px',
        width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0A1628', margin: '0 0 12px' }}>
          Payment Successful!
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', margin: '0 0 32px' }}>
          Your MediPlex subscription is now active. You can log in to your dashboard and start managing your clinic.
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '14px 32px', background: '#0A1628', color: '#C9A84C',
          borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '15px',
        }}>
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}
