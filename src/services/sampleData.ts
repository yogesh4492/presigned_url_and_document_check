export interface SampleFileItem {
  name: string;
  content: string;
}

export const SAMPLE_SOAP_NOTES: SampleFileItem[] = [
  // Note 1
  {
    name: 'NOTE_673_01_raw.txt',
    content: `PATIENT CLINICAL SOAP NOTE
PATIENT ID: MRN-8492019
PATIENT NAME: Michael Harrison
DATE OF VISIT: 2024-05-12
FACILITY: St. Jude Medical Center, Room 402
ATTENDING PHYSICIAN: Dr. Eleanor Vance
PHONE: (555) 234-8901
EMAIL: mharrison92@fastmail.net

SUBJECTIVE:
48-year-old male presents with recurrent retrosternal chest discomfort radiating to the left shoulder, onset 3 days ago after moderate exertion. Reports dyspnea on exertion. Denies diaphoresis or syncope.

OBJECTIVE:
BP 142/88 mmHg, HR 78 bpm, SpO2 98% on room air.
Cardiovascular: Regular rate and rhythm, S1/S2 present, no murmurs or gallops.
Lungs: Clear to auscultation bilaterally.
ECG: Normal sinus rhythm without acute ST-T changes. Troponin I negative at 0.01 ng/mL.

ASSESSMENT:
Atypical angina pectoris. Hypertension stage 1, suboptimal control.

PLAN:
1. Initiate Metoprolol succinate 25mg PO daily.
2. Schedule outpatient stress echocardiogram at St. Jude Medical Center cardiology wing.
3. Follow up in clinic in 2 weeks. Contact clinic at (555) 234-8901 for worsening symptoms.`,
  },
  {
    name: 'NOTE_673_01.deid.json',
    content: JSON.stringify(
      {
        raw_note_id: 'NOTE_673_01',
        raw_filename: 'NOTE_673_01_raw.txt',
        doc_id: 'DOC-2024-0512-001',
        entities: [
          { coarse: 'NAME', text: 'Michael Harrison', start: 62, end: 78, confidence: 0.99 },
          { coarse: 'NAME', text: 'Eleanor Vance', start: 168, end: 181, confidence: 0.98 },
          { coarse: 'DATE', text: '2024-05-12', start: 94, end: 104, confidence: 0.99 },
          { coarse: 'HOSPITAL_NAME', text: 'St. Jude Medical Center', start: 115, end: 138, confidence: 0.97 },
          { coarse: 'ROOM_NO', text: 'Room 402', start: 140, end: 148, confidence: 0.95 },
          { coarse: 'TELEPHONE_NO', text: '(555) 234-8901', start: 189, end: 203, confidence: 0.99 },
          { coarse: 'EMAIL_ID', text: 'mharrison92@fastmail.net', start: 211, end: 235, confidence: 0.99 },
          { coarse: 'ID', text: 'MRN-8492019', start: 39, end: 50, confidence: 0.99 },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: 'NOTE_673_01.txt',
    content: `PATIENT CLINICAL SOAP NOTE
PATIENT ID: [redacted-id]
PATIENT NAME: [redacted-person-name]
DATE OF VISIT: [redacted-date]
FACILITY: [redacted-hospital-name], [redacted-room-no]
ATTENDING PHYSICIAN: Dr. [redacted-person-name]
PHONE: [redacted-telephone-no]
EMAIL: [redacted-email-id]

SUBJECTIVE:
48-year-old male presents with recurrent retrosternal chest discomfort radiating to the left shoulder, onset 3 days ago after moderate exertion. Reports dyspnea on exertion. Denies diaphoresis or syncope.

OBJECTIVE:
BP 142/88 mmHg, HR 78 bpm, SpO2 98% on room air.
Cardiovascular: Regular rate and rhythm, S1/S2 present, no murmurs or gallops.
Lungs: Clear to auscultation bilaterally.
ECG: Normal sinus rhythm without acute ST-T changes. Troponin I negative at 0.01 ng/mL.

ASSESSMENT:
Atypical angina pectoris. Hypertension stage 1, suboptimal control.

PLAN:
1. Initiate Metoprolol succinate 25mg PO daily.
2. Schedule outpatient stress echocardiogram at [redacted-hospital-name] cardiology wing.
3. Follow up in clinic in 2 weeks. Contact clinic at [redacted-telephone-no] for worsening symptoms.`,
  },

  // Note 2
  {
    name: 'NOTE_673_02_raw.txt',
    content: `EMERGENCY DEPARTMENT INTAKE SUMMARY
CASE ID: ED-993182
DATE: 2024-06-03
PATIENT: Sarah Lin, DOB 1988-11-04
LOCATION: Seattle, Washington, Metro General Hospital
TRIAGE NURSE: Marcus Brody, RN

CHIEF COMPLAINT:
Acute right lower quadrant abdominal pain with nausea, persistent for 14 hours.

PHYSICAL EXAMINATION:
Abdomen: Localized tenderness at McBurney's point, positive Rovsing's sign. Guarding noted.
Vitals: Temp 38.2 C, HR 102 bpm, BP 118/74 mmHg.
Labs: WBC 14.8 x 10^3/uL with left shift.
Ultrasound: Non-compressible tubular structure measuring 8.5mm, hypervascularity consistent with acute appendicitis.

PLAN:
Admit to surgical service under Dr. Rebecca Sterling at Metro General Hospital. NPO, initiate IV Cefoxitin 2g and normal saline infusion. Consent obtained for laparoscopic appendectomy.`,
  },
  {
    name: 'NOTE_673_02.deid.json',
    content: JSON.stringify(
      {
        raw_note_id: 'NOTE_673_02',
        raw_filename: 'NOTE_673_02_raw.txt',
        doc_id: 'DOC-2024-0603-002',
        entities: [
          { coarse: 'NAME', text: 'Sarah Lin', start: 65, end: 74, confidence: 0.99 },
          { coarse: 'NAME', text: 'Marcus Brody', start: 165, end: 177, confidence: 0.98 },
          { coarse: 'NAME', text: 'Rebecca Sterling', start: 580, end: 596, confidence: 0.98 },
          { coarse: 'DATE', text: '2024-06-03', start: 45, end: 55, confidence: 0.99 },
          { coarse: 'DATE', text: '1988-11-04', start: 80, end: 90, confidence: 0.99 },
          { coarse: 'LOCATION', text: 'Seattle, Washington', start: 101, end: 120, confidence: 0.96 },
          { coarse: 'HOSPITAL_NAME', text: 'Metro General Hospital', start: 122, end: 144, confidence: 0.98 },
          { coarse: 'ID', text: 'ED-993182', start: 41, end: 50, confidence: 0.99 },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: 'NOTE_673_02.txt',
    content: `EMERGENCY DEPARTMENT INTAKE SUMMARY
CASE ID: [redacted-id]
DATE: [redacted-date]
PATIENT: [redacted-person-name], DOB [redacted-date]
LOCATION: [redacted-location], [redacted-hospital-name]
TRIAGE NURSE: [redacted-person-name], RN

CHIEF COMPLAINT:
Acute right lower quadrant abdominal pain with nausea, persistent for 14 hours.

PHYSICAL EXAMINATION:
Abdomen: Localized tenderness at McBurney's point, positive Rovsing's sign. Guarding noted.
Vitals: Temp 38.2 C, HR 102 bpm, BP 118/74 mmHg.
Labs: WBC 14.8 x 10^3/uL with left shift.
Ultrasound: Non-compressible tubular structure measuring 8.5mm, hypervascularity consistent with acute appendicitis.

PLAN:
Admit to surgical service under Dr. [redacted-person-name] at [redacted-hospital-name]. NPO, initiate IV Cefoxitin 2g and normal saline infusion. Consent obtained for laparoscopic appendectomy.`,
  },

  // Note 3
  {
    name: 'NOTE_673_03_raw.txt',
    content: `NEUROLOGY AMBULATORY CLINIC PROGRESS NOTE
RECORD NO: NEURO-55210
DATE: 2024-07-19
PATIENT: David O'Connor
ORGANIZATION: Brigham Health Center
PROVIDER: Dr. Arthur Pendelton
PORTAL: https://patientportal.brighamhealth.org/doc/doc55210
EMAIL: clinic-neuro@brighamhealth.org

HISTORY OF PRESENT ILLNESS:
62-year-old right-handed gentleman with known Parkinson's disease, diagnosed in 2021. Reports mild increase in resting tremor of the right hand during evening hours. No motor fluctuations or dyskinesias.

MEDICATIONS:
Carbidopa/Levodopa 25/100 mg, 1 tablet TID.
Rasagiline 1 mg daily.

EXAMINATION:
Mental Status: Alert, oriented x3. MoCA score 28/30.
Motor: Mild pill-rolling tremor right upper extremity, rest > postural. Mild cogwheel rigidity at right wrist. Gait: Slight reduction in right arm swing, posture upright, turns intact.

PLAN:
1. Increase Carbidopa/Levodopa to 1.5 tabs TID.
2. Physical therapy referral for gait stabilization.
3. Review patient education on https://patientportal.brighamhealth.org/doc/doc55210.
4. Return to clinic in 4 months or message provider at clinic-neuro@brighamhealth.org.`,
  },
  {
    name: 'NOTE_673_03.deid.json',
    content: JSON.stringify(
      {
        raw_note_id: 'NOTE_673_03',
        raw_filename: 'NOTE_673_03_raw.txt',
        doc_id: 'DOC-2024-0719-003',
        entities: [
          { coarse: 'NAME', text: "David O'Connor", start: 65, end: 79, confidence: 0.99 },
          { coarse: 'NAME', text: 'Arthur Pendelton', start: 122, end: 138, confidence: 0.98 },
          { coarse: 'DATE', text: '2024-07-19', start: 45, end: 55, confidence: 0.99 },
          { coarse: 'ORG_NAME', text: 'Brigham Health Center', start: 94, end: 115, confidence: 0.97 },
          { coarse: 'WEB_URL', text: 'https://patientportal.brighamhealth.org/doc/doc55210', start: 147, end: 199, confidence: 0.99 },
          { coarse: 'EMAIL_ID', text: 'clinic-neuro@brighamhealth.org', start: 207, end: 237, confidence: 0.99 },
          { coarse: 'ID', text: 'NEURO-55210', start: 42, end: 53, confidence: 0.99 },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: 'NOTE_673_03.txt',
    content: `NEUROLOGY AMBULATORY CLINIC PROGRESS NOTE
RECORD NO: [redacted-id]
DATE: [redacted-date]
PATIENT: [redacted-person-name]
ORGANIZATION: [redacted-org-name]
PROVIDER: Dr. [redacted-person-name]
PORTAL: [redacted-web-url]
EMAIL: [redacted-email-id]

HISTORY OF PRESENT ILLNESS:
62-year-old right-handed gentleman with known Parkinson's disease, diagnosed in 2021. Reports mild increase in resting tremor of the right hand during evening hours. No motor fluctuations or dyskinesias.

MEDICATIONS:
Carbidopa/Levodopa 25/100 mg, 1 tablet TID.
Rasagiline 1 mg daily.

EXAMINATION:
Mental Status: Alert, oriented x3. MoCA score 28/30.
Motor: Mild pill-rolling tremor right upper extremity, rest > postural. Mild cogwheel rigidity at right wrist. Gait: Slight reduction in right arm swing, posture upright, turns intact.

PLAN:
1. Increase Carbidopa/Levodopa to 1.5 tabs TID.
2. Physical therapy referral for gait stabilization.
3. Review patient education on [redacted-web-url].
4. Return to clinic in 4 months or message provider at [redacted-email-id].`,
  },

  // Note 4
  {
    name: 'NOTE_673_04_raw.txt',
    content: `PEDIATRIC CLINICAL ASSESSMENT
PATIENT: Emma Watson-Bell
DOB: 2017-03-15
HOSPITAL: Children's Memorial Pavilion, Room 104B
SEASON: Summer
DATE: 2024-08-22
PEDIATRICIAN: Dr. Jonathan Miller

CHIEF PRESENTATION:
7-year-old female brought by mother for evaluation of persistent dry cough and nighttime wheezing triggered by seasonal allergens.

ASSESSMENT:
Mild persistent asthma with allergic rhinitis, seasonal exacerbation during Summer months.

PLAN:
1. Fluticasone propionate 44 mcg inhaler, 1 puff BID with aerochamber.
2. Albuterol sulfate 90 mcg inhaler PRN wheezing.
3. Environmental control measures discussed with family. Follow up in Autumn or sooner if rescue inhaler needed >2x/week.`,
  },
  {
    name: 'NOTE_673_04.deid.json',
    content: JSON.stringify(
      {
        raw_note_id: 'NOTE_673_04',
        raw_filename: 'NOTE_673_04_raw.txt',
        doc_id: 'DOC-2024-0822-004',
        entities: [
          { coarse: 'NAME', text: 'Emma Watson-Bell', start: 39, end: 55, confidence: 0.99 },
          { coarse: 'NAME', text: 'Jonathan Miller', start: 168, end: 183, confidence: 0.98 },
          { coarse: 'DATE', text: '2017-03-15', start: 61, end: 71, confidence: 0.99 },
          { coarse: 'DATE', text: '2024-08-22', start: 147, end: 157, confidence: 0.99 },
          { coarse: 'HOSPITAL_NAME', text: "Children's Memorial Pavilion", start: 82, end: 110, confidence: 0.98 },
          { coarse: 'ROOM_NO', text: 'Room 104B', start: 112, end: 121, confidence: 0.95 },
          { coarse: 'SEASON', text: 'Summer', start: 130, end: 136, confidence: 0.94 },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: 'NOTE_673_04.txt',
    content: `PEDIATRIC CLINICAL ASSESSMENT
PATIENT: [redacted-person-name]
DOB: [redacted-date]
HOSPITAL: [redacted-hospital-name], [redacted-room-no]
SEASON: [redacted-season]
DATE: [redacted-date]
PEDIATRICIAN: Dr. [redacted-person-name]

CHIEF PRESENTATION:
7-year-old female brought by mother for evaluation of persistent dry cough and nighttime wheezing triggered by seasonal allergens.

ASSESSMENT:
Mild persistent asthma with allergic rhinitis, seasonal exacerbation during [redacted-season] months.

PLAN:
1. Fluticasone propionate 44 mcg inhaler, 1 puff BID with aerochamber.
2. Albuterol sulfate 90 mcg inhaler PRN wheezing.
3. Environmental control measures discussed with family. Follow up in Autumn or sooner if rescue inhaler needed >2x/week.`,
  },

  // Note 5
  {
    name: 'NOTE_673_05_raw.txt',
    content: `ONCOLOGY DISCHARGE SUMMARY
DISCHARGE DATE: 2024-09-01
PATIENT NAME: Robert Vance
MRN: ONC-774019
FACILITY: Cedars-Sinai Comprehensive Cancer Center
ONCOLOGIST: Dr. Cynthia Hayes
ORGANIZATION: Pacific Health Alliance
PHONE: (310) 423-3000

DIAGNOSIS:
Stage IIA Colon Adenocarcinoma, s/p successful robotic-assisted laparoscopic sigmoid resection on 2024-08-27.

HOSPITAL COURSE:
Postoperative recovery was uneventful. Flatus passed on POD 2, diet advanced smoothly to low-residue solid foods. Surgical incisions clean, dry, and intact with no erythema. Pathology confirms clear margins with 0/14 lymph nodes involved.

DISCHARGE INSTRUCTIONS:
1. Resume home medications.
2. Acetaminophen 650mg PO q6h PRN mild surgical pain.
3. No heavy lifting >10 lbs for 4 weeks.
4. Follow-up surgical check in 10 days with Dr. Hayes.`,
  },
  {
    name: 'NOTE_673_05.deid.json',
    content: JSON.stringify(
      {
        raw_note_id: 'NOTE_673_05',
        raw_filename: 'NOTE_673_05_raw.txt',
        doc_id: 'DOC-2024-0901-005',
        entities: [
          { coarse: 'NAME', text: 'Robert Vance', start: 58, end: 70, confidence: 0.99 },
          { coarse: 'NAME', text: 'Cynthia Hayes', start: 168, end: 181, confidence: 0.98 },
          { coarse: 'DATE', text: '2024-09-01', start: 43, end: 53, confidence: 0.99 },
          { coarse: 'DATE', text: '2024-08-27', start: 330, end: 340, confidence: 0.99 },
          { coarse: 'HOSPITAL_NAME', text: 'Cedars-Sinai Comprehensive Cancer Center', start: 97, end: 137, confidence: 0.98 },
          { coarse: 'ORG_NAME', text: 'Pacific Health Alliance', start: 196, end: 219, confidence: 0.97 },
          { coarse: 'TELEPHONE_NO', text: '(310) 423-3000', start: 227, end: 241, confidence: 0.99 },
          { coarse: 'ID', text: 'ONC-774019', start: 76, end: 86, confidence: 0.99 },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: 'NOTE_673_05.txt',
    content: `ONCOLOGY DISCHARGE SUMMARY
DISCHARGE DATE: [redacted-date]
PATIENT NAME: [redacted-person-name]
MRN: [redacted-id]
FACILITY: [redacted-hospital-name]
ONCOLOGIST: Dr. [redacted-person-name]
ORGANIZATION: [redacted-org-name]
PHONE: [redacted-telephone-no]

DIAGNOSIS:
Stage IIA Colon Adenocarcinoma, s/p successful robotic-assisted laparoscopic sigmoid resection on [redacted-date].

HOSPITAL COURSE:
Postoperative recovery was uneventful. Flatus passed on POD 2, diet advanced smoothly to low-residue solid foods. Surgical incisions clean, dry, and intact with no erythema. Pathology confirms clear margins with 0/14 lymph nodes involved.

DISCHARGE INSTRUCTIONS:
1. Resume home medications.
2. Acetaminophen 650mg PO q6h PRN mild surgical pain.
3. No heavy lifting >10 lbs for 4 weeks.
4. Follow-up surgical check in 10 days with Dr. [redacted-person-name].`,
  },
];
