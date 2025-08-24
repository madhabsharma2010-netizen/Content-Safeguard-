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
  Switch,
  Modal,
  FlatList,
  Linking
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface AnalysisResult {
  is_safe: boolean;
  confidence: number;
  flagged_categories: string[];
  analysis_details: any;
  timestamp: string;
  app_source?: string;
  risk_level?: string;
}

interface AdvancedFilterSettings {
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
    political_bias: boolean;
    conspiracy_theories: boolean;
  };
  strictness_level: string;
  custom_keywords: string[];
  whitelist_domains: string[];
  blacklist_domains: string[];
  auto_scan_enabled: boolean;
  notification_enabled: boolean;
  time_limits: {
    daily_scan_limit: number;
    hourly_scan_limit: number;
    analysis_timeout: number;
  };
}

interface AppIntegrationSettings {
  user_id: string;
  enabled_apps: string[];
  scan_frequency: string;
  auto_block: boolean;
  warning_mode: boolean;
  accessibility_enabled: boolean;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-safeguard.preview.emergentagent.com';

export default function AdvancedContentSafeguardApp() {
  // State management
  const [activeTab, setActiveTab] = useState('analyze');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAppSource, setSelectedAppSource] = useState('manual');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Advanced settings states
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedFilterSettings>({
    user_id: 'default_user',
    categories: {
      inappropriate_content: true,
      fake_news: true,
      violence: true,
      adult_content: true,
      hate_speech: true,
      misinformation: true,
      clickbait: true,
      spam: true,
      political_bias: false,
      conspiracy_theories: true
    },
    strictness_level: 'moderate',
    custom_keywords: [],
    whitelist_domains: [],
    blacklist_domains: [],
    auto_scan_enabled: true,
    notification_enabled: true,
    time_limits: {
      daily_scan_limit: 1000,
      hourly_scan_limit: 100,
      analysis_timeout: 30
    }
  });

  const [appIntegrationSettings, setAppIntegrationSettings] = useState<AppIntegrationSettings>({
    user_id: 'default_user',
    enabled_apps: ['whatsapp', 'instagram', 'facebook', 'twitter', 'telegram'],
    scan_frequency: 'real_time',
    auto_block: false,
    warning_mode: true,
    accessibility_enabled: false
  });

  const [enhancedStats, setEnhancedStats] = useState<any>(null);
  const [customKeyword, setCustomKeyword] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // App sources for integration
  const appSources = [
    { key: 'manual', name: 'Manual', icon: 'hand-left-outline' },
    { key: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp' },
    { key: 'instagram', name: 'Instagram', icon: 'logo-instagram' },
    { key: 'facebook', name: 'Facebook', icon: 'logo-facebook' },
    { key: 'twitter', name: 'Twitter', icon: 'logo-twitter' },
    { key: 'telegram', name: 'Telegram', icon: 'paper-plane-outline' },
    { key: 'youtube', name: 'YouTube', icon: 'logo-youtube' },
    { key: 'tiktok', name: 'TikTok', icon: 'musical-notes-outline' }
  ];

  // Load settings and stats on app start
  useEffect(() => {
    loadAdvancedSettings();
    loadAppIntegrationSettings();
    loadEnhancedStats();
    loadAnalysisHistory();
  }, []);

  const loadAdvancedSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/advanced-filter-settings/default_user`);
      if (response.ok) {
        const settings = await response.json();
        setAdvancedSettings(settings);
      }
    } catch (error) {
      console.error('Error loading advanced settings:', error);
    }
  };

  const loadAppIntegrationSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/app-integration-settings/default_user`);
      if (response.ok) {
        const settings = await response.json();
        setAppIntegrationSettings(settings);
      }
    } catch (error) {
      console.error('Error loading app integration settings:', error);
    }
  };

  const saveAdvancedSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/advanced-filter-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advancedSettings),
      });

      if (response.ok) {
        Alert.alert('Success', 'Advanced settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      Alert.alert('Error', 'Failed to save advanced settings');
    }
  };

  const saveAppIntegrationSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/app-integration-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appIntegrationSettings),
      });

      if (response.ok) {
        Alert.alert('Success', 'App integration settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving app integration settings:', error);
      Alert.alert('Error', 'Failed to save app integration settings');
    }
  };

  const loadEnhancedStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/enhanced-stats/default_user`);
      if (response.ok) {
        const statsData = await response.json();
        setEnhancedStats(statsData);
      }
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    }
  };

  const loadAnalysisHistory = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analysis-history/default_user?limit=20`);
      if (response.ok) {
        const historyData = await response.json();
        setAnalysisHistory(historyData.history);
      }
    } catch (error) {
      console.error('Error loading analysis history:', error);
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
      const requestBody: any = {
        app_source: selectedAppSource !== 'manual' ? selectedAppSource : undefined,
        auto_scan: false
      };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      
      // Reload stats and history
      loadEnhancedStats();
      loadAnalysisHistory();

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
    setSelectedAppSource('manual');
  };

  const addCustomKeyword = () => {
    if (customKeyword.trim() && !advancedSettings.custom_keywords.includes(customKeyword.trim())) {
      setAdvancedSettings(prev => ({
        ...prev,
        custom_keywords: [...prev.custom_keywords, customKeyword.trim()]
      }));
      setCustomKeyword('');
    }
  };

  const removeCustomKeyword = (keyword: string) => {
    setAdvancedSettings(prev => ({
      ...prev,
      custom_keywords: prev.custom_keywords.filter(k => k !== keyword)
    }));
  };

  const addCustomDomain = (isWhitelist: boolean) => {
    const domain = customDomain.trim().toLowerCase();
    if (domain) {
      setAdvancedSettings(prev => ({
        ...prev,
        [isWhitelist ? 'whitelist_domains' : 'blacklist_domains']: [
          ...prev[isWhitelist ? 'whitelist_domains' : 'blacklist_domains'],
          domain
        ]
      }));
      setCustomDomain('');
    }
  };

  const removeDomain = (domain: string, isWhitelist: boolean) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [isWhitelist ? 'whitelist_domains' : 'blacklist_domains']: 
        prev[isWhitelist ? 'whitelist_domains' : 'blacklist_domains'].filter(d => d !== domain)
    }));
  };

  const updateCategory = (category: keyof AdvancedFilterSettings['categories'], value: boolean) => {
    setAdvancedSettings(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: value
      }
    }));
  };

  const updateTimeLimit = (key: keyof AdvancedFilterSettings['time_limits'], value: number) => {
    setAdvancedSettings(prev => ({
      ...prev,
      time_limits: {
        ...prev.time_limits,
        [key]: value
      }
    }));
  };

  const toggleAppIntegration = (app: string) => {
    setAppIntegrationSettings(prev => ({
      ...prev,
      enabled_apps: prev.enabled_apps.includes(app)
        ? prev.enabled_apps.filter(a => a !== app)
        : [...prev.enabled_apps, app]
    }));
  };

  const renderAnalysisTab = () => (
    <KeyboardAvoidingView 
      style={styles.tabContent}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Content Analysis</Text>
          
          {/* App Source Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Content Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appSourceContainer}>
              {appSources.map((source) => (
                <TouchableOpacity
                  key={source.key}
                  style={[
                    styles.appSourceButton,
                    selectedAppSource === source.key && styles.activeAppSourceButton
                  ]}
                  onPress={() => setSelectedAppSource(source.key)}
                >
                  <Ionicons 
                    name={source.icon as any} 
                    size={20} 
                    color={selectedAppSource === source.key ? '#FFFFFF' : '#007AFF'} 
                  />
                  <Text style={[
                    styles.appSourceText,
                    selectedAppSource === source.key && styles.activeAppSourceText
                  ]}>
                    {source.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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

          {/* Enhanced Analysis Results */}
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
                  {analysisResult.risk_level && (
                    <View style={[
                      styles.riskBadge,
                      { backgroundColor: 
                        analysisResult.risk_level === 'high' ? '#FF3B30' :
                        analysisResult.risk_level === 'medium' ? '#FF9500' : '#34C759'
                      }
                    ]}>
                      <Text style={styles.riskText}>{analysisResult.risk_level.toUpperCase()}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultDetails}>
                  <Text style={styles.confidenceText}>
                    Confidence: {Math.round(analysisResult.confidence * 100)}%
                  </Text>
                  
                  {analysisResult.app_source && (
                    <Text style={styles.sourceText}>
                      Source: {analysisResult.app_source.charAt(0).toUpperCase() + analysisResult.app_source.slice(1)}
                    </Text>
                  )}
                  
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
          
          {/* Recent Analysis History */}
          {analysisHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Analysis</Text>
              {analysisHistory.slice(0, 3).map((item: any, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Ionicons 
                      name={item.result.is_safe ? "checkmark-circle" : "warning"} 
                      size={16} 
                      color={item.result.is_safe ? "#34C759" : "#FF3B30"} 
                    />
                    <Text style={styles.historyTime}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                    {item.app_source && (
                      <Text style={styles.historySource}>{item.app_source}</Text>
                    )}
                  </View>
                  <Text style={styles.historyType}>{item.content_type.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderAdvancedSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <View style={styles.settingsHeader}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          <TouchableOpacity onPress={() => setShowAdvancedModal(true)}>
            <Feather name="more-horizontal" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        {/* Filter Categories */}
        <Text style={styles.subsectionTitle}>Filter Categories</Text>
        {Object.entries(advancedSettings.categories).map(([category, enabled]) => (
          <View key={category} style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Switch
              value={enabled}
              onValueChange={(value) => updateCategory(category as keyof AdvancedFilterSettings['categories'], value)}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor={enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        ))}

        {/* Strictness Level */}
        <Text style={styles.subsectionTitle}>Strictness Level</Text>
        <View style={styles.strictnessContainer}>
          {['permissive', 'moderate', 'strict'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.strictnessButton,
                advancedSettings.strictness_level === level && styles.activeStrictnessButton
              ]}
              onPress={() => setAdvancedSettings(prev => ({ ...prev, strictness_level: level }))}
            >
              <Text style={[
                styles.strictnessText,
                advancedSettings.strictness_level === level && styles.activeStrictnessText
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Auto Scan Settings */}
        <Text style={styles.subsectionTitle}>Auto Scan Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Auto Scan</Text>
          <Switch
            value={advancedSettings.auto_scan_enabled}
            onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, auto_scan_enabled: value }))}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={advancedSettings.notification_enabled}
            onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, notification_enabled: value }))}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          />
        </View>

        {/* Time Limits */}
        <Text style={styles.subsectionTitle}>Time Limits</Text>
        <View style={styles.timeLimitContainer}>
          <Text style={styles.timeLimitLabel}>Daily Scan Limit</Text>
          <TextInput
            style={styles.timeLimitInput}
            value={advancedSettings.time_limits.daily_scan_limit.toString()}
            onChangeText={(text) => updateTimeLimit('daily_scan_limit', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.timeLimitContainer}>
          <Text style={styles.timeLimitLabel}>Hourly Scan Limit</Text>
          <TextInput
            style={styles.timeLimitInput}
            value={advancedSettings.time_limits.hourly_scan_limit.toString()}
            onChangeText={(text) => updateTimeLimit('hourly_scan_limit', parseInt(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Custom Keywords */}
        <Text style={styles.subsectionTitle}>Custom Keywords</Text>
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
          {advancedSettings.custom_keywords.map((keyword, index) => (
            <View key={index} style={styles.keywordTag}>
              <Text style={styles.keywordText}>{keyword}</Text>
              <TouchableOpacity onPress={() => removeCustomKeyword(keyword)}>
                <Ionicons name="close" size={16} color="#666666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Domain Management */}
        <Text style={styles.subsectionTitle}>Domain Management</Text>
        <View style={styles.domainInputContainer}>
          <TextInput
            style={styles.domainInput}
            value={customDomain}
            onChangeText={setCustomDomain}
            placeholder="Add domain (e.g., example.com)"
          />
          <TouchableOpacity 
            style={[styles.domainButton, { backgroundColor: '#34C759' }]} 
            onPress={() => addCustomDomain(true)}
          >
            <Text style={styles.domainButtonText}>Whitelist</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.domainButton, { backgroundColor: '#FF3B30' }]} 
            onPress={() => addCustomDomain(false)}
          >
            <Text style={styles.domainButtonText}>Blacklist</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveAdvancedSettings}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save Advanced Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderIntegrationTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <View style={styles.settingsHeader}>
          <Text style={styles.sectionTitle}>App Integration</Text>
          <TouchableOpacity onPress={() => setShowIntegrationModal(true)}>
            <MaterialIcons name="integration-instructions" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Scan Frequency */}
        <Text style={styles.subsectionTitle}>Scan Frequency</Text>
        <View style={styles.frequencyContainer}>
          {['real_time', 'scheduled', 'manual'].map((frequency) => (
            <TouchableOpacity
              key={frequency}
              style={[
                styles.frequencyButton,
                appIntegrationSettings.scan_frequency === frequency && styles.activeFrequencyButton
              ]}
              onPress={() => setAppIntegrationSettings(prev => ({ ...prev, scan_frequency: frequency }))}
            >
              <Text style={[
                styles.frequencyText,
                appIntegrationSettings.scan_frequency === frequency && styles.activeFrequencyText
              ]}>
                {frequency.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Integration Settings */}
        <Text style={styles.subsectionTitle}>Integration Options</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto Block Unsafe Content</Text>
          <Switch
            value={appIntegrationSettings.auto_block}
            onValueChange={(value) => setAppIntegrationSettings(prev => ({ ...prev, auto_block: value }))}
            trackColor={{ false: '#E5E5EA', true: '#FF3B30' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Warning Mode</Text>
          <Switch
            value={appIntegrationSettings.warning_mode}
            onValueChange={(value) => setAppIntegrationSettings(prev => ({ ...prev, warning_mode: value }))}
            trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Accessibility Service</Text>
          <Switch
            value={appIntegrationSettings.accessibility_enabled}
            onValueChange={(value) => setAppIntegrationSettings(prev => ({ ...prev, accessibility_enabled: value }))}
            trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
          />
        </View>

        {/* Enabled Apps */}
        <Text style={styles.subsectionTitle}>Enabled Apps</Text>
        <View style={styles.appsGrid}>
          {appSources.filter(app => app.key !== 'manual').map((app) => (
            <TouchableOpacity
              key={app.key}
              style={[
                styles.appCard,
                appIntegrationSettings.enabled_apps.includes(app.key) && styles.activeAppCard
              ]}
              onPress={() => toggleAppIntegration(app.key)}
            >
              <Ionicons 
                name={app.icon as any} 
                size={32} 
                color={appIntegrationSettings.enabled_apps.includes(app.key) ? '#FFFFFF' : '#007AFF'} 
              />
              <Text style={[
                styles.appCardText,
                appIntegrationSettings.enabled_apps.includes(app.key) && styles.activeAppCardText
              ]}>
                {app.name}
              </Text>
              {appIntegrationSettings.enabled_apps.includes(app.key) && (
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Integration Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Setup Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Enable Accessibility Service for automatic content monitoring{'\n'}
            2. Grant necessary permissions for app integration{'\n'}
            3. Configure scan frequency based on your needs{'\n'}
            4. Select apps you want to monitor{'\n'}
            5. Choose between auto-block or warning mode
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveAppIntegrationSettings}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save Integration Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderEnhancedStatsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Enhanced Protection Statistics</Text>
        
        {enhancedStats ? (
          <>
            {/* Main Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="security" size={32} color="#007AFF" />
                <Text style={styles.statValue}>{enhancedStats.total_analyses}</Text>
                <Text style={styles.statLabel}>Total Analyses</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="verified" size={32} color="#34C759" />
                <Text style={styles.statValue}>{enhancedStats.safe_content}</Text>
                <Text style={styles.statLabel}>Safe Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="warning" size={32} color="#FF3B30" />
                <Text style={styles.statValue}>{enhancedStats.flagged_content}</Text>
                <Text style={styles.statLabel}>Flagged Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="today" size={32} color="#FF9500" />
                <Text style={styles.statValue}>{enhancedStats.today_analyses}</Text>
                <Text style={styles.statLabel}>Today's Analyses</Text>
              </View>
            </View>

            {/* App Breakdown */}
            {enhancedStats.app_breakdown && enhancedStats.app_breakdown.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.subsectionTitle}>App Breakdown</Text>
                {enhancedStats.app_breakdown.map((app: any, index: number) => (
                  <View key={index} style={styles.breakdownItem}>
                    <Text style={styles.breakdownApp}>
                      {app._id || 'Manual'}: {app.count} analyses
                    </Text>
                    <Text style={styles.breakdownUnsafe}>
                      {app.unsafe_count} flagged
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Risk Level Breakdown */}
            {enhancedStats.risk_breakdown && enhancedStats.risk_breakdown.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.subsectionTitle}>Risk Level Distribution</Text>
                {enhancedStats.risk_breakdown.map((risk: any, index: number) => (
                  <View key={index} style={styles.riskItem}>
                    <View style={[
                      styles.riskIndicator,
                      { backgroundColor: 
                        risk._id === 'high' ? '#FF3B30' :
                        risk._id === 'medium' ? '#FF9500' : '#34C759'
                      }
                    ]} />
                    <Text style={styles.riskLabel}>
                      {risk._id?.toUpperCase() || 'UNKNOWN'}: {risk.count} items
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Protection Effectiveness */}
            <View style={styles.protectionOverview}>
              <Text style={styles.overviewTitle}>Protection Effectiveness</Text>
              <View style={styles.effectivenessBar}>
                <View 
                  style={[
                    styles.effectivenessFill,
                    { width: `${100 - enhancedStats.flagged_percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.effectivenessText}>
                {(100 - enhancedStats.flagged_percentage).toFixed(1)}% of content was safe
              </Text>
              
              <View style={styles.trendContainer}>
                <Text style={styles.trendTitle}>Weekly Activity: {enhancedStats.week_analyses} analyses</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading enhanced statistics...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={loadEnhancedStats}>
          <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, { color: '#007AFF' }]}>Refresh Stats</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Advanced Modal for additional settings
  const renderAdvancedModal = () => (
    <Modal visible={showAdvancedModal} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Advanced Configuration</Text>
          <TouchableOpacity onPress={() => setShowAdvancedModal(false)}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Whitelist Domains */}
          <Text style={styles.modalSectionTitle}>Whitelist Domains</Text>
          <View style={styles.domainsList}>
            {advancedSettings.whitelist_domains.map((domain, index) => (
              <View key={index} style={[styles.domainTag, { backgroundColor: '#34C759' }]}>
                <Text style={styles.domainTagText}>{domain}</Text>
                <TouchableOpacity onPress={() => removeDomain(domain, true)}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          {/* Blacklist Domains */}
          <Text style={styles.modalSectionTitle}>Blacklist Domains</Text>
          <View style={styles.domainsList}>
            {advancedSettings.blacklist_domains.map((domain, index) => (
              <View key={index} style={[styles.domainTag, { backgroundColor: '#FF3B30' }]}>
                <Text style={styles.domainTagText}>{domain}</Text>
                <TouchableOpacity onPress={() => removeDomain(domain, false)}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F2F2F7" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialIcons name="security" size={28} color="#007AFF" />
          <Text style={styles.headerTitle}>Content Safeguard Pro</Text>
        </View>
        <Text style={styles.headerSubtitle}>Advanced AI-Powered Content Protection</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analyze' && styles.activeTab]}
          onPress={() => setActiveTab('analyze')}
        >
          <Ionicons 
            name="shield-checkmark-outline" 
            size={18} 
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
            size={18} 
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
          style={[styles.tab, activeTab === 'integration' && styles.activeTab]}
          onPress={() => setActiveTab('integration')}
        >
          <MaterialIcons 
            name="integration-instructions" 
            size={18} 
            color={activeTab === 'integration' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'integration' && styles.activeTabText
          ]}>
            Apps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons 
            name="analytics-outline" 
            size={18} 
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
      {activeTab === 'settings' && renderAdvancedSettingsTab()}
      {activeTab === 'integration' && renderIntegrationTab()}
      {activeTab === 'stats' && renderEnhancedStatsTab()}
      
      {/* Advanced Modal */}
      {renderAdvancedModal()}
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
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 13,
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
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
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
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  appSourceContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  appSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  activeAppSourceButton: {
    backgroundColor: '#007AFF',
  },
  appSourceText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  activeAppSourceText: {
    color: '#FFFFFF',
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
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resultDetails: {
    gap: 12,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
  historySection: {
    marginTop: 24,
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  historySource: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  historyType: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
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
  timeLimitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeLimitLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  timeLimitInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
    width: 80,
    textAlign: 'center',
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
  domainInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  domainInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 16,
  },
  domainButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  domainButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  domainsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  domainTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainTagText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  activeFrequencyButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  activeFrequencyText: {
    color: '#FFFFFF',
  },
  appsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (screenWidth - 64) / 3,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  activeAppCard: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  appCardText: {
    fontSize: 12,
    color: '#000000',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  activeAppCardText: {
    color: '#FFFFFF',
  },
  instructionsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
  breakdownSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownApp: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  breakdownUnsafe: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  riskIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  riskLabel: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
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
  trendContainer: {
    marginTop: 12,
  },
  trendTitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    marginTop: 20,
  },
});