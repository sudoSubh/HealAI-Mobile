import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AnalysisData, AnalysisResponse } from './symptomCheckerService';

// ─── Neo4j Aura credentials (loaded from .env) ───────────────────────────────
// Set EXPO_PUBLIC_NEO4J_* variables in your .env file (see .env.example)
const HOST     = process.env.EXPO_PUBLIC_NEO4J_HOST     ?? '';
const DATABASE = process.env.EXPO_PUBLIC_NEO4J_DATABASE ?? '';
const USERNAME = process.env.EXPO_PUBLIC_NEO4J_USER     ?? '';
const PASSWORD = process.env.EXPO_PUBLIC_NEO4J_PASSWORD ?? '';

function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN;
    const c3 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
    
    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6));
    const byte4 = isNaN(c3) ? 64 : (c3 & 63);
    
    output += chars.charAt(byte1) + chars.charAt(byte2) + 
              (byte3 === 64 ? '=' : chars.charAt(byte3)) + 
              (byte4 === 64 ? '=' : chars.charAt(byte4));
  }
  return output;
}

function getAuthHeader(): string {
  const creds = `${USERNAME}:${PASSWORD}`;
  if (typeof btoa !== 'undefined') {
    return `Basic ${btoa(creds)}`;
  }
  return `Basic ${base64Encode(creds)}`;
}

// Executes a Cypher query using Neo4j Aura Query API v2
async function executeQueryV2(statement: string, parameters: Record<string, any> = {}): Promise<any> {
  const authHeader = getAuthHeader();
  const url = `https://${HOST}/db/${DATABASE}/query/v2`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      statement,
      parameters
    })
  });

  if (!response.ok) {
    throw new Error(`Neo4j Query API v2 failed with status ${response.status}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export async function saveSymptomCheckToNeo4j(data: AnalysisData, result: AnalysisResponse): Promise<void> {
  const patientId = await getOrCreatePatientId();
  const checkId = `check_${Date.now()}`;
  const timestamp = new Date().toISOString();

  try {
    // 1. Create Patient Node
    await executeQueryV2(
      `
        MERGE (p:Patient {id: $patientId})
        ON CREATE SET p.age = $age, p.gender = $gender, p.name = $name, p.address = $address
        ON MATCH SET p.age = $age, p.gender = $gender, p.name = $name, p.address = $address
      `,
      { 
        patientId, 
        age: data.age || 'Not specified', 
        gender: data.gender || 'Not specified',
        name: data.patientName || 'Anonymous Patient',
        address: data.patientAddress || 'Unknown Village'
      }
    );

    // 2. Create SymptomCheck Node
    await executeQueryV2(
      `CREATE (s:SymptomCheck {id: $checkId, date: $timestamp, symptoms: $symptoms, severity: $severity, duration: $duration, esi: $esi, urgency: $urgency, confidence: $confidence, redFlags: $redFlags})`,
      {
        checkId,
        timestamp,
        symptoms: data.symptoms,
        severity: data.severity,
        duration: data.duration,
        esi: result.conditions.length > 0 ? (result.conditions[0] as any).esiScore || 4 : 4,
        urgency: result.urgencyLevel.level,
        confidence: (result as any).selfReportedConfidence || 100,
        redFlags: (result as any).redFlags || []
      }
    );

    // 3. Link Patient to Check
    await executeQueryV2(
      `MATCH (p:Patient {id: $patientId}), (s:SymptomCheck {id: $checkId}) CREATE (p)-[:HAD_CHECK]->(s)`,
      { patientId, checkId }
    );

    // 4. Create & Link Conditions
    for (const c of result.conditions) {
      await executeQueryV2(
        `MERGE (cond:Condition {name: $condName}) WITH cond MATCH (s:SymptomCheck {id: $checkId}) CREATE (s)-[:POTENTIAL_CONDITION {probability: $probability, description: $desc}]->(cond)`,
        {
          checkId,
          condName: c.condition,
          probability: c.probability,
          desc: c.description
        }
      );
    }

    console.log('[Neo4j Query API v2] Saved symptom check successfully.');

    // Save locally
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    const localHistory = localHistoryStr ? JSON.parse(localHistoryStr) : [];
    localHistory.unshift({
      id: checkId,
      patientId,
      date: timestamp,
      data,
      result
    });
    await AsyncStorage.setItem('healai_local_history', JSON.stringify(localHistory.slice(0, 50)));
  } catch (err) {
    console.error('[Neo4j Query API v2] Save failed, fallback to local storage:', err);
    // Offline local caching
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    const localHistory = localHistoryStr ? JSON.parse(localHistoryStr) : [];
    localHistory.unshift({
      id: checkId,
      patientId,
      date: timestamp,
      data,
      result,
      offline: true
    });
    await AsyncStorage.setItem('healai_local_history', JSON.stringify(localHistory.slice(0, 50)));
  }
}

export async function getSymptomCheckHistoryFromNeo4j(): Promise<any[]> {
  const patientId = await getOrCreatePatientId();
  try {
    const data = await executeQueryV2(
      `MATCH (p:Patient {id: $patientId})-[:HAD_CHECK]->(s:SymptomCheck) OPTIONAL MATCH (s)-[r:POTENTIAL_CONDITION]->(c:Condition) RETURN s.id AS id, s.date AS date, s.symptoms AS symptoms, s.severity AS severity, s.duration AS duration, s.esi AS esi, s.urgency AS urgency, collect({name: c.name, probability: r.probability, description: r.description}) as conditions ORDER BY s.date DESC LIMIT 20`,
      { patientId }
    );

    if (!data || !data.values) return [];

    return data.values.map((val: any[]) => {
      // Map columns based on returned fields order: s.id, s.date, s.symptoms, s.severity, s.duration, s.esi, s.urgency, conditions
      const [id, date, symptoms, severity, duration, esi, urgency, conditions] = val;
      return {
        id,
        date,
        data: {
          symptoms,
          severity,
          duration,
          medicalHistory: { conditions: [], medications: [], allergies: [] },
          lifestyle: { smoking: false, alcohol: 'None', exercise: 'Moderate', diet: 'Balanced', stress: 'Moderate', sleep: '7-8 hours' },
          recentChanges: '',
          familyHistory: []
        },
        result: {
          conditions: conditions.map((c: any) => ({
            condition: c.name,
            probability: c.probability,
            description: c.description,
            reasoning: [],
            riskFactors: []
          })),
          urgencyLevel: {
            level: urgency,
            reasoning: [],
            timeframe: ''
          }
        }
      };
    });
  } catch (err) {
    console.warn('[Neo4j Query API v2] Read history failed, reading local:', err);
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    return localHistoryStr ? JSON.parse(localHistoryStr) : [];
  }
}

export async function getCHWDashboardDataFromNeo4j(): Promise<any[]> {
  try {
    const data = await executeQueryV2(
      `MATCH (p:Patient)-[:HAD_CHECK]->(s:SymptomCheck) WHERE s.notifiedTime IS NOT NULL OPTIONAL MATCH (s)-[r:POTENTIAL_CONDITION]->(c:Condition) RETURN s.id AS id, s.date AS date, s.symptoms AS symptoms, s.severity AS severity, s.duration AS duration, s.esi AS esi, s.urgency AS urgency, s.notifiedTime AS notifiedTime, s.notifiedTo AS notifiedTo, p.name AS patientName, p.address AS patientAddress, collect({name: c.name, probability: r.probability}) as conditions ORDER BY s.esi ASC, s.date DESC LIMIT 50`
    );

    if (!data || !data.values) return [];

    return data.values.map((val: any[]) => {
      const [id, date, symptoms, severity, duration, esi, urgency, notifiedTime, notifiedTo, patientName, patientAddress, conditions] = val;
      return {
        id,
        date,
        symptoms,
        severity,
        duration,
        esi: esi || 4,
        urgency: urgency || 'Routine',
        conditions: conditions,
        notified: notifiedTime ? { time: notifiedTime, to: notifiedTo } : null,
        patientName: patientName || 'Anonymous Patient',
        patientAddress: patientAddress || 'Unknown Village'
      };
    });
  } catch (err) {
    console.warn('[Neo4j Query API v2] Read dashboard failed, reading local:', err);
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    const localHistory = localHistoryStr ? JSON.parse(localHistoryStr) : [];
    return localHistory.map((h: any) => {
      const esi = h.result.conditions.length > 0 ? (h.result.conditions[0] as any).esiScore || 4 : 4;
      return {
        id: h.id,
        date: h.date,
        symptoms: h.data.symptoms,
        severity: h.data.severity,
        duration: h.data.duration,
        esi: esi,
        urgency: h.result.urgencyLevel.level,
        conditions: h.result.conditions.map((c: any) => ({ name: c.condition, probability: c.probability })),
        patientName: h.data.patientName || 'Anonymous Patient',
        patientAddress: h.data.patientAddress || 'Unknown Village'
      };
    }).sort((a: any, b: any) => a.esi - b.esi);
  }
}

export async function getOutbreakStatusFromNeo4j(): Promise<{ active: boolean; matches: string[] }> {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const data = await executeQueryV2(
      `MATCH (s:SymptomCheck) WHERE s.date >= $cutoff UNWIND s.symptoms as sym RETURN sym, count(s) as cnt ORDER BY cnt DESC`,
      { cutoff }
    );

    if (!data || !data.values) return { active: false, matches: [] };

    const matches: string[] = [];
    data.values.forEach((val: any[]) => {
      const [sym, count] = val;
      if (count >= 3) {
        matches.push(`${sym} (${count} cases)`);
      }
    });

    return {
      active: matches.length > 0,
      matches
    };
  } catch (err) {
    console.warn('[Neo4j Query API v2] Outbreak calculation failed, offline fallback');
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    if (!localHistoryStr) return { active: false, matches: [] };
    const localHistory = JSON.parse(localHistoryStr);
    
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const symCounts: Record<string, number> = {};
    localHistory.forEach((h: any) => {
      const time = new Date(h.date).getTime();
      if (time >= cutoff) {
        h.data.symptoms.forEach((sym: string) => {
          symCounts[sym] = (symCounts[sym] || 0) + 1;
        });
      }
    });

    const matches = Object.entries(symCounts)
      .filter(([_, count]) => count >= 3)
      .map(([sym, count]) => `${sym} (${count} cases)`);

    return {
      active: matches.length > 0,
      matches
    };
  }
}

export async function saveAuditLogToNeo4j(checkId: string, notifiedTo: string): Promise<void> {
  const timestamp = new Date().toISOString();
  try {
    await executeQueryV2(
      `MATCH (s:SymptomCheck {id: $checkId}) SET s.notifiedTime = $timestamp, s.notifiedTo = $notifiedTo`,
      { checkId, timestamp, notifiedTo }
    );
    console.log('[Neo4j Query API v2] Logged notification dispatch successfully.');
  } catch (err) {
    console.error('[Neo4j Query API v2] Audit log save failed:', err);
  }
}

export async function getOrCreatePatientId(): Promise<string> {
  let id = await AsyncStorage.getItem('healai_patient_id');
  if (!id) {
    id = `pat_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('healai_patient_id', id);
  }
  return id;
}

export async function deleteSymptomCheck(checkId: string): Promise<void> {
  try {
    await executeQueryV2(
      `MATCH (s:SymptomCheck {id: $checkId}) DETACH DELETE s`,
      { checkId }
    );
  } catch (err) {
    console.warn('[Neo4j] Delete query failed:', err);
  }

  try {
    const localHistoryStr = await AsyncStorage.getItem('healai_local_history');
    if (localHistoryStr) {
      const localHistory = JSON.parse(localHistoryStr);
      const filtered = localHistory.filter((item: any) => item.id !== checkId);
      await AsyncStorage.setItem('healai_local_history', JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn('[AsyncStorage] Delete local history item failed:', err);
  }
}

export async function registerPatientToNeo4j(name: string, address: string, phone: string, role: string): Promise<void> {
  const patientId = await getOrCreatePatientId();
  try {
    await executeQueryV2(
      `
        MERGE (p:Patient {id: $patientId})
        ON CREATE SET p.name = $name, p.address = $address, p.phone = $phone, p.role = $role, p.createdAt = $timestamp
        ON MATCH SET p.name = $name, p.address = $address, p.phone = $phone, p.role = $role
      `,
      {
        patientId,
        name,
        address,
        phone,
        role,
        timestamp: new Date().toISOString()
      }
    );
    console.log('[Neo4j] Registered patient details successfully.');
  } catch (err) {
    console.warn('[Neo4j] Failed to register patient in database:', err);
  }
}

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  language: string;
  relationship: string;
  age: string;
}

export async function registerFamilyMember(name: string, phone: string, language: string, relationship: string, age: string): Promise<void> {
  const patientId = await getOrCreatePatientId();
  const memberId = `member_${Date.now()}`;
  try {
    await executeQueryV2(
      `
        MERGE (p:Patient {id: $patientId})
        MERGE (f:FamilyMember {phone: $phone})
        ON CREATE SET f.id = $memberId, f.name = $name, f.language = $language, f.relationship = $relationship, f.age = $age, f.createdAt = $timestamp
        ON MATCH SET f.name = $name, f.language = $language, f.relationship = $relationship, f.age = $age
        MERGE (p)-[:HAS_FAMILY]->(f)
      `,
      {
        patientId,
        memberId,
        phone,
        name,
        language,
        relationship,
        age,
        timestamp: new Date().toISOString()
      }
    );
    console.log('[Neo4j] Family member registered successfully.');
  } catch (err) {
    console.warn('[Neo4j] Failed to register family member:', err);
  }
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const patientId = await getOrCreatePatientId();
  try {
    const res = await executeQueryV2(
      `
        MERGE (p:Patient {id: $patientId})
        WITH p
        MATCH (p)-[:HAS_FAMILY]->(f:FamilyMember)
        RETURN f.id AS id, f.name AS name, f.phone AS phone, f.language AS language, f.relationship AS relationship, f.age AS age
        ORDER BY f.createdAt DESC
      `,
      { patientId }
    );
    if (!res || !res.values) return [];
    return res.values.map((val: any[]) => {
      const [id, name, phone, language, relationship, age] = val;
      return {
        id,
        name,
        phone,
        language,
        relationship,
        age: age || 'Not specified'
      };
    });
  } catch (err) {
    console.warn('[Neo4j] Failed to get family members:', err);
    return [];
  }
}

export async function deleteFamilyMember(memberId: string): Promise<void> {
  try {
    await executeQueryV2(
      `MATCH (f:FamilyMember {id: $memberId}) DETACH DELETE f`,
      { memberId }
    );
    console.log('[Neo4j] Family member deleted successfully.');
  } catch (err) {
    console.warn('[Neo4j] Failed to delete family member:', err);
  }
}

export async function saveNurseCallRecord(
  memberId: string,
  memberName: string,
  memberPhone: string,
  transcript: string,
  esiScore: number,
  summary: string,
  conditions: string[]
): Promise<void> {
  const patientId = await getOrCreatePatientId();
  const callId = `call_${Date.now()}`;
  const timestamp = new Date().toISOString();
  try {
    // 1. Create NurseCall node and connect to FamilyMember and Patient
    await executeQueryV2(
      `
        MERGE (p:Patient {id: $patientId})
        OPTIONAL MATCH (f:FamilyMember {id: $memberId})
        CREATE (c:NurseCall {
          id: $callId,
          date: $timestamp,
          memberName: $memberName,
          memberPhone: $memberPhone,
          transcript: $transcript,
          esiScore: $esiScore,
          summary: $summary,
          conditions: $conditions
        })
        CREATE (p)-[:REQUESTED_CALL]->(c)
        WITH c, f
        WHERE f IS NOT NULL
        CREATE (f)-[:HAD_NURSE_CALL]->(c)
      `,
      {
        patientId,
        memberId,
        callId,
        timestamp,
        memberName,
        memberPhone,
        transcript,
        esiScore,
        summary,
        conditions
      }
    );
    console.log('[Neo4j] Nurse call record saved successfully.');
  } catch (err) {
    console.warn('[Neo4j] Failed to save nurse call record:', err);
  }
}

export async function getNurseCallAlerts(): Promise<any[]> {
  try {
    const res = await executeQueryV2(
      `
        MATCH (c:NurseCall)
        WHERE c.esiScore >= 3
        RETURN c.id AS id, c.date AS date, c.memberName AS memberName, c.memberPhone AS memberPhone, c.summary AS summary, c.esiScore AS esiScore, c.conditions AS conditions, c.transcript AS transcript
        ORDER BY c.date DESC
        LIMIT 30
      `,
      {}
    );
    if (!res || !res.values) return [];
    return res.values.map((val: any[]) => {
      const [id, date, memberName, memberPhone, summary, esiScore, conditions, transcript] = val;
      return {
        id,
        date,
        memberName,
        memberPhone,
        summary,
        esiScore,
        conditions: conditions || [],
        transcript
      };
    });
  } catch (err) {
    console.warn('[Neo4j] Failed to fetch nurse call alerts:', err);
    return [];
  }
}

