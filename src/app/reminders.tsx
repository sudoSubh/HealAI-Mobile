import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Surface, TextInput, Button, Switch, Card, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Colors } from '../theme';
import { 
  MedicineReminder, 
  scheduleMedicineReminder, 
  cancelMedicineReminder,
  requestNotificationPermissions 
} from '../services/notificationService';

export default function RemindersScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState(''); // e.g. "08:00"

  useEffect(() => {
    requestNotificationPermissions();
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const stored = await AsyncStorage.getItem('medication_reminders');
      if (stored) {
        setReminders(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load medication reminders:', e);
    }
  };

  const saveReminders = async (list: MedicineReminder[]) => {
    setReminders(list);
    await AsyncStorage.setItem('medication_reminders', JSON.stringify(list));
  };

  const handleAddReminder = async () => {
    if (!medName.trim() || !dosage.trim() || !time.trim()) {
      Alert.alert('Incomplete Form', 'Please enter medicine name, dosage, and scheduled time.');
      return;
    }

    // Validate HH:MM time format
    const timeMatch = time.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
    if (!timeMatch) {
      Alert.alert('Invalid Time Format', 'Please enter time in 24-hour HH:MM format (e.g., 08:30 or 20:00).');
      return;
    }

    const newReminder: MedicineReminder = {
      id: `med_${Date.now()}`,
      medName: medName.trim(),
      dosage: dosage.trim(),
      time: time.trim(),
      active: true
    };

    // Schedule notification trigger
    const notificationId = await scheduleMedicineReminder(newReminder);
    if (notificationId) {
      newReminder.notificationId = notificationId;
    }

    const updated = [...reminders, newReminder];
    await saveReminders(updated);

    // Clear form inputs
    setMedName('');
    setDosage('');
    setTime('');
    Alert.alert('Reminder Added', `Daily medicine reminder scheduled at ${newReminder.time}.`);
  };

  const handleToggleReminder = async (id: string, val: boolean) => {
    const updated = await Promise.all(reminders.map(async (rem) => {
      if (rem.id === id) {
        if (val) {
          // Re-schedule
          const notificationId = await scheduleMedicineReminder(rem);
          return { ...rem, active: true, notificationId };
        } else {
          // Cancel
          if (rem.notificationId) {
            await cancelMedicineReminder(rem.notificationId);
          }
          return { ...rem, active: false, notificationId: undefined };
        }
      }
      return rem;
    }));
    await saveReminders(updated);
  };

  const handleDeleteReminder = async (id: string) => {
    const target = reminders.find(r => r.id === id);
    if (target && target.notificationId) {
      await cancelMedicineReminder(target.notificationId);
    }
    const filtered = reminders.filter(r => r.id !== id);
    await saveReminders(filtered);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#08080a' : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        
        {/* Scheduled List */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>Medication Registry & Schedule</Text>
        <Text style={[styles.sectionSubtitle, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]}>
          Keep track of daily medications and get repeating push alert reminders.
        </Text>

        <View style={{ gap: 12, marginBottom: 24 }}>
          {reminders.length === 0 ? (
            <Surface style={[styles.emptyState, { backgroundColor: isDark ? '#111216' : '#fff' }]} elevation={1}>
              <MaterialCommunityIcons name="pill" size={32} color={Colors.slate[500]} />
              <Text style={{ color: isDark ? Colors.slate[400] : Colors.slate[500], fontSize: 13, marginTop: 8 }}>
                No active medicine reminders configured.
              </Text>
            </Surface>
          ) : (
            reminders.map((rem) => (
              <Animated.View key={rem.id} layout={Layout.springify()}>
                <Card style={{ backgroundColor: isDark ? '#111216' : '#fff' }} mode="contained">
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="pill" size={16} color={Colors.teal[600]} />
                        <Text style={[styles.medName, { color: isDark ? '#fff' : Colors.slate[800] }]}>{rem.medName}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: isDark ? Colors.slate[400] : Colors.slate[600], marginTop: 2 }}>
                        Dosage: {rem.dosage} · Scheduled: {rem.time}
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Switch 
                        value={rem.active} 
                        onValueChange={(val) => handleToggleReminder(rem.id, val)}
                        color={Colors.teal[600]} 
                      />
                      <IconButton 
                        icon="trash-can-outline" 
                        iconColor={Colors.rose[600]} 
                        size={18} 
                        onPress={() => handleDeleteReminder(rem.id)} 
                      />
                    </View>
                  </Card.Content>
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        {/* Add Reminder Form */}
        <Surface style={[styles.formCard, { backgroundColor: isDark ? '#111216' : '#fff' }]} elevation={1}>
          <Text style={[styles.formTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>Schedule New Reminder</Text>
          <View style={{ gap: 12, marginTop: 14 }}>
            <TextInput
              label="Medicine Name (e.g., Paracetamol)"
              value={medName}
              onChangeText={setMedName}
              mode="outlined"
              activeOutlineColor={Colors.teal[600]}
              style={{ backgroundColor: isDark ? '#121214' : '#fff' }}
              textColor={isDark ? '#fff' : '#000'}
            />
            <TextInput
              label="Dosage Instruction (e.g., 1 tablet after food)"
              value={dosage}
              onChangeText={setDosage}
              mode="outlined"
              activeOutlineColor={Colors.teal[600]}
              style={{ backgroundColor: isDark ? '#121214' : '#fff' }}
              textColor={isDark ? '#fff' : '#000'}
            />
            <TextInput
              label="Reminder Time (24h format HH:MM, e.g., 08:30)"
              value={time}
              onChangeText={setTime}
              mode="outlined"
              activeOutlineColor={Colors.teal[600]}
              placeholder="08:00"
              style={{ backgroundColor: isDark ? '#121214' : '#fff' }}
              textColor={isDark ? '#fff' : '#000'}
            />
            <Button 
              mode="contained" 
              onPress={handleAddReminder} 
              style={{ backgroundColor: Colors.teal[600], borderRadius: 12, marginTop: 8 }}
            >
              Add Reminder Schedule
            </Button>
          </View>
        </Surface>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  cardInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'transparent',
  },
  formTitle: {
    fontSize: 14.5,
    fontWeight: '900',
  },
});
