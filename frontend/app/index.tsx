import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Dimensions,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface AnalysisResult {
  is_safe: boolean;
  confidence: number;
  flagged_categories: string[];
  analysis_details: any;
  timestamp: string;
}

interface FilterSettings {
  user_id: string;
  categories: {
    inappropriate_content: boolean;
    fake_news: boolean;
    violence: boolean;
    adult_content: boolean;
    hate_speech: boolean;
    misinformation: boolean;
    clickbait: boolean;
    spam: boolean;
  };
  strictness_level: string;
  custom_keywords: string[];
  whitelist_domains: string[];
  blacklist_domains: string[];
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-safeguard.preview.emergentagent.com';

export default function ContentSafeguardApp() {
  // State management
  const [activeTab, setActiveTab] = useState('analyze');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    user_id: 'default_user',
    categories: {
      inappropriate_content: true,
      fake_news: true,
      violence: true,
      adult_content: true,
      hate_speech: true,
      misinformation: true,
      clickbait: true,
      spam: true
    },
    strictness_level: 'moderate',
    custom_keywords: [],
    whitelist_domains: [],
    blacklist_domains: []
  });
  const [stats, setStats] = useState<any>(null);
  const [customKeyword, setCustomKeyword] = useState('');

  // Load settings and stats on app start
  useEffect(() => {
    loadFilterSettings();
    loadStats();
  }, []);

  const loadFilterSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/filter-settings/default_user`);
      if (response.ok) {
        const settings = await response.json();
        setFilterSettings(settings);
      }
    } catch (error) {
      console.error('Error loading filter settings:', error);
    }
  };

  const saveFilterSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/filter-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filterSettings),
      });

      if (response.ok) {
        Alert.alert('Success', 'Filter settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving filter settings:', error);
      Alert.alert('Error', 'Failed to save filter settings');
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const analyzeContent = async () => {
    if (!inputText.trim() && !selectedImage && !inputUrl.trim()) {
      Alert.alert('Error', 'Please provide some content to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const requestBody: any = {};

      if (inputText.trim() && selectedImage && inputUrl.trim()) {
        requestBody.content_type = 'mixed';
        requestBody.text = inputText.trim();
        requestBody.image_base64 = selectedImage;
        requestBody.url = inputUrl.trim();
      } else if (inputText.trim()) {
        requestBody.content_type = 'text';
        requestBody.text = inputText.trim();
      } else if (selectedImage) {
        requestBody.content_type = 'image';
        requestBody.image_base64 = selectedImage;
      } else if (inputUrl.trim()) {
        requestBody.content_type = 'url';
        requestBody.url = inputUrl.trim();
      }

      const response = await fetch(`${BACKEND_URL}/api/analyze-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      
      // Reload stats after analysis
      loadStats();

    } catch (error) {
      console.error('Error analyzing content:', error);
      Alert.alert('Error', 'Failed to analyze content. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const clearContent = () => {
    setInputText('');
    setInputUrl('');
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  const openBrowser = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening browser:', error);
      Alert.alert('Error', 'Failed to open browser');
    }
  };

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !filterSettings.custom_keywords.includes(customKeyword.trim())) {
      setFilterSettings(prev => ({
        ...prev,
        custom_keywords: [...prev.custom_keywords, customKeyword.trim()]
      }));
      setCustomKeyword('');
    }
  };

  const removeCustomKeyword = (keyword: string) => {
    setFilterSettings(prev => ({
      ...prev,
      custom_keywords: prev.custom_keywords.filter(k => k !== keyword)
    }));
  };

  const updateCategory = (category: keyof FilterSettings['categories'], value: boolean) => {
    setFilterSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
  };

  const renderAnalysisTab = () => (
    <KeyboardAvoidingView 
      style={styles.tabContent}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Content to Analyze</Text>
          
          {/* Text Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Text Content</Text>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter text content to analyze..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* URL Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Website URL</Text>
            <TextInput
              style={styles.urlInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              placeholder="https://example.com/article"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Image Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Image Content</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#007AFF" />
              <Text style={styles.imageButtonText}>Select Image</Text>
            </TouchableOpacity>
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                  style={styles.selectedImage}
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.analyzeButton, isAnalyzing && styles.disabledButton]} 
              onPress={analyzeContent}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.clearButton]} 
              onPress={clearContent}
            >
              <Ionicons name="refresh-outline" size={20} color="#FF3B30" />
              <Text style={[styles.buttonText, { color: '#FF3B30' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Analysis Results */}
          {analysisResult && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Analysis Result</Text>
              
              <View style={[
                styles.resultCard,
                analysisResult.is_safe ? styles.safeCard : styles.unsafeCard
              ]}>
                <View style={styles.resultHeader}>
                  <Ionicons 
                    name={analysisResult.is_safe ? "shield-checkmark" : "warning"} 
                    size={24} 
                    color={analysisResult.is_safe ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.resultStatus,
                    { color: analysisResult.is_safe ? "#34C759" : "#FF3B30" }
                  ]}>
                    {analysisResult.is_safe ? "Content is Safe" : "Content Flagged"}
                  </Text>
                </View>

                <View style={styles.resultDetails}>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(analysisResult.confidence * 100)}%
                  </Text>
                  
                  {analysisResult.flagged_categories.length > 0 && (
                    <View style={styles.flaggedCategories}>
                      <Text style={styles.flaggedTitle}>Flagged for:</Text>
                      {analysisResult.flagged_categories.map((category, index) => (
                        <View key={index} style={styles.categoryTag}>
                          <Text style={styles.categoryText}>
                            {category.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {analysisResult.analysis_details?.reasoning && (
                    <View style={styles.reasoningSection}>
                      <Text style={styles.reasoningTitle}>Analysis Details:</Text>
                      <Text style={styles.reasoningText}>
                        {analysisResult.analysis_details.reasoning}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Filter Categories</Text>
        
        {Object.entries(filterSettings.categories).map(([category, enabled]) => (
          <View key={category} style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Switch
              value={enabled}
              onValueChange={(value) => updateCategory(category as keyof FilterSettings['categories'], value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor={enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Strictness Level</Text>
        <View style={styles.strictnessContainer}>
          {['permissive', 'moderate', 'strict'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.strictnessButton,
                filterSettings.strictness_level === level && styles.activeStrictnessButton
              ]}
              onPress={() => setFilterSettings(prev => ({ ...prev, strictness_level: level }))}
            >
              <Text style={[
                styles.strictnessText,
                filterSettings.strictness_level === level && styles.activeStrictnessText
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Custom Keywords</Text>
        <View style={styles.keywordInputContainer}>
          <TextInput
            style={styles.keywordInput}
            value={customKeyword}
            onChangeText={setCustomKeyword}
            placeholder="Add custom keyword to block"
          />
          <TouchableOpacity style={styles.addKeywordButton} onPress={addCustomKeyword}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.keywordsList}>
          {filterSettings.custom_keywords.map((keyword, index) => (
            <View key={index} style={styles.keywordTag}>
              <Text style={styles.keywordText}>{keyword}</Text>
              <TouchableOpacity onPress={() => removeCustomKeyword(keyword)}>
                <Ionicons name="close" size={16} color="#666666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={saveFilterSettings}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Protection Statistics</Text>
        
        {stats ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="security" size={32} color="#007AFF" />
                <Text style={styles.statValue}>{stats.total_analyses}</Text>
                <Text style={styles.statLabel}>Total Analyses</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="verified" size={32} color="#34C759" />
                <Text style={styles.statValue}>{stats.safe_content}</Text>
                <Text style={styles.statLabel}>Safe Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="warning" size={32} color="#FF3B30" />
                <Text style={styles.statValue}>{stats.flagged_content}</Text>
                <Text style={styles.statLabel}>Flagged Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="today" size={32} color="#FF9500" />
                <Text style={styles.statValue}>{stats.today_analyses}</Text>
                <Text style={styles.statLabel}>Today's Analyses</Text>
              </View>
            </View>

            <View style={styles.protectionOverview}>
              <Text style={styles.overviewTitle}>Protection Effectiveness</Text>
              <View style={styles.effectivenessBar}>
                <View 
                  style={[
                    styles.effectivenessFill,
                    { width: `${100 - stats.flagged_percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.effectivenessText}>
                {(100 - stats.flagged_percentage).toFixed(1)}% of content was safe
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={loadStats}>
          <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, { color: '#007AFF' }]}>Refresh Stats</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F2F2F7" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons name="security" size={28} color="#007AFF" />
          <Text style={styles.headerTitle}>Content Safeguard</Text>
        </View>
        <Text style={styles.headerSubtitle}>AI-Powered Content Protection</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analyze' && styles.activeTab]}
          onPress={() => setActiveTab('analyze')}
        >
          <Ionicons 
            name="shield-checkmark-outline" 
            size={20} 
            color={activeTab === 'analyze' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'analyze' && styles.activeTabText
          ]}>
            Analyze
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings-outline" 
            size={20} 
            color={activeTab === 'settings' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'settings' && styles.activeTabText
          ]}>
            Settings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={20} 
            color={activeTab === 'stats' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'stats' && styles.activeTabText
          ]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'analyze' && renderAnalysisTab()}
      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'stats' && renderStatsTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 40,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  urlInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
    height: 50,
  },
  imageButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectedImageContainer: {
    marginTop: 12,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  resultSection: {
    marginTop: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  safeCard: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  unsafeCard: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF0F0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultStatus: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  resultDetails: {
    gap: 12,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  flaggedCategories: {
    gap: 8,
  },
  flaggedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  categoryTag: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reasoningSection: {
    gap: 4,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  reasoningText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  strictnessContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  strictnessButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  activeStrictnessButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  strictnessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  activeStrictnessText: {
    color: '#FFFFFF',
  },
  keywordInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  keywordInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
  },
  addKeywordButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  keywordTag: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keywordText: {
    fontSize: 14,
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: (screenWidth - 52) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  protectionOverview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  effectivenessBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
  },
  effectivenessFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  effectivenessText: {
    fontSize: 14,
    color: '#666666',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
});