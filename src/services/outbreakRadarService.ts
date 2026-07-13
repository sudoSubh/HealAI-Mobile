import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOutbreakStatusFromNeo4j } from './neo4jService';

export interface OutbreakRadarAlert {
  id: string;
  symptom: string;
  count: number;
  time: string;
  villageId: string;
  severity: 'critical' | 'warning';
}

// Background scheduler interval (30 minutes in production, simulated in app)
const SCAN_INTERVAL_MS = 30 * 60 * 1000; 

export async function runAgenticOutbreakScan(): Promise<OutbreakRadarAlert[]> {
  try {
    console.log('[Outbreak Radar] Scanning village database records for localized symptom clusters...');
    
    // Scan database for outbreak clusters
    const result = await getOutbreakStatusFromNeo4j();
    const alerts: OutbreakRadarAlert[] = [];

    if (result.active) {
      result.matches.forEach((match, idx) => {
        // Parse match e.g. "Fever (4 cases)"
        const parts = match.split(' (');
        const symptom = parts[0];
        const count = parseInt(parts[1]?.replace(' cases)', '') || '0');
        
        if (count >= 3) {
          alerts.push({
            id: `alert_${Date.now()}_${idx}`,
            symptom,
            count,
            time: new Date().toISOString(),
            villageId: 'Village 101',
            severity: count >= 5 ? 'critical' : 'warning'
          });
        }
      });
    }

    if (alerts.length > 0) {
      console.log(`[Outbreak Radar] Active clusters detected! Triggering alerts for ASHA workers:`, alerts);
      await AsyncStorage.setItem('outbreak_radar_alerts', JSON.stringify(alerts));
    } else {
      await AsyncStorage.removeItem('outbreak_radar_alerts');
    }

    return alerts;
  } catch (err) {
    console.error('[Outbreak Radar] Scan failed:', err);
    return [];
  }
}

// Setup background timer trigger in the app
export function startOutbreakRadarScheduler(onAlertTriggered: (alerts: OutbreakRadarAlert[]) => void) {
  // First run on startup
  runAgenticOutbreakScan().then(alerts => {
    if (alerts.length > 0) onAlertTriggered(alerts);
  });

  const intervalId = setInterval(async () => {
    const alerts = await runAgenticOutbreakScan();
    if (alerts.length > 0) {
      onAlertTriggered(alerts);
    }
  }, SCAN_INTERVAL_MS);

  return () => clearInterval(intervalId);
}
