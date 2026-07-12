import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, TextInput,
  TouchableOpacity, Image, Linking, FlatList, Alert,
} from 'react-native';
import {
  Text, Surface, Chip, Card, IconButton, Divider, useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors } from '../theme';
import { useTranslation } from '../localization';

type Category = 'All' | 'Prevention' | 'Nutrition' | 'Mental Health' | 'Maternal' | 'Seasonal' | 'Govt Schemes';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  readTime: number;
  author: string;
  image: string;
  url: string;
  verified: boolean;
  featured?: boolean;
}

interface Video {
  id: string;
  title: string;
  duration: string;
  source: string;
  thumbnail: string;
  url: string;
}

const ARTICLES: Article[] = [
  {
    id: '1',
    title: '10 Daily Habits That Prevent Lifestyle Diseases',
    excerpt: 'Small changes in your daily routine can dramatically reduce your risk of diabetes, hypertension, and heart disease. Learn the science-backed habits Indian doctors recommend.',
    category: 'Prevention',
    readTime: 7,
    author: 'WHO India',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    url: 'https://www.who.int/news-room/fact-sheets/detail/noncommunicable-diseases',
    verified: true,
    featured: true,
  },
  {
    id: '2',
    title: 'Complete Indian Diet Guide for Type 2 Diabetes',
    excerpt: 'A culturally relevant guide covering dal, roti, rice and how to eat balanced Indian meals while managing blood sugar effectively.',
    category: 'Nutrition',
    readTime: 12,
    author: 'ICMR',
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80',
    url: 'https://www.icmr.nic.in/content/dietary-guidelines-indians',
    verified: true,
  },
  {
    id: '3',
    title: 'Managing Anxiety With Pranayama & Meditation',
    excerpt: 'Combine ancient Indian breathing techniques with modern mindfulness for lasting mental wellness and stress reduction.',
    category: 'Mental Health',
    readTime: 8,
    author: 'NIMHANS',
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&q=80',
    url: 'https://nimhans.ac.in/mental-health/',
    verified: true,
  },
  {
    id: '4',
    title: 'Safe Pregnancy: A Trimester-by-Trimester Guide',
    excerpt: 'Essential guidance for expectant mothers in India — covering nutrition, safe exercises, warning signs and postnatal care.',
    category: 'Maternal',
    readTime: 15,
    author: 'Ministry of Health',
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80',
    url: 'https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=819&lid=221',
    verified: true,
  },
  {
    id: '5',
    title: 'Monsoon Health: Preventing Dengue & Malaria',
    excerpt: 'Essential preventive measures every Indian household should know during monsoon season to stay safe from vector-borne diseases.',
    category: 'Seasonal',
    readTime: 6,
    author: 'NVBDCP India',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    url: 'https://nvbdcp.gov.in/index4.php?lang=1&level=0&linkid=431&lid=3782',
    verified: true,
  },
  {
    id: '6',
    title: 'Ayushman Bharat PM-JAY: Your Complete Guide',
    excerpt: 'How to enrol, check eligibility and use India\'s flagship health insurance scheme that covers 50 crore citizens.',
    category: 'Govt Schemes',
    readTime: 9,
    author: 'NHA India',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    url: 'https://pmjay.gov.in/',
    verified: true,
  },
  {
    id: '7',
    title: 'Vitamin D Deficiency: The Silent Indian Epidemic',
    excerpt: 'Despite abundant sunshine, over 70% of Indians are vitamin D deficient. Here\'s why it matters and how to fix it naturally.',
    category: 'Prevention',
    readTime: 5,
    author: 'AIIMS Delhi',
    image: 'https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?w=800&q=80',
    url: 'https://www.aiims.edu/en/departments/medicine.html',
    verified: true,
  },
  {
    id: '8',
    title: 'Heart-Healthy Superfoods Found in Indian Kitchens',
    excerpt: 'Turmeric, amla, flaxseeds and more — discover how everyday Indian ingredients can protect your cardiovascular health.',
    category: 'Nutrition',
    readTime: 6,
    author: 'Cardiology Society of India',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    url: 'https://www.csi.org.in/',
    verified: false,
  },
  {
    id: '9',
    title: 'Childhood Vaccinations: India\'s Immunisation Schedule',
    excerpt: 'Everything parents need to know about the Universal Immunisation Programme — vaccines, timing, and where to get them free.',
    category: 'Maternal',
    readTime: 10,
    author: 'MoHFW India',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
    url: 'https://main.mohfw.gov.in/',
    verified: true,
  },
];

const VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'How to Read Your Blood Test Report',
    duration: '14:32',
    source: 'AIIMS Delhi',
    thumbnail: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&q=80',
    url: 'https://www.youtube.com/results?search_query=blood+test+report+explained+India',
  },
  {
    id: 'v2',
    title: 'Yoga for Beginners — Full Body Session',
    duration: '22:15',
    source: 'Ministry of Ayush',
    thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    url: 'https://yoga.ayush.gov.in/',
  },
  {
    id: 'v3',
    title: 'Dengue Prevention — Government Campaign',
    duration: '8:44',
    source: 'NVBDCP',
    thumbnail: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=600&q=80',
    url: 'https://www.youtube.com/results?search_query=dengue+prevention+India+government',
  },
  {
    id: 'v4',
    title: 'Mental Health Awareness for Youth',
    duration: '18:20',
    source: 'NIMHANS',
    thumbnail: 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=600&q=80',
    url: 'https://nimhans.ac.in/',
  },
  {
    id: 'v5',
    title: 'Safe Medicine Usage at Home',
    duration: '11:05',
    source: 'CDSCO',
    thumbnail: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80',
    url: 'https://cdsco.gov.in/',
  },
];

const CATEGORIES: { label: Category; icon: string; color: string }[] = [
  { label: 'All', icon: 'trending-up', color: Colors.teal[600] },
  { label: 'Prevention', icon: 'shield-check', color: Colors.teal[600] },
  { label: 'Nutrition', icon: 'food-apple', color: Colors.amber[600] },
  { label: 'Mental Health', icon: 'brain', color: Colors.violet[600] },
  { label: 'Maternal', icon: 'heart', color: Colors.rose[600] },
  { label: 'Seasonal', icon: 'weather-sunny', color: Colors.blue[600] },
  { label: 'Govt Schemes', icon: 'office-building', color: Colors.emerald[600] },
];

export default function EducationHub() {
  const SHOW_DISCLAIMERS = false;
  const { t } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem('bookmarkedArticles');
      if (saved) setBookmarks(JSON.parse(saved));
    } catch {}
  };

  const toggleBookmark = async (id: string) => {
    const updated = bookmarks.includes(id)
      ? bookmarks.filter(b => b !== id)
      : [...bookmarks, id];
    setBookmarks(updated);
    await AsyncStorage.setItem('bookmarkedArticles', JSON.stringify(updated));
  };

  const filtered = ARTICLES.filter(a =>
    (category === 'All' || a.category === category) &&
    (!search || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase()))
  );

  const featured = filtered.find(a => a.featured) || filtered[0];
  const rest = filtered.filter(a => a.id !== featured?.id);

  const handleLaunch = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open link.'));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      {/* Search and Category Pill Bar */}
      <Surface style={[styles.searchBarContainer, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={2}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDark ? '#18181b' : '#f1f5f9' }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={isDark ? Colors.slate[500] : Colors.slate[400]} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchArticles') || 'Search articles...'}
            placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
            style={[styles.searchInput, { color: isDark ? '#fff' : '#000' }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close" size={18} color={isDark ? Colors.slate[400] : Colors.slate[500]} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <Chip
              key={cat.label}
              selected={category === cat.label}
              onPress={() => setCategory(cat.label)}
              style={[styles.categoryChip, category === cat.label && { backgroundColor: Colors.teal[600] }]}
              textStyle={{ color: category === cat.label ? '#fff' : (isDark ? Colors.slate[300] : Colors.slate[600]), fontSize: 12, fontWeight: '700' }}
              showSelectedCheck={false}
              icon={({ size, color }) => <MaterialCommunityIcons name={cat.icon as any} size={size} color={category === cat.label ? '#fff' : cat.color} />}
            >
              {cat.label}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {/* Featured Article */}
        {featured && (
          <Animated.View entering={FadeInDown.duration(500)}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => handleLaunch(featured.url)}>
              <Card style={styles.featuredCard} mode="contained">
                <Image source={{ uri: featured.image }} style={styles.featuredImage} resizeMode="cover" />
                <View style={styles.featuredOverlay} />
                {featured.verified && (
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="shield-check" size={12} color="#fff" />
                    <Text style={styles.verifiedText}>Gov. Verified</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => toggleBookmark(featured.id)} style={styles.bookmarkBtn}>
                  <MaterialCommunityIcons
                    name={bookmarks.includes(featured.id) ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={bookmarks.includes(featured.id) ? Colors.amber[500] : '#fff'}
                  />
                </TouchableOpacity>

                <View style={styles.featuredContent}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <Chip compact style={{ backgroundColor: Colors.teal[600] }} textStyle={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {featured.category}
                    </Chip>
                    <Text style={styles.readTimeText}>
                      <MaterialCommunityIcons name="clock" size={10} /> {featured.readTime} min read
                    </Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featured.title}</Text>
                  <Text style={styles.featuredExcerpt} numberOfLines={2}>{featured.excerpt}</Text>
                  <View style={styles.authorRow}>
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorAvatarText}>{featured.author.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{featured.author}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Regular Articles */}
        {rest.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('articlesTitle') || 'Articles'}</Text>
            {rest.map((article, i) => (
              <Animated.View key={article.id} entering={FadeInDown.delay(i * 100).duration(400)}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleLaunch(article.url)}>
                  <Card style={[styles.card, { backgroundColor: isDark ? '#121214' : '#fff' }]} mode="contained">
                    <View style={{ flexDirection: 'row' }}>
                      <Image source={{ uri: article.image }} style={styles.cardImage} resizeMode="cover" />
                      <View style={styles.cardContent}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip compact style={{ backgroundColor: isDark ? '#18181b' : Colors.teal[50] }} textStyle={{ color: Colors.teal[700], fontSize: 9, fontWeight: '700' }}>
                            {article.category}
                          </Chip>
                          <Text style={[styles.cardReadTime, { color: isDark ? Colors.slate[500] : Colors.slate[400] }]}>
                            {article.readTime} min
                          </Text>
                        </View>
                        <Text style={[styles.cardTitleText, { color: isDark ? '#fff' : Colors.slate[800] }]} numberOfLines={2}>
                          {article.title}
                        </Text>
                        <Text style={[styles.cardExcerpt, { color: isDark ? Colors.slate[400] : Colors.slate[500] }]} numberOfLines={2}>
                          {article.excerpt}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Video Section */}
        <View style={{ marginTop: 24, marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('healthVideosTitle') || 'Health Videos'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {VIDEOS.map((video, i) => (
              <Animated.View key={video.id} entering={FadeInDown.delay(i * 100).duration(400)}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleLaunch(video.url)}>
                  <Card style={[styles.videoCard, { backgroundColor: isDark ? '#121214' : '#fff' }]} mode="contained">
                    <View style={styles.videoThumbnailContainer}>
                      <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
                      <View style={styles.videoOverlay} />
                      <View style={styles.playIconBox}>
                        <MaterialCommunityIcons name="play" size={24} color="#fff" />
                      </View>
                      <View style={styles.videoDurationBadge}>
                        <Text style={styles.videoDurationText}>{video.duration}</Text>
                      </View>
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text style={[styles.videoTitleText, { color: isDark ? '#fff' : Colors.slate[800] }]} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: Colors.rose[500], fontWeight: '700', marginTop: 4 }}>
                        {video.source}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Disclaimer */}
        {SHOW_DISCLAIMERS && (
          <Surface style={[styles.disclaimerBox, { backgroundColor: isDark ? '#18181b' : Colors.teal[50] }]} elevation={0}>
            <MaterialCommunityIcons name="shield-check" size={16} color={Colors.teal[700]} />
            <Text style={{ fontSize: 11, color: Colors.teal[800], flex: 1, lineHeight: 16 }}>
              Disclaimer: Articles and videos on this page redirect to official government, WHO, and health authority websites. Always consult a licensed physician.
            </Text>
          </Surface>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  featuredCard: { height: 260, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  verifiedBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.emerald[600], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bookmarkBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  featuredContent: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  readTimeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  featuredTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginVertical: 4, lineHeight: 22 },
  featuredExcerpt: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  authorAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderStyle: 'solid', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  authorAvatarText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  cardImage: { width: 100, height: 110 },
  cardContent: { flex: 1, padding: 10, justifyContent: 'space-between' },
  cardReadTime: { fontSize: 10 },
  cardTitleText: { fontSize: 13, fontWeight: '700', marginVertical: 4 },
  cardExcerpt: { fontSize: 11, lineHeight: 15 },
  videoCard: { width: 220, borderRadius: 16, overflow: 'hidden' },
  videoThumbnailContainer: { height: 120, position: 'relative' },
  videoThumbnail: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  playIconBox: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -18 }, { translateY: -18 }], width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderStyle: 'solid', borderWidth: 1.5, borderColor: '#fff' },
  videoDurationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  videoDurationText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  videoTitleText: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  disclaimerBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, marginTop: 20 },
});
