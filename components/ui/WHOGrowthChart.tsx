'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// WHO Weight-for-age percentiles (boys, 0-60 months) - P3, P15, P50, P85, P97
const WHO_WEIGHT_BOYS: Record<number, number[]> = {
  0:[2.5,2.9,3.3,3.7,4.2],1:[3.4,3.9,4.5,5.1,5.7],2:[4.3,4.9,5.6,6.3,7.1],3:[5.0,5.7,6.4,7.2,8.0],
  4:[5.6,6.3,7.0,7.9,8.7],5:[6.1,6.9,7.5,8.4,9.3],6:[6.4,7.1,7.9,8.8,9.7],
  9:[7.1,8.0,8.9,9.9,10.8],12:[7.7,8.6,9.6,10.8,11.8],18:[8.8,9.8,10.9,12.2,13.3],
  24:[9.7,10.8,12.0,13.6,14.8],30:[10.5,11.7,13.0,14.7,16.1],36:[11.2,12.4,13.9,15.7,17.2],
  42:[11.8,13.1,14.7,16.7,18.3],48:[12.4,13.8,15.5,17.6,19.3],54:[13.0,14.4,16.2,18.5,20.3],60:[13.5,15.0,16.9,19.3,21.3]
};
const WHO_WEIGHT_GIRLS: Record<number, number[]> = {
  0:[2.4,2.8,3.2,3.7,4.2],1:[3.2,3.6,4.2,4.8,5.5],2:[3.9,4.5,5.1,5.8,6.6],3:[4.5,5.2,5.8,6.6,7.5],
  4:[5.0,5.7,6.4,7.3,8.2],5:[5.4,6.1,6.9,7.8,8.8],6:[5.7,6.5,7.3,8.2,9.3],
  9:[6.3,7.2,8.2,9.3,10.5],12:[6.9,7.9,8.9,10.1,11.5],18:[7.8,8.9,10.2,11.5,13.2],
  24:[8.7,9.9,11.3,12.9,14.8],30:[9.5,10.8,12.4,14.1,16.2],36:[10.2,11.5,13.1,15.1,17.2],
  42:[10.8,12.2,13.9,16.0,18.3],48:[11.4,12.9,14.7,17.0,19.4],54:[11.9,13.5,15.4,17.9,20.4],60:[12.5,14.1,16.1,18.8,21.5]
};

// WHO Height-for-age percentiles P3, P15, P50, P85, P97
const WHO_HEIGHT_BOYS: Record<number, number[]> = {
  0:[46.1,47.9,49.9,51.8,53.7],3:[57.3,59.4,61.4,63.5,65.5],6:[63.3,65.5,67.6,69.8,72.0],
  9:[68.0,70.1,72.3,74.5,76.7],12:[71.7,73.9,75.7,78.6,80.5],18:[77.5,79.6,82.3,84.6,87.0],
  24:[82.3,84.6,87.1,90.0,92.3],30:[86.3,88.9,91.9,94.8,97.4],36:[89.7,92.4,95.1,98.1,101.0],
  42:[93.0,95.8,98.7,102.0,104.8],48:[96.1,99.1,102.0,105.3,108.3],54:[99.0,102.1,105.3,108.7,111.7],
  60:[102.0,105.3,108.5,112.0,115.0]
};
const WHO_HEIGHT_GIRLS: Record<number, number[]> = {
  0:[45.6,47.3,49.1,51.0,52.9],3:[56.2,58.4,60.2,62.2,64.3],6:[61.2,63.5,65.7,67.9,70.2],
  9:[65.6,68.0,70.1,72.3,74.7],12:[69.2,71.3,74.0,76.6,78.9],18:[75.2,77.5,80.7,83.2,85.7],
  24:[80.0,82.5,85.7,88.5,91.2],30:[84.0,86.8,89.9,93.3,96.1],36:[87.4,90.2,93.9,97.0,100.0],
  42:[90.7,93.7,97.0,100.4,103.4],48:[93.9,97.0,100.3,103.9,107.0],54:[97.1,100.3,103.7,107.4,110.5],
  60:[100.3,103.5,107.0,110.8,113.9]
};

interface Vital { weight?: string; height?: string; recordedAt?: string; }
interface Props { vitals: Vital[]; gender?: string; ageMonths?: number; }

function buildChartData(whoData: Record<number, number[]>, patientPoints: {x:number;y:number}[]) {
  const months = Object.keys(whoData).map(Number).sort((a,b)=>a-b);
  return months.map(m => {
    const ref = whoData[m];
    const patient = patientPoints.find(p => Math.abs(p.x - m) < 1.5);
    return { month: m, p3: ref[0], p15: ref[1], p50: ref[2], p85: ref[3], p97: ref[4], patient: patient?.y || null };
  });
}

function getPercentile(val: number, ref: number[]): string {
  if (val < ref[0]) return '<3rd';
  if (val < ref[1]) return '3rd–15th';
  if (val < ref[2]) return '15th–50th';
  if (val < ref[3]) return '50th–85th';
  if (val < ref[4]) return '85th–97th';
  return '>97th';
}

export default function WHOGrowthChart({ vitals, gender, ageMonths }: Props) {
  const isGirl = (gender||'').toLowerCase() === 'female';
  const weightData = isGirl ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  const heightData = isGirl ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS;

  const weightPoints = useMemo(() => vitals
    .filter(v => v.weight && v.recordedAt)
    .map(v => ({ x: ageMonths || 0, y: parseFloat(v.weight!) }))
    .filter(p => !isNaN(p.y)), [vitals, ageMonths]);

  const heightPoints = useMemo(() => vitals
    .filter(v => v.height && v.recordedAt)
    .map(v => ({ x: ageMonths || 0, y: parseFloat(v.height!) }))
    .filter(p => !isNaN(p.y)), [vitals, ageMonths]);

  const weightChartData = useMemo(() => buildChartData(weightData, weightPoints), [weightData, weightPoints]);
  const heightChartData = useMemo(() => buildChartData(heightData, heightPoints), [heightData, heightPoints]);

  const latestWeight = weightPoints[0]?.y;
  const latestHeight = heightPoints[0]?.y;
  const nearestMonth = ageMonths ? Object.keys(weightData).map(Number).reduce((a,b) => Math.abs(b-ageMonths)<Math.abs(a-ageMonths)?b:a) : null;
  const weightPct = latestWeight && nearestMonth ? getPercentile(latestWeight, weightData[nearestMonth]) : null;
  const heightPct = latestHeight && nearestMonth ? getPercentile(latestHeight, heightData[nearestMonth]) : null;

  const TT = { contentStyle:{background:'#0a1628',border:'1px solid rgba(201,168,76,0.3)',borderRadius:8,fontSize:11}, labelStyle:{color:'#c9a84c'}, itemStyle:{color:'#fff'} };

  return (
    <div className="space-y-4 mt-4">
      {/* Percentile badges */}
      {(weightPct || heightPct) && (
        <div className="flex gap-3 flex-wrap">
          {weightPct && <div className="rounded-xl px-4 py-2 text-center" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)'}}>
            <div className="text-[10px] text-blue-400 uppercase font-semibold">Weight Percentile</div>
            <div className="text-[16px] font-bold text-blue-600">{weightPct}</div>
            <div className="text-[10px] text-gray-400">{latestWeight}kg · WHO {isGirl?'Girls':'Boys'}</div>
          </div>}
          {heightPct && <div className="rounded-xl px-4 py-2 text-center" style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}>
            <div className="text-[10px] text-emerald-500 uppercase font-semibold">Height Percentile</div>
            <div className="text-[16px] font-bold text-emerald-600">{heightPct}</div>
            <div className="text-[10px] text-gray-400">{latestHeight}cm · WHO {isGirl?'Girls':'Boys'}</div>
          </div>}
        </div>
      )}

      {/* Weight chart */}
      <div className="rounded-xl p-4" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
        <div className="text-[12px] font-semibold text-navy mb-3">⚖ Weight-for-Age (WHO {isGirl?'Girls':'Boys'})</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weightChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="month" tick={{fontSize:9}} label={{value:'Age (months)',position:'insideBottom',offset:-2,fontSize:9}}/>
            <YAxis tick={{fontSize:9}} label={{value:'kg',angle:-90,position:'insideLeft',fontSize:9}}/>
            <Tooltip {...TT}/>
            <Line dataKey="p97" stroke="#fca5a5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P97"/>
            <Line dataKey="p85" stroke="#fdba74" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P85"/>
            <Line dataKey="p50" stroke="#86efac" strokeWidth={1.5} dot={false} name="P50 (median)"/>
            <Line dataKey="p15" stroke="#fdba74" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P15"/>
            <Line dataKey="p3" stroke="#fca5a5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P3"/>
            <Line dataKey="patient" stroke="#1d4ed8" strokeWidth={2.5} dot={{r:4,fill:'#1d4ed8'}} name="Patient" connectNulls/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Height chart */}
      <div className="rounded-xl p-4" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.12)'}}>
        <div className="text-[12px] font-semibold text-navy mb-3">📏 Height-for-Age (WHO {isGirl?'Girls':'Boys'})</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={heightChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="month" tick={{fontSize:9}} label={{value:'Age (months)',position:'insideBottom',offset:-2,fontSize:9}}/>
            <YAxis tick={{fontSize:9}} label={{value:'cm',angle:-90,position:'insideLeft',fontSize:9}}/>
            <Tooltip {...TT}/>
            <Line dataKey="p97" stroke="#fca5a5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P97"/>
            <Line dataKey="p85" stroke="#fdba74" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P85"/>
            <Line dataKey="p50" stroke="#86efac" strokeWidth={1.5} dot={false} name="P50 (median)"/>
            <Line dataKey="p15" stroke="#fdba74" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P15"/>
            <Line dataKey="p3" stroke="#fca5a5" strokeWidth={1} dot={false} strokeDasharray="4 2" name="P3"/>
            <Line dataKey="patient" stroke="#059669" strokeWidth={2.5} dot={{r:4,fill:'#059669'}} name="Patient" connectNulls/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-gray-400 text-center">WHO Child Growth Standards · Data source: WHO 2006</div>
    </div>
  );
}
