# This script patches AppointmentsClient.tsx

import re

path = '/Users/talha/Downloads/mediplex_dashboard/mediplex/app/dashboard/appointments/AppointmentsClient.tsx'

try:
    with open(path) as f:
        content = f.read()
except:
    print("File not found at", path)
    exit(1)

# Fix 1: fetchLatest - add gender mapping
old1 = "        mr_number:        row.mr_number || '',\n      } as Appointment)));"
new1 = "        mr_number:        row.mr_number || '',\n        gender:           row.gender || '',\n      } as Appointment)));"
content = content.replace(old1, new1)

# Fix 2: Age column - show age + gender initial
old2 = "<td className=\"text-[12px] text-gray-600\">{a.childAge ? `${a.childAge} yr` : '—'}</td>"
new2 = """<td className="text-[12px] text-gray-600">
  {a.childAge ? `${a.childAge} yr` : '—'}
  {(a as any).gender ? <span className="ml-1 text-[10px] px-1 py-0.5 rounded font-medium" style={{background:(a as any).gender==='Male'?'#dbeafe':(a as any).gender==='Female'?'#fce7f3':'#f3e8ff',color:(a as any).gender==='Male'?'#1d4ed8':(a as any).gender==='Female'?'#be185d':'#7c3aed'}}>{(a as any).gender.charAt(0)}</span> : null}
</td>"""
content = content.replace(old2, new2)

with open(path, 'w') as f:
    f.write(content)

print("Fixes applied successfully")
