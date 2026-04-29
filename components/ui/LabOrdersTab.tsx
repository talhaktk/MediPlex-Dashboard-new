'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, FlaskConical, Scan, QrCode, ExternalLink, CheckCircle, Clock, FileText, X, Eye, Download, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { COMMON_LABS, LAB_EXPANSIONS } from '@/components/ui/LabInvestigations';

interface Props {
  mrNumber: string;
  patientName: string;
  phone?: string;
  clinicId?: string;
}

const RADIOLOGY_TYPES = ['X-Ray','Ultrasound','CT Scan','MRI','Echocardiography','Mammography','DEXA Scan','Fluoroscopy','Angiography'];
const URGENCY_OPTS = ['Routine','Urgent','STAT'];

function isPdf(url: string) { return /\.pdf(\?|$)/i.test(url); }
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url); }

export default function LabOrdersTab({ mrNumber, patientName, phone, clinicId }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<'lab'|'radiology'|null>(null);
  const [expanded, setExpanded] = useState<Set<any>>(new Set());
  const [lightbox, setLightbox] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);

  // Lab order form
  const [selectedTests, setSelectedTests] = useState<{name:string,urgency:string,instructions:string}[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [searchLab, setSearchLab] = useState('');
  
  // Radiology form
  const [radioType, setRadioType] = useState('X-Ray');
  const [bodyPart, setBodyPart] = useState('');
  const [viewPos, setViewPos] = useState('');
  const [contrast, setContrast] = useState('Without');
  const [radioNotes, setRadioNotes] = useState('');
  const [radioUrgency, setRadioUrgency] = useState('Routine');

  const load = useCallback(async () => {
    if (!mrNumber) return;
    setLoading(true);
    const [ordersRes, resultsRes] = await Promise.all([
      fetch(`/api/lab/order?mr=${encodeURIComponent(mrNumber)}`).then(r=>r.json()),
      supabase.from('lab_results').select('*').eq('mr_number', mrNumber).order('uploaded_at',{ascending:false}),
    ]);
    setOrders(ordersRes.data || []);
    setResults(resultsRes.data || []);
    setLoading(false);
  }, [mrNumber]);

  useEffect(() => { load(); }, [load]);

  const resultsForOrder = (orderId: any) => results.filter(r => r.order_id == orderId);

  const submitLabOrder = async () => {
    if (!selectedTests.length) { alert('Select at least one test'); return; }
    setSaving(true);
    const res = await fetch('/api/lab/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mrNumber, patientName, phone: phone||null,
        orderType: 'lab', tests: selectedTests, clinicalNotes,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.ok) { setShowForm(null); setSelectedTests([]); setClinicalNotes(''); load(); }
    else alert(d.error);
  };

  const submitRadioOrder = async () => {
    if (!bodyPart.trim()) { alert('Enter body part/region'); return; }
    setSaving(true);
    const tests = [{ name: `${radioType} — ${bodyPart}${viewPos?' ('+viewPos+')':''} ${contrast!=='Without'?'(Contrast: '+contrast+')':''}`
      .trim(), urgency: radioUrgency, instructions: '' }];
    const res = await fetch('/api/lab/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mrNumber, patientName, phone: phone||null, orderType: 'radiology', tests, clinicalNotes: radioNotes }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.ok) { setShowForm(null); setBodyPart(''); setViewPos(''); setRadioNotes(''); load(); }
    else alert(d.error);
  };

  const uploadUrl = (token: string) => `${window.location.origin}/lab-upload/${token}`;

  const filteredLabs = searchLab 
    ? COMMON_LABS.filter(l => l.name.toLowerCase().includes(searchLab.toLowerCase()))
    : COMMON_LABS;

  return (
    <div className="space-y-4">
      {lightbox && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.9)'}} onClick={()=>setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white z-10"><X size={28}/></button>
          <img src={lightbox} alt="Result" className="max-w-full max-h-full rounded-xl" style={{maxHeight:'90vh',maxWidth:'90vw'}} onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-white">Lab & Radiology Orders</div>
        <div className="flex gap-2">
          <button onClick={load} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60" style={{background:'rgba(255,255,255,0.06)'}}>
            <RefreshCw size={12}/>
          </button>
          <button onClick={()=>setShowForm(showForm==='radiology'?null:'radiology')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{background:'rgba(59,130,246,0.15)',color:'#63b3ed',border:'1px solid rgba(59,130,246,0.3)'}}>
            <Scan size={11}/> Radiology Order
          </button>
          <button onClick={()=>setShowForm(showForm==='lab'?null:'lab')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{background:'rgba(26,127,94,0.15)',color:'#48bb78',border:'1px solid rgba(26,127,94,0.3)'}}>
            <FlaskConical size={11}/> Lab Order
          </button>
        </div>
      </div>

      {/* Lab Order Form */}
      {showForm==='lab' && (
        <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(26,127,94,0.08)',border:'1px solid rgba(26,127,94,0.25)'}}>
          <div className="text-[12px] font-semibold text-emerald-400">New Lab Order</div>
          <input value={searchLab} onChange={e=>setSearchLab(e.target.value)} placeholder="Search tests..." 
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}} onFocus={e=>(e.target.style.borderColor='rgba(201,168,76,0.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {filteredLabs.map(lab=>{
              const sel = selectedTests.find(t=>t.name===lab.name);
              return (
                <button key={lab.name} onClick={()=>{
                  if(sel) setSelectedTests(prev=>prev.filter(t=>t.name!==lab.name));
                  else setSelectedTests(prev=>[...prev,{name:lab.name,urgency:'Routine',instructions:''}]);
                }} className="text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-all"
                  style={{background:sel?'rgba(26,127,94,0.3)':'rgba(255,255,255,0.04)',
                    border:sel?'1px solid rgba(26,127,94,0.5)':'1px solid rgba(255,255,255,0.06)',
                    color:sel?'#48bb78':'rgba(255,255,255,0.6)'}}>
                  {sel?'✓ ':''}{lab.name}
                </button>
              );
            })}
          </div>
          {selectedTests.length>0 && (
            <div className="space-y-1.5">
              {selectedTests.map((t,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-400 flex-1">{t.name}</span>
                  <select value={t.urgency} onChange={e=>setSelectedTests(prev=>prev.map((x,j)=>j===i?{...x,urgency:e.target.value}:x))}
                    className="rounded px-2 py-1 text-[10px] outline-none" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}>
                    {URGENCY_OPTS.map(u=><option key={u} value={u} style={{background:'#0a1628'}}>{u}</option>)}
                  </select>
                  <button onClick={()=>setSelectedTests(prev=>prev.filter((_,j)=>j!==i))} className="text-white/30 hover:text-red-400"><X size={12}/></button>
                </div>
              ))}
            </div>
          )}
          <textarea value={clinicalNotes} onChange={e=>setClinicalNotes(e.target.value)} placeholder="Clinical info / indication..." rows={2}
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}/>
          <div className="flex gap-2">
            <button onClick={submitLabOrder} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold"
              style={{background:'linear-gradient(135deg,#c9a84c,#e8c87a)',color:'#0a1628'}}>
              {saving?<span className="w-3 h-3 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin"/>:<><QrCode size={12}/> Generate Order + QR</>}
            </button>
            <button onClick={()=>{setShowForm(null);setSelectedTests([]);}} className="px-3 py-2 rounded-lg text-[11px] text-white/40" style={{background:'rgba(255,255,255,0.05)'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Radiology Order Form */}
      {showForm==='radiology' && (
        <div className="rounded-xl p-4 space-y-3" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.25)'}}>
          <div className="text-[12px] font-semibold text-blue-400">New Radiology Order</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Type</label>
              <select value={radioType} onChange={e=>setRadioType(e.target.value)} className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}>
                {RADIOLOGY_TYPES.map(t=><option key={t} value={t} style={{background:'#0a1628'}}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Urgency</label>
              <select value={radioUrgency} onChange={e=>setRadioUrgency(e.target.value)} className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}>
                {URGENCY_OPTS.map(u=><option key={u} value={u} style={{background:'#0a1628'}}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Body Part / Region *</label>
              <input value={bodyPart} onChange={e=>setBodyPart(e.target.value)} placeholder="e.g. Chest, Right Knee..." className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}} onFocus={e=>(e.target.style.borderColor='rgba(201,168,76,0.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">View / Position</label>
              <input value={viewPos} onChange={e=>setViewPos(e.target.value)} placeholder="e.g. PA+Lateral, AP" className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}} onFocus={e=>(e.target.style.borderColor='rgba(201,168,76,0.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Contrast</label>
              <select value={contrast} onChange={e=>setContrast(e.target.value)} className="w-full rounded-lg px-3 py-2 text-[12px] outline-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}>
                {['Without','With','With & Without'].map(c=><option key={c} value={c} style={{background:'#0a1628'}}>{c}</option>)}
              </select>
            </div>
          </div>
          <textarea value={radioNotes} onChange={e=>setRadioNotes(e.target.value)} placeholder="Clinical indication..." rows={2}
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#faf8f4'}}/>
          <div className="flex gap-2">
            <button onClick={submitRadioOrder} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold"
              style={{background:'linear-gradient(135deg,#c9a84c,#e8c87a)',color:'#0a1628'}}>
              {saving?<span className="w-3 h-3 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin"/>:<><QrCode size={12}/> Generate Order + QR</>}
            </button>
            <button onClick={()=>setShowForm(null)} className="px-3 py-2 rounded-lg text-[11px] text-white/40" style={{background:'rgba(255,255,255,0.05)'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin"/></div>
      ) : orders.length === 0 && results.length === 0 ? (
        <div className="text-center py-8 text-white/20 text-[12px]">No lab orders yet</div>
      ) : (
        <div className="space-y-3">
          {orders.map(order=>{
            const isOpen = expanded.has(order.id);
            const orderResults = resultsForOrder(order.id);
            const isPending = order.status === 'pending';
            const isExpired = order.qr_expires_at && new Date(order.qr_expires_at) < new Date();
            return (
              <div key={order.id} className="rounded-xl overflow-hidden" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <button onClick={()=>setExpanded(prev=>{const n=new Set(prev);n.has(order.id)?n.delete(order.id):n.add(order.id);return n;})}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:order.order_type==='radiology'?'rgba(59,130,246,0.15)':'rgba(26,127,94,0.15)'}}>
                    {order.order_type==='radiology'?<Scan size={16} className="text-blue-400"/>:<FlaskConical size={16} className="text-emerald-400"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white truncate">
                      {(order.tests||[]).slice(0,2).map((t:any)=>t.name||t).join(', ')}
                      {(order.tests||[]).length>2?` +${(order.tests||[]).length-2} more`:''}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {new Date(order.ordered_at||order.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                      {order.ordered_by? ' · by '+order.ordered_by:''}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{background:order.status==='completed'?'rgba(26,127,94,0.2)':'rgba(245,158,11,0.2)',
                      color:order.status==='completed'?'#48bb78':'#fbbf24'}}>
                    {order.status==='completed'?'✓ Results Ready':'Awaiting Results'}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3" style={{borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    {/* QR Code */}
                    {isPending && !isExpired && order.qr_token && (
                      <div className="flex gap-4 items-start p-3 rounded-xl mt-2" style={{background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)'}}>
                        <div className="flex-shrink-0 p-2 bg-white rounded-xl">
                          <QRCodeSVG value={uploadUrl(order.qr_token)} size={90} level="M"/>
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-semibold text-white mb-1">Show this QR at the lab</p>
                          <p className="text-[10px] text-white/40 mb-2">Lab scans QR → uploads results directly to this patient record</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {(order.tests||[]).map((t:any,i:number)=>(
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{background:'rgba(201,168,76,0.15)',color:'#c9a84c'}}>
                                {t.name||t}{t.urgency&&t.urgency!=='Routine'?` • ${t.urgency}`:''}
                              </span>
                            ))}
                          </div>
                          <a href={uploadUrl(order.qr_token)} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] flex items-center gap-1 text-white/30 hover:text-white/60">
                            <ExternalLink size={10}/> {uploadUrl(order.qr_token).slice(0,50)}...
                          </a>
                          {order.qr_expires_at && <p className="text-[9px] text-white/20 mt-1">Expires: {new Date(order.qr_expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>}
                          <div className="flex gap-2 mt-2">
                            <button onClick={()=>{
                              const w=window.open('','_blank');
                              if(!w)return;
                              w.document.write(`<!DOCTYPE html><html><head><title>Lab Order</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto;color:#0a1628}.header{background:#0a1628;color:#fff;padding:10px 16px;border-radius:8px 8px 0 0;text-align:center}.body{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px}.title{font-size:14px;font-weight:700}.sub{font-size:10px;color:rgba(255,255,255,0.6)}.qr-wrap{text-align:center;margin:12px 0}.tests{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.test-pill{background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}.footer{font-size:10px;color:#9ca3af;margin-top:12px;text-align:center}@media print{button{display:none}}</style></head><body><div class="header"><div class="title">MediPlex Lab Order</div><div class="sub">Scan QR at the lab to upload results</div></div><div class="body"><p style="font-size:13px;font-weight:600;margin-bottom:4px">Patient: ${order.child_name}</p><p style="font-size:11px;color:#6b7280;margin-bottom:12px">MR#: ${order.mr_number} · Ordered by: ${order.ordered_by||'Doctor'}</p><div class="qr-wrap"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(uploadUrl(order.qr_token))}" width="150" height="150"/></div><p style="font-size:11px;color:#6b7280;text-align:center;margin-bottom:8px">Tests Ordered:</p><div class="tests">${(order.tests||[]).map((t:any)=>`<span class="test-pill">${t.name||t}${t.urgency&&t.urgency!=='Routine'?' ('+t.urgency+')':''}</span>`).join('')}</div><div class="footer">Scan QR → Upload results at: ${uploadUrl(order.qr_token)}<br/>Expires: ${order.qr_expires_at?new Date(order.qr_expires_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):''}</div></div><button onclick="window.print()" style="margin:12px auto;display:block;padding:8px 20px;background:#0a1628;color:#c9a84c;border:none;border-radius:8px;cursor:pointer;font-size:13px">🖨️ Print</button></body></html>`);
                              w.document.close();
                              setTimeout(()=>w.print(),500);
                            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                              style={{background:'rgba(201,168,76,0.15)',color:'#c9a84c',border:'1px solid rgba(201,168,76,0.3)'}}>
                              🖨️ Print Order
                            </button>
                            {order.phone && (
                              <a href={`https://wa.me/${(order.phone||'').replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Lab Order from MediPlex\n\nPatient: '+order.child_name+'\nMR#: '+order.mr_number+'\nTests: '+(order.tests||[]).map((t:any)=>t.name||t).join(', ')+'\n\nPlease scan QR at the lab to upload results:\n'+uploadUrl(order.qr_token))}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                                style={{background:'rgba(37,211,102,0.15)',color:'#25d366',border:'1px solid rgba(37,211,102,0.3)'}}>
                                💬 WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {orderResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Results from {orderResults[0]?.lab_name||'Lab'}</p>
                        {orderResults.map(r=>(
                          <div key={r.id} className="rounded-lg p-3" style={{background:'rgba(26,127,94,0.08)',border:'1px solid rgba(26,127,94,0.2)'}}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[12px] font-medium text-emerald-400">{r.test_name}</span>
                              <span className="text-[10px] text-white/30">{r.visit_date||r.uploaded_at?.slice(0,10)}</span>
                            </div>
                            {r.notes && <p className="text-[11px] text-white/50 mb-2">{r.notes}</p>}
                            {/* Files */}
                            {(r.file_urls||[]).length>0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(r.file_urls as string[]).map((url:string,i:number)=>(
                                  isImage(url) ? (
                                    <button key={i} onClick={()=>setLightbox(url)}
                                      className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                                      style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                                      <img src={url} alt="result" className="w-full h-full object-cover"/>
                                    </button>
                                  ) : (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium"
                                      style={{background:isPdf(url)?'rgba(220,38,38,0.15)':'rgba(255,255,255,0.06)',
                                        color:isPdf(url)?'#fc8181':'rgba(255,255,255,0.6)',
                                        border:isPdf(url)?'1px solid rgba(220,38,38,0.2)':'1px solid rgba(255,255,255,0.08)'}}>
                                      <FileText size={12}/> {isPdf(url)?'View PDF':'Open File'} <Download size={10}/>
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uploaded results without orders (legacy) */}
          {results.filter(r=>!r.order_id).length > 0 && (
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Uploaded Reports</p>
              <div className="space-y-2">
                {results.filter(r=>!r.order_id).map(r=>(
                  <div key={r.id} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-white/80">{r.test_name}</span>
                      <span className="text-[10px] text-white/30">{r.visit_date||r.uploaded_at?.slice(0,10)}</span>
                    </div>
                    {r.lab_name && <p className="text-[10px] text-white/30 mb-2">{r.lab_name}</p>}
                    {(r.file_urls||[]).length>0 && (
                      <div className="flex flex-wrap gap-2">
                        {(r.file_urls as string[]).map((url:string,i:number)=>(
                          isImage(url) ? (
                            <button key={i} onClick={()=>setLightbox(url)} className="w-14 h-14 rounded-lg overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                              <img src={url} alt="result" className="w-full h-full object-cover"/>
                            </button>
                          ) : (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
                              style={{background:'rgba(220,38,38,0.15)',color:'#fc8181',border:'1px solid rgba(220,38,38,0.2)'}}>
                              <FileText size={12}/> View PDF
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
