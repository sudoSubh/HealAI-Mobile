import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, useColorScheme, KeyboardAvoidingView,
  Platform, TextInput, TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { Text, Surface, IconButton, ActivityIndicator, Menu, Chip, useTheme, Portal, Dialog, RadioButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Colors } from '../../theme';
import { generateMedicalResponse, generateMedicalResponseWithImage, MEDICAL_CONTEXT } from '../../services/medicalBotService';
import { useTranslation } from '../../localization';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  image?: string;
  feedback?: 'positive' | 'negative';
}

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  type: 'bot',
  content: "Hello! I'm your HealAI medical assistant. How can I help you with your health questions today?",
  timestamp: new Date(),
};

export default function ChatScreen() {
  const { t, locale } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getSelectedLanguageName = () => {
    switch (speakLang) {
      case 'hi-IN': return 'Hindi';
      case 'bn-IN': return 'Bengali';
      case 'te-IN': return 'Telugu';
      case 'mr-IN': return 'Marathi';
      case 'ta-IN': return 'Tamil';
      case 'gu-IN': return 'Gujarati';
      case 'kn-IN': return 'Kannada';
      case 'or-IN': return 'Odia';
      case 'ml-IN': return 'Malayalam';
      case 'pa-IN': return 'Punjabi';
      default: return 'English';
    }
  };

  const INITIAL_MESSAGE: Message = {
    id: 'initial',
    type: 'bot',
    content: t('welcome') + ". How can I help you with your health questions today?",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollRef = useRef<FlatList>(null);
  const activeAudioRef = useRef<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [speakLang, setSpeakLang] = useState('en-US');
  const [speakLangMenuVisible, setSpeakLangMenuVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const SPEAK_LANGUAGES = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)' },
    { code: 'mr-IN', name: 'मराठी (Marathi)' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'or-IN', name: 'ଓଡ଼ਿଆ (Odia)' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  ];

  // Sync speakLang default with active app locale
  useEffect(() => {
    switch (locale) {
      case 'hi': setSpeakLang('hi-IN'); break;
      case 'bn': setSpeakLang('bn-IN'); break;
      case 'te': setSpeakLang('te-IN'); break;
      case 'mr': setSpeakLang('mr-IN'); break;
      case 'ta': setSpeakLang('ta-IN'); break;
      case 'gu': setSpeakLang('gu-IN'); break;
      case 'kn': setSpeakLang('kn-IN'); break;
      case 'or': setSpeakLang('or-IN'); break;
      case 'ml': setSpeakLang('ml-IN'); break;
      case 'pa': setSpeakLang('pa-IN'); break;
      default: setSpeakLang('en-US'); break;
    }
  }, [locale]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      Alert.alert(
        'Speech Recognition Fallback',
        'Voice input relies on the browser Speech API. To type with voice on native devices, please tap the microphone key on your device keyboard.'
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speakLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await generateMedicalResponse(input, MEDICAL_CONTEXT, getSelectedLanguageName());
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response || "I couldn't process that request. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const base64 = result.assets[0].base64;
      const userMsg: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: "I've uploaded a medical image for analysis",
        timestamp: new Date(),
        image: `data:image/jpeg;base64,${base64}`,
      };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const response = await generateMedicalResponseWithImage(
          base64,
          'Analyze this medical image and provide insights about: 1) What it shows 2) Any concerns 3) Recommendations.',
          MEDICAL_CONTEXT,
          getSelectedLanguageName()
        );
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response || "I couldn't analyze the image. Please try again.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
      } catch (err: any) {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Image analysis failed: ${err?.message || 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const detectLanguageCode = (text: string): string => {
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
    if (/[\u0B00-\u0B7F]/.test(text)) return 'od-IN'; // Corrected Odia to od-IN
    return 'en-IN';
  };

  const runSpeechFallback = (text: string, langCode: string) => {
    Speech.speak(text, {
      rate: 0.9,
      pitch: 1.05,
      language: langCode,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const speakMessage = async (msg: Message) => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (e) {
        console.error('Failed to pause active audio:', e);
      }
    }
    Speech.stop();

    if (speakingId === msg.id) {
      setSpeakingId(null);
      return;
    }

    const cleanText = msg.content
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
      .replace(/#{1,6}\s?/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/>\s?/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim()
      .slice(0, 2000); // Truncate to comply with Sarvam AI 2,500 char limit

    const targetLang = detectLanguageCode(cleanText);

    // If cleanText is empty (e.g. only had emojis), use original content or fallback directly
    if (!cleanText.trim()) {
      console.warn('[HealAI] Cleaned text is empty, falling back to original message content');
      setSpeakingId(msg.id);
      runSpeechFallback(msg.content, targetLang);
      return;
    }

    setSpeakingId(msg.id);

    if (typeof Audio !== 'undefined') {
      try {
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': 'sk_neut7561_F5syoe4scIIPlKc86f8rZbE0'
          },
          body: JSON.stringify({
            text: cleanText,
            target_language_code: targetLang,
            model: 'bulbul:v3',
            speaker: 'shubh'
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('[HealAI] Sarvam TTS API error details:', errText);
          throw new Error(`Sarvam TTS returned status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data && data.audios && data.audios[0]) {
          const audioUrl = `data:audio/wav;base64,${data.audios[0]}`;
          const playback = new Audio(audioUrl);
          activeAudioRef.current = playback;
          
          playback.onended = () => {
            setSpeakingId(null);
            activeAudioRef.current = null;
          };

          playback.onerror = () => {
            console.warn('Playback error with Sarvam Audio, falling back...');
            runSpeechFallback(cleanText, targetLang);
          };

          await playback.play();
          return;
        }
      } catch (err) {
        console.warn('Sarvam TTS API failed, falling back:', err);
      }
    }

    runSpeechFallback(cleanText, targetLang);

  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Save chat history and start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([INITIAL_MESSAGE]) },
    ]);
  };

  const handleFeedback = (msgId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback } : m));
  };

  const formatMarkdownSimple = (text: string): string => {
    return text
      .replace(/## (.*)/g, '📋 $1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/> (.*)/g, '⚠️ $1');
  };

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isUser = item.type === 'user';
    return (
      <Animated.View entering={FadeInDown.delay(50).duration(300)} style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: Colors.teal[600] }]}>
            <MaterialCommunityIcons name="robot" size={16} color="#fff" />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: Colors.teal[600] }]
            : [styles.bubbleBot, { backgroundColor: isDark ? '#18181b' : '#f0fdf4', borderColor: isDark ? '#27272a' : Colors.teal[100] }]
        ]}>
          {item.image && (
            <View style={styles.imagePreview}>
              <MaterialCommunityIcons name="image" size={24} color={isUser ? '#fff' : Colors.teal[600]} />
              <Text style={{ color: isUser ? 'rgba(255,255,255,0.8)' : Colors.slate[500], fontSize: 11 }}>Image uploaded</Text>
            </View>
          )}
          <Text style={[
            styles.msgText,
            { color: isUser ? '#fff' : (isDark ? Colors.slate[200] : Colors.slate[700]) }
          ]}>
            {isUser ? item.content : formatMarkdownSimple(item.content)}
          </Text>
          <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.5)' : (isDark ? Colors.slate[600] : Colors.slate[400]) }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>

          {/* Bot actions */}
          {!isUser && item.id !== 'initial' && (
            <View style={styles.botActions}>
              <TouchableOpacity onPress={() => speakMessage(item)} style={styles.actionBtn}>
                <MaterialCommunityIcons
                  name={speakingId === item.id ? 'stop' : 'volume-high'}
                  size={16}
                  color={isDark ? Colors.slate[400] : Colors.slate[500]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFeedback(item.id, 'positive')}
                style={[styles.actionBtn, item.feedback === 'positive' && { backgroundColor: Colors.teal[50] }]}
              >
                <MaterialCommunityIcons name="thumb-up" size={14} color={item.feedback === 'positive' ? Colors.teal[600] : (isDark ? Colors.slate[500] : Colors.slate[400])} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleFeedback(item.id, 'negative')}
                style={[styles.actionBtn, item.feedback === 'negative' && { backgroundColor: Colors.rose[50] }]}
              >
                <MaterialCommunityIcons name="thumb-down" size={14} color={item.feedback === 'negative' ? Colors.rose[600] : (isDark ? Colors.slate[500] : Colors.slate[400])} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isUser && (
          <View style={[styles.avatar, { backgroundColor: Colors.violet[600] }]}>
            <MaterialCommunityIcons name="account" size={16} color="#fff" />
          </View>
        )}
      </Animated.View>
    );
  }, [isDark, speakingId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={2}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: Colors.teal[600] }]}>
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : Colors.slate[800] }]}>{t('chatHeader')}</Text>
            <TouchableOpacity onPress={() => setSpeakLangMenuVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MaterialCommunityIcons name="microphone" size={12} color={Colors.teal[600]} />
              <Text style={{ fontSize: 11, color: Colors.teal[600], fontWeight: '700' }}>
                Speak: {SPEAK_LANGUAGES.find(l => l.code === speakLang)?.name} ▾
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton icon="delete-outline" size={20} iconColor={isDark ? Colors.slate[400] : Colors.slate[500]} onPress={clearChat} />
        </View>
      </Surface>

      {/* Messages */}
      <FlatList
        ref={scrollRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={[styles.typingRow, { backgroundColor: isDark ? '#18181b' : '#f0fdf4' }]}>
          <ActivityIndicator size="small" color={Colors.teal[600]} />
          <Text style={{ fontSize: 12, color: isDark ? Colors.slate[400] : Colors.slate[500], marginLeft: 8 }}>
            {t('thinking')}
          </Text>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <Surface style={[styles.inputBar, { backgroundColor: isDark ? '#121214' : '#fff' }]} elevation={4}>
          <TouchableOpacity onPress={handleImageUpload} style={[styles.inputAction, { backgroundColor: isDark ? '#27272a' : Colors.teal[50] }]}>
            <MaterialCommunityIcons name="image-plus" size={20} color={Colors.teal[600]} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={startListening} 
            style={[
              styles.inputAction, 
              { backgroundColor: isListening ? Colors.rose[500] + '20' : (isDark ? '#27272a' : Colors.teal[50]) }
            ]}
          >
            <MaterialCommunityIcons 
              name={isListening ? "microphone" : "microphone-outline"} 
              size={20} 
              color={isListening ? Colors.rose[500] : Colors.teal[600]} 
            />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('chatPlaceholder')}
            placeholderTextColor={isDark ? Colors.slate[600] : Colors.slate[400]}
            style={[styles.textInput, { color: isDark ? '#fff' : Colors.slate[800], backgroundColor: isDark ? '#18181b' : Colors.slate[50] }]}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || isTyping}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? Colors.teal[600] : (isDark ? Colors.slate[700] : Colors.slate[200]) }]}
          >
            <MaterialCommunityIcons name="send" size={18} color={input.trim() ? '#fff' : (isDark ? Colors.slate[500] : Colors.slate[400])} />
          </TouchableOpacity>
        </Surface>
      </KeyboardAvoidingView>
      {/* Speech Language Selection Dialog */}
      <Portal>
        <Dialog visible={speakLangMenuVisible} onDismiss={() => setSpeakLangMenuVisible(false)} style={{ backgroundColor: isDark ? '#121214' : '#fff', borderRadius: 24 }}>
          <Dialog.Title style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#fff' : Colors.slate[800] }}>
            Choose Speaking Language
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350, paddingHorizontal: 0 }}>
            <ScrollView>
              <RadioButton.Group onValueChange={(val) => { setSpeakLang(val); setSpeakLangMenuVisible(false); }} value={speakLang}>
                {SPEAK_LANGUAGES.map((lang) => (
                  <View key={lang.code}>
                    <TouchableOpacity 
                      onPress={() => { setSpeakLang(lang.code); setSpeakLangMenuVisible(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 24 }}
                    >
                      <Text style={{ fontSize: 14, color: isDark ? '#fff' : Colors.slate[700], fontWeight: speakLang === lang.code ? '700' : '400' }}>
                        {lang.name}
                      </Text>
                      <RadioButton value={lang.code} color={Colors.teal[600]} uncheckedColor={isDark ? Colors.slate[700] : Colors.slate[300]} />
                    </TouchableOpacity>
                    <Divider />
                  </View>
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 16 },
  msgRowUser: { flexDirection: 'row', justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12, paddingBottom: 6 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { borderBottomLeftRadius: 4, borderWidth: 0.5 },
  msgText: { fontSize: 14, lineHeight: 20 },
  timestamp: { fontSize: 9, marginTop: 4, textAlign: 'right' },
  imagePreview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  botActions: { flexDirection: 'row', gap: 4, marginTop: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 6 },
  actionBtn: { padding: 4, borderRadius: 8 },
  typingRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.06)' },
  inputAction: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
