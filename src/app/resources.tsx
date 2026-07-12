import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, TextInput,
  TouchableOpacity, Linking, Alert, FlatList,
} from 'react-native';
import {
  Text, Surface, Chip, Card, IconButton, Badge, useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../theme';
import healthcareData from '../data/healthcare_data.json';
import { HealthcareFacility } from '../types';
import { useTranslation } from '../localization';

type FacilityType = 'All' | 'Hospital' | 'Pharmacy' | 'Clinic';

const TYPE_BADGES: Record<string, { bg: string; text: string; icon: string }> = {
  Hospital: { bg: '#fee2e2', text: '#ef4444', icon: 'hospital-building' },
  Pharmacy: { bg: '#d1fae5', text: '#10b981', icon: 'pill' },
  Clinic: { bg: '#dbeafe', text: '#3b82f6', icon: 'office-building' },
};

export default function ResourcesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [search, setSearch] = useState('');
  const [type, setType] = useState<FacilityType>('All');
  const [minRating, setMinRating] = useState(0);
  const [facilities, setFacilities] = useState<HealthcareFacility[]>([]);

  useEffect(() => {
    // Process JSON data to fit HealthcareFacility type
    const processed: HealthcareFacility[] = (healthcareData as any[]).map(item => ({
      id: item.id,
      name: item.name,
      type: item.type || 'Hospital',
      ownership: item.ownership || 'private',
      address: item.address,
      phone: item.phone,
      rating: item.rating || 4.5,
      reviewCount: item.reviewCount || 100,
      coordinates: item.coordinates || { lat: 20.26, lng: 85.84 },
      isOpen: item.isOpen ?? true,
      openUntil: item.openUntil || '24hrs',
      verified: item.verified ?? true,
      services: item.services || [],
      place_id: item.place_id,
    }));
    setFacilities(processed);
  }, []);

  const filtered = facilities
    .filter(f =>
      (type === 'All' || f.type === type) &&
      (minRating === 0 || f.rating >= minRating) &&
      (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b.rating - a.rating);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Unable to make call.'));
  };

  const handleMaps = (name: string, address: string) => {
    const query = encodeURIComponent(`${name} ${address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
      .catch(() => Alert.alert('Error', 'Unable to open maps.'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      {/* Search and Filters */}
      <Surface style={[styles.searchBarContainer, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={2}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDark ? '#18181b' : '#f1f5f9' }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={isDark ? Colors.slate[500] : Colors.slate[400]} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchClinicsPlaceholder') || 'Search hospitals & clinics...'}
            placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
            style={[styles.searchInput, { color: isDark ? '#fff' : '#000' }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close" size={18} color={isDark ? Colors.slate[400] : Colors.slate[500]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Facility type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {['All', 'Hospital', 'Pharmacy', 'Clinic'].map(t => (
            <Chip
              key={t}
              selected={type === t}
              onPress={() => setType(t as any)}
              style={[styles.categoryChip, type === t && { backgroundColor: Colors.teal[600] }]}
              textStyle={{ color: type === t ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 12, fontWeight: '700' }}
              showSelectedCheck={false}
            >
              {t}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {/* Facilities List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
            <Card style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff', borderTopColor: item.isOpen ? Colors.emerald[500] : Colors.slate[400] }]} mode="contained">
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIconBox, { backgroundColor: (TYPE_BADGES[item.type]?.bg || Colors.teal[50]) }]}>
                    <MaterialCommunityIcons
                      name={(TYPE_BADGES[item.type]?.icon || 'hospital-building') as any}
                      size={20}
                      color={TYPE_BADGES[item.type]?.text || Colors.teal[600]}
                    />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Chip compact style={{ backgroundColor: item.isOpen ? Colors.emerald[500] : (isDark ? Colors.slate[800] : Colors.slate[200]) }} textStyle={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                      {item.isOpen ? 'OPEN 24/7' : 'CLOSED NOW'}
                    </Chip>
                    <View style={styles.ratingBadge}>
                      <MaterialCommunityIcons name="star" size={12} color={Colors.amber[500]} />
                      <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={[styles.facilityName, { color: isDark ? '#fff' : Colors.slate[800] }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.verified && (
                      <MaterialCommunityIcons name="check-circle" size={14} color={Colors.emerald[500]} />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <Chip compact style={{ backgroundColor: isDark ? '#18181b' : Colors.teal[50] }} textStyle={{ color: Colors.teal[700], fontSize: 9, fontWeight: '700' }}>
                      {item.type.toUpperCase()}
                    </Chip>
                    <Text style={{ fontSize: 11, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>
                      <MaterialCommunityIcons name="map-marker" size={11} /> Bhubaneswar
                    </Text>
                  </View>
                  <Text style={[styles.facilityAddress, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: isDark ? Colors.slate[800] : Colors.slate[100] }]}>
                  <Text style={{ fontSize: 11, color: isDark ? Colors.slate[500] : Colors.slate[400] }}>
                    {item.reviewCount.toLocaleString()} certified reviews
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => handleCall(item.phone)} style={[styles.actionBtn, { backgroundColor: isDark ? '#1c2e29' : Colors.teal[50] }]}>
                      <MaterialCommunityIcons name="phone" size={16} color={Colors.teal[600]} />
                      <Text style={{ color: Colors.teal[700], fontSize: 11, fontWeight: '700' }}>CALL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMaps(item.name, item.address)} style={[styles.actionBtn, { backgroundColor: Colors.teal[600] }]}>
                      <MaterialCommunityIcons name="navigation" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>MAPS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </Animated.View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="hospital-marker" size={48} color={isDark ? Colors.slate[700] : Colors.slate[300]} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>No facilities found</Text>
            <Text style={{ color: isDark ? Colors.slate[500] : Colors.slate[400], textAlign: 'center', fontSize: 13, marginTop: 4 }}>
              Try a different search term or category
            </Text>
          </View>
        )}
      />

      {/* Global emergency call CTA */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL('tel:112')} style={styles.emergencyBar}>
        <View style={styles.emergencyBarIcon}>
          <MaterialCommunityIcons name="ambulance" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emergencyBarTitle}>EMERGENCY SUPPORT</Text>
          <Text style={styles.emergencyBarSub}>TAP TO CALL AMBULANCE · 112</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, height: 44, paddingVertical: 0 },
  categoryScroll: { gap: 8, paddingVertical: 4 },
  categoryChip: { borderRadius: 20 },
  card: { borderRadius: 24, overflow: 'hidden', borderTopWidth: 4, marginBottom: 12 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  typeIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: Colors.amber[600], fontSize: 11, fontWeight: '700' },
  detailsBox: { marginVertical: 12 },
  facilityName: { fontSize: 15, fontWeight: '800', flex: 1 },
  facilityAddress: { fontSize: 12, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, paddingTop: 12, marginTop: 4 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 12 },
  emergencyBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.rose[600], borderRadius: 20, marginHorizontal: 16, marginBottom: 8, gap: 12, elevation: 4 },
  emergencyBarIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  emergencyBarTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  emergencyBarSub: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700', marginTop: 1 },
});
