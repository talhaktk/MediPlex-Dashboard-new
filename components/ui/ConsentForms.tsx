'use client';
// Consent Forms Component — HIPAA compliant templates
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, CheckCircle, X, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const CONSENT_FORMS = {
  treatment: {
    title: 'General Consent for Medical Treatment',
    subtitle: 'HIPAA Compliant · Standard of Care',
    color: '#3b82f6',
    content: (patient: string, parent: string, dob: string, clinic: string, doctor: string) => `
CONSENT FOR MEDICAL TREATMENT

Patient Name: ${patient}
Date of Birth: ${dob}
Parent/Guardian: ${parent}
Date: ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}

I, ${parent}, as the parent/legal guardian of ${patient}, hereby consent to and authorize the physicians, nurses, and other healthcare providers at ${clinic} under the direction of ${doctor} to perform the following:

1. MEDICAL TREATMENT: I consent to examination, diagnostic procedures, medical treatment, and therapeutic services deemed necessary by the attending physician(s) for the condition(s) of the patient.

2. EMERGENCY TREATMENT: I understand that in the event of an emergency during the course of the above procedure(s) or treatment(s), additional procedures may be performed as deemed necessary by the physician(s).

3. RELEASE OF INFORMATION: I authorize ${clinic} to release medical information necessary for the purpose of treatment, payment, or healthcare operations in accordance with HIPAA Privacy Regulations (45 CFR Parts 160 and 164).

4. PHOTOGRAPHY/OBSERVATION: I understand that for educational and treatment purposes, additional healthcare professionals may be present or observe treatment. Photography for medical records may be taken with my consent.

5. FINANCIAL RESPONSIBILITY: I understand that I am financially responsible for all charges for the services provided that are not covered by insurance.

6. PATIENT RIGHTS: I acknowledge that I have been informed of my rights as a patient, including the right to refuse treatment.

7. ADVANCE DIRECTIVES: I understand I may provide advance directives regarding my child's care at any time.

I have read and understand the above consent and have had the opportunity to ask questions. My questions have been answered to my satisfaction.

Parent/Guardian Signature: ___________________________    Date: _______________

Witness Signature: ___________________________              Date: _______________

${doctor}
${clinic}
    `.trim()
  },
  procedure: {
    title: 'Consent for Medical Procedure',
    subtitle: 'Informed Consent · FDA Compliant',
    color: '#10b981',
    content: (patient: string, parent: string, dob: string, clinic: string, doctor: string) => `
INFORMED CONSENT FOR MEDICAL PROCEDURE

Patient Name: ${patient}
Date of Birth: ${dob}
Parent/Guardian: ${parent}
Date: ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}

I, ${parent}, as the parent/legal guardian of ${patient}, hereby provide informed consent for the procedure(s) recommended by ${doctor} at ${clinic}.

PROCEDURE: _______________________________________________
DIAGNOSIS: _______________________________________________

CONSENT ELEMENTS (in accordance with 21 CFR 50.25 and HIPAA):

1. DESCRIPTION: I have been informed of the nature, purpose, and description of the proposed procedure.

2. RISKS: I understand there are potential risks including but not limited to: pain, bleeding, infection, adverse reaction to medication or anesthesia, and other risks specific to this procedure.

3. BENEFITS: The expected benefits of this procedure have been explained to me.

4. ALTERNATIVES: I have been informed of alternative procedures or treatments available.

5. REFUSAL: I understand I have the right to refuse or withdraw consent at any time without affecting my child's future medical care.

6. ANESTHESIA/SEDATION: If sedation or local anesthesia is required, I consent to its use. Risks including allergic reactions have been explained.

7. BLOOD PRODUCTS: I understand blood transfusions may be necessary in extreme situations. [ ] I consent [ ] I do not consent to blood products.

8. SPECIMEN: I consent to the use of tissues or specimens for diagnostic purposes. [ ] I consent to tissue for research/education.

9. IMPLANTS/DEVICES: Any implanted medical devices will be documented in my child's medical record with FDA tracking as required.

10. PHOTOGRAPHY: I consent to clinical photography for medical records purposes.

I confirm that I understand the information provided, my questions have been answered satisfactorily, and I freely give consent for the proposed procedure.

Parent/Guardian Signature: ___________________________    Date: _______________

Physician Signature: ___________________________            Date: _______________

Witness: ___________________________                        Date: _______________

${doctor} | ${clinic}
This consent form complies with HIPAA Privacy Rule (45 CFR §164.508) and informed consent standards.
    `.trim()
  },
  privacy: {
    title: 'HIPAA Notice of Privacy Practices',
    subtitle: 'Privacy Authorization · Required by Law',
    color: '#8b5cf6',
    content: (patient: string, parent: string, dob: string, clinic: string, doctor: string) => `
NOTICE OF PRIVACY PRACTICES AND AUTHORIZATION

Patient Name: ${patient}
Date of Birth: ${dob}
Parent/Guardian: ${parent}
MR Number: _______________
Date: ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}

NOTICE: This notice describes how medical information about your child may be used and disclosed and how you can get access to this information. PLEASE REVIEW CAREFULLY.

${clinic} | ${doctor}

PART A — NOTICE OF PRIVACY PRACTICES

We are required by law to maintain the privacy of protected health information (PHI), provide you with this Notice, and follow the terms of this Notice.

HOW WE MAY USE AND DISCLOSE YOUR CHILD'S HEALTH INFORMATION:

FOR TREATMENT: We may use your child's health information to provide treatment or coordinate care with other providers.

FOR PAYMENT: We may use and disclose health information to bill and collect payment for treatment services.

FOR HEALTHCARE OPERATIONS: We may use and disclose health information for healthcare operations including quality improvement, training, and accreditation.

OTHER USES/DISCLOSURES WE MAY MAKE:
• Public health activities and reporting
• Abuse or neglect reporting as required by law
• Health oversight activities
• Judicial and administrative proceedings
• Law enforcement purposes
• Workers' compensation
• Research (with appropriate safeguards)
• Serious threats to health or safety

YOUR RIGHTS REGARDING YOUR CHILD'S HEALTH INFORMATION:
• Right to inspect and copy (45 CFR §164.524)
• Right to request amendment (45 CFR §164.526)
• Right to request restrictions (45 CFR §164.522)
• Right to receive confidential communications
• Right to receive an accounting of disclosures (45 CFR §164.528)
• Right to receive a copy of this notice
• Right to file a complaint

PART B — AUTHORIZATION FOR RELEASE OF INFORMATION

I, ${parent}, authorize ${clinic} to release the medical records of ${patient} to:

Name/Organization: _______________________________________________
Address: ________________________________________________________
Purpose: [ ] Continued care [ ] Insurance [ ] School [ ] Other: _______
Information to release: [ ] All records [ ] Specific: __________________
Valid until: _______________________________________________

I understand I may revoke this authorization at any time in writing except where action has already been taken.

Parent/Guardian Signature: ___________________________    Date: _______________

Witness: ___________________________                        Date: _______________

COMPLAINTS: To file a complaint, contact the U.S. Department of Health and Human Services, Office for Civil Rights.
    `.trim()
  }
};

interface Props {
  childName: string; parentName: string; childAge?: string;
  mrNumber?: string; clinicName: string; doctorName: string;
}

export default function ConsentForms({ childName, parentName, childAge, mrNumber, clinicName, doctorName }: Props) {
  const [selected, setSelected] = useState<keyof typeof CONSENT_FORMS | null>(null);
  const [saving, setSaving] = useState(false);

  const printConsent = (key: keyof typeof CONSENT_FORMS) => {
    const form = CONSENT_FORMS[key];
    const dob = childAge ? `Age ${childAge} years` : 'Not recorded';
    const content = form.content(childName, parentName, dob, clinicName, doctorName);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${form.title}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#0a1628;font-size:12px;line-height:1.7}
    h1{font-size:16px;border-bottom:2px solid ${form.color};padding-bottom:8px;margin-bottom:4px}
    .sub{font-size:11px;color:#6b7280;margin-bottom:20px}.pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:12px;line-height:1.7}
    .footer{margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
    @media print{body{padding:20px}}</style></head><body>
    <h1>${form.title}</h1><div class="sub">${form.subtitle} · ${clinicName}</div>
    <div class="pre">${content}</div>
    <div class="footer">This document complies with HIPAA Privacy Rule (45 CFR Parts 160 and 164) and applicable state laws. Generated by MediPlex ${new Date().toLocaleDateString()}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const saveConsent = async (key: keyof typeof CONSENT_FORMS) => {
    setSaving(true);
    try {
      const form = CONSENT_FORMS[key];
      const dob = childAge ? `Age ${childAge} years` : 'Not recorded';
      await supabase.from('consent_forms').insert([{
        id: `CF-${Date.now().toString(36).toUpperCase()}`,
        mr_number: mrNumber || null,
        child_name: childName,
        form_type: key,
        signed_by: parentName,
        content: form.content(childName, parentName, dob, clinicName, doctorName),
      }]);
      toast.success('Consent form saved to records');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally { setSaving(false); }
  };

  if (selected) {
    const form = CONSENT_FORMS[selected];
    const dob = childAge ? `Age ${childAge} years` : 'Not recorded';
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
          <div className="font-medium text-navy text-[14px]">{form.title}</div>
        </div>
        <div className="rounded-xl p-4 font-mono text-[11px] text-gray-700 whitespace-pre-wrap overflow-y-auto max-h-80" style={{background:'#f9f7f3',border:'1px solid rgba(201,168,76,0.15)'}}>
          {form.content(childName, parentName, dob, clinicName, doctorName)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => printConsent(selected)} className="btn-gold text-[12px] py-2 px-4 gap-1.5"><Printer size={13}/> Print & Sign</button>
          <button onClick={() => saveConsent(selected)} disabled={saving} className="btn-outline text-[12px] py-2 px-4 gap-1.5"><CheckCircle size={13}/> {saving ? 'Saving...' : 'Save to Records'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-[13px] font-medium text-navy mb-3">Select Consent Form</div>
      {(Object.entries(CONSENT_FORMS) as [keyof typeof CONSENT_FORMS, any][]).map(([key, form]) => (
        <div key={key} className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-all" style={{border:`1px solid ${form.color}33`,background:`${form.color}08`}} onClick={() => setSelected(key)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${form.color}22`}}>
              <FileText size={18} style={{color:form.color}}/>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold" style={{color:form.color}}>{form.title}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{form.subtitle}</div>
            </div>
            <div className="text-[11px] font-medium" style={{color:form.color}}>View →</div>
          </div>
        </div>
      ))}
    </div>
  );
}
