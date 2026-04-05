import Topbar from '@/components/layout/Topbar';

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Clinic configuration and integrations" />
      <main className="flex-1 p-8 max-w-3xl">
        <div className="space-y-6">
          <div className="card p-6 animate-in">
            <div className="font-medium text-navy text-[15px] mb-5 pb-4 border-b border-black/5">Clinic Information</div>
            <div className="space-y-4">
              {[
                ['Clinic Name','MediPlex Pediatric Clinic','NEXT_PUBLIC_CLINIC_NAME'],
                ['Address','123 Medical Center Drive, New York, NY 10001','NEXT_PUBLIC_CLINIC_ADDRESS'],
                ['Phone','(212) 555-0190','NEXT_PUBLIC_CLINIC_PHONE'],
                ['Email','appointments@mediplex.com','NEXT_PUBLIC_CLINIC_EMAIL'],
                ['Doctor Name','Dr. Talha','NEXT_PUBLIC_DOCTOR_NAME'],
              ].map(([l,p,e]) => (
                <div key={l}>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{l}</label>
                  <input type="text" placeholder={p} className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[13px] text-navy bg-white outline-none" style={{fontFamily:'DM Sans,sans-serif'}} />
                  <p className="text-[10px] text-gray-400 mt-1">Set via <code className="bg-gray-100 px-1 rounded">{e}</code> in .env.local</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 animate-in stagger-1">
            <div className="font-medium text-navy text-[15px] mb-5 pb-4 border-b border-black/5">Google Sheets Integration</div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Spreadsheet ID</label>
                <input type="text" defaultValue="18XQKbYAKRVho0PzajF2vXwHIs-GcsneginzppJAXVP8" readOnly
                  className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[12px] text-gray-500 bg-gray-50 outline-none font-mono" />
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.2)'}}>
                <div className="text-[12px] font-medium text-amber-800 mb-2">Setup Instructions</div>
                <ol className="text-[12px] text-amber-700 space-y-1 list-decimal list-inside">
                  <li>Go to console.cloud.google.com and enable the Google Sheets API</li>
                  <li>Create an API Key under Credentials, restrict to Sheets API only</li>
                  <li>Add GOOGLE_API_KEY to your .env.local file</li>
                  <li>Ensure your sheet is set to Anyone with link can view</li>
                  <li>Run npm run dev and refresh data will auto-sync every 60s</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="card p-6 animate-in stagger-2">
            <div className="font-medium text-navy text-[15px] mb-5 pb-4 border-b border-black/5">Multi-User Roles</div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Role</th><th>View</th><th>Export</th><th>Edit</th><th>Settings</th></tr></thead>
                <tbody>
                  {[['Admin',true,true,true,true],['Doctor',true,true,true,false],['Receptionist',true,true,false,false],['Viewer',true,false,false,false]].map(([r,...perms])=>(
                    <tr key={r as string}>
                      <td className="font-medium text-navy">{r}</td>
                      {perms.map((p,i)=>(
                        <td key={i}><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-500'}`}>{p?'✓ Yes':'✗ No'}</span></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
