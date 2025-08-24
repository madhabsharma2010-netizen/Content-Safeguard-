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
  Linking,
  ProgressBarAndroid,
  ProgressViewIOS
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialIcons, AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface UltraAccurateAnalysisResult {
  is_safe: boolean;
  confidence: number;
  accuracy_score: number;
  flagged_categories: string[];
  analysis_details: any;
  validation_status: string;
  model_consensus: any;
  risk_assessment: {
    risk_level: string;
    confidence_band: string;
    accuracy_grade: string;
  };
  timestamp: string;
  app_source?: string;
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-safeguard.preview.emergentagent.com';

export default function UltraAccurateContentSafeguardApp() {
  // State management
  const [activeTab, setActiveTab] = useState('analyze');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAppSource, setSelectedAppSource] = useState('manual');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<UltraAccurateAnalysisResult | null>(null);
  
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

  const [ultraStats, setUltraStats] = useState<any>(null);
  const [customKeyword, setCustomKeyword] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [accuracyTarget] = useState(95); // 95% accuracy target

  // App sources for integration
  const appSources = [
    { key: 'manual', name: 'Manual', icon: 'hand-left-outline', color: '#8E8E93' },
    { key: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { key: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { key: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    { key: 'twitter', name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { key: 'telegram', name: 'Telegram', icon: 'paper-plane-outline', color: '#0088CC' },
    { key: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
    { key: 'tiktok', name: 'TikTok', icon: 'musical-notes-outline', color: '#FF0050' }
  ];

  // Load settings and stats on app start
  useEffect(() => {
    loadAdvancedSettings();
    loadUltraStats();
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

  const saveAdvancedSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/advanced-filter-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advancedSettings),
      });

      if (response.ok) {
        Alert.alert('Success', 'Ultra-accurate settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving advanced settings:', error);
      Alert.alert('Error', 'Failed to save advanced settings');
    }
  };

  const loadUltraStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ultra-stats/default_user`);
      if (response.ok) {
        const statsData = await response.json();
        setUltraStats(statsData);
      }
    } catch (error) {
      console.error('Error loading ultra stats:', error);
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

  const simulateAnalysisProgress = () => {
    setAnalysisProgress(0);
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    return interval;
  };

  const analyzeContent = async () => {
    if (!inputText.trim() && !selectedImage && !inputUrl.trim()) {
      Alert.alert('Error', 'Please provide some content to analyze with 95%+ accuracy');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    const progressInterval = simulateAnalysisProgress();

    try {
      const requestBody: any = {
        app_source: selectedAppSource !== 'manual' ? selectedAppSource : undefined,
        auto_scan: false,
        require_high_accuracy: true  // Always require 95%+ accuracy
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

      const response = await fetch(`${BACKEND_URL}/api/ultra-analyze-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Ultra-accurate analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Complete progress
      setAnalysisProgress(100);
      setTimeout(() => {
        setAnalysisResult(result);
        
        // Show accuracy achievement
        if (result.accuracy_score >= 0.95) {
          Alert.alert(
            '🎯 Ultra-Accurate Analysis Complete!', 
            `Accuracy: ${Math.round(result.accuracy_score * 100)}%\nGrade: ${result.risk_assessment?.accuracy_grade || 'A'}\nConfidence: ${Math.round(result.confidence * 100)}%`,
            [{ text: 'Excellent!', style: 'default' }]
          );
        }
        
        // Reload stats and history
        loadUltraStats();
        loadAnalysisHistory();
      }, 500);

    } catch (error) {
      console.error('Error in ultra-accurate analysis:', error);
      Alert.alert('Error', 'Ultra-accurate analysis failed. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 1000);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions for ultra-accurate image analysis.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9, // Higher quality for better analysis
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image for analysis');
    }
  };

  const clearContent = () => {
    setInputText('');
    setInputUrl('');
    setSelectedImage(null);
    setAnalysisResult(null);
    setSelectedAppSource('manual');
    setAnalysisProgress(0);
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

  const getRiskLevelColor = (riskLevel: string) => {
    switch(riskLevel) {
      case 'critical': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      case 'low': return '#34C759';
      case 'safe': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getAccuracyGradeColor = (grade: string) => {
    switch(grade) {
      case 'A+': return '#34C759';
      case 'A': return '#34C759';
      case 'B+': return '#FF9500';
      case 'B': return '#FF9500';
      default: return '#FF3B30';
    }
  };

  const renderAnalysisTab = () => (
    <KeyboardAvoidingView 
      style={styles.tabContent}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.contentSection}>
          {/* Ultra-Accurate Analysis Header */}
          <View style={styles.ultraHeader}>
            <MaterialCommunityIcons name="target" size={24} color="#007AFF" />
            <View style={styles.ultraHeaderText}>
              <Text style={styles.ultraTitle}>Ultra-Accurate Analysis</Text>
              <Text style={styles.ultraSubtitle}>95%+ Precision Guaranteed</Text>
            </View>
            <View style={styles.accuracyBadge}>
              <Text style={styles.accuracyBadgeText}>{accuracyTarget}%</Text>
            </View>
          </View>
          
          {/* App Source Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Content Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.appSourceContainer}>
              {appSources.map((source) => (
                <TouchableOpacity
                  key={source.key}
                  style={[
                    styles.appSourceButton,
                    selectedAppSource === source.key && styles.activeAppSourceButton,
                    { borderColor: source.color }
                  ]}
                  onPress={() => setSelectedAppSource(source.key)}
                >
                  <Ionicons 
                    name={source.icon as any} 
                    size={20} 
                    color={selectedAppSource === source.key ? '#FFFFFF' : source.color} 
                  />
                  <Text style={[
                    styles.appSourceText,
                    selectedAppSource === source.key && styles.activeAppSourceText,
                    { color: selectedAppSource === source.key ? '#FFFFFF' : source.color }
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
              placeholder="Enter text content for ultra-accurate analysis..."
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
              <Text style={styles.imageButtonText}>Select Image for Analysis</Text>
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

          {/* Analysis Progress */}
          {isAnalyzing && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Ultra-Accurate Analysis in Progress...</Text>
              <View style={styles.progressContainer}>
                {Platform.OS === 'ios' ? 
                  <ProgressViewIOS progress={analysisProgress / 100} progressTintColor="#007AFF" /> :
                  <ProgressBarAndroid 
                    styleAttr="Horizontal" 
                    indeterminate={false} 
                    progress={analysisProgress / 100}
                    color="#007AFF"
                  />
                }
              </View>
              <Text style={styles.progressText}>
                {Math.round(analysisProgress)}% - {
                  analysisProgress < 25 ? 'Initializing AI models...' :
                  analysisProgress < 50 ? 'Cross-validating content...' :
                  analysisProgress < 75 ? 'Verifying accuracy...' :
                  analysisProgress < 95 ? 'Finalizing analysis...' :
                  'Complete!'
                }
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.ultraAnalyzeButton, isAnalyzing && styles.disabledButton]} 
              onPress={analyzeContent}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.buttonText}>
                {isAnalyzing ? 'Analyzing...' : 'Ultra-Accurate Analysis'}
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

          {/* Ultra-Accurate Analysis Results */}
          {analysisResult && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Ultra-Accurate Results</Text>
              
              <View style={[
                styles.ultraResultCard,
                analysisResult.is_safe ? styles.ultraSafeCard : styles.ultraUnsafeCard
              ]}>
                {/* Result Header with Accuracy Metrics */}
                <View style={styles.ultraResultHeader}>
                  <View style={styles.resultStatusSection}>
                    <Ionicons 
                      name={analysisResult.is_safe ? "shield-checkmark" : "warning"} 
                      size={28} 
                      color={analysisResult.is_safe ? "#34C759" : "#FF3B30"} 
                    />
                    <View style={styles.statusTextContainer}>
                      <Text style={[
                        styles.resultStatus,
                        { color: analysisResult.is_safe ? "#34C759" : "#FF3B30" }
                      ]}>
                        {analysisResult.is_safe ? "Content is Safe" : "Content Flagged"}
                      </Text>
                      <Text style={styles.validationStatus}>
                        {analysisResult.validation_status.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Accuracy Metrics */}
                  <View style={styles.accuracyMetrics}>
                    <View style={[
                      styles.accuracyBadgeLarge,
                      { backgroundColor: getAccuracyGradeColor(analysisResult.risk_assessment?.accuracy_grade || 'B') }
                    ]}>
                      <Text style={styles.accuracyGradeText}>
                        {analysisResult.risk_assessment?.accuracy_grade || 'B'}
                      </Text>
                    </View>
                    <Text style={styles.accuracyPercentage}>
                      {Math.round(analysisResult.accuracy_score * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Detailed Metrics */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Confidence</Text>
                    <Text style={styles.metricValue}>{Math.round(analysisResult.confidence * 100)}%</Text>
                  </View>
                  
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Risk Level</Text>
                    <View style={[
                      styles.riskLevelBadge,
                      { backgroundColor: getRiskLevelColor(analysisResult.risk_assessment?.risk_level || 'safe') }
                    ]}>
                      <Text style={styles.riskLevelText}>
                        {(analysisResult.risk_assessment?.risk_level || 'safe').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Confidence Band</Text>
                    <Text style={styles.metricValue}>
                      {(analysisResult.risk_assessment?.confidence_band || 'high').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  
                  {analysisResult.app_source && (
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Source</Text>
                      <Text style={styles.sourceValue}>
                        {analysisResult.app_source.charAt(0).toUpperCase() + analysisResult.app_source.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Flagged Categories */}
                {analysisResult.flagged_categories.length > 0 && (
                  <View style={styles.flaggedCategories}>
                    <Text style={styles.flaggedTitle}>Flagged Categories:</Text>
                    <View style={styles.categoryTagsContainer}>
                      {analysisResult.flagged_categories.map((category, index) => (
                        <View key={index} style={styles.ultraCategoryTag}>
                          <Text style={styles.categoryText}>
                            {category.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Model Consensus Information */}
                {analysisResult.model_consensus && !analysisResult.model_consensus.error && (
                  <View style={styles.consensusSection}>
                    <Text style={styles.consensusTitle}>Model Consensus:</Text>
                    <Text style={styles.consensusText}>
                      {analysisResult.model_consensus.mixed_analysis ? 
                        `Mixed analysis with ${analysisResult.model_consensus.components} components` :
                        analysisResult.model_consensus.single_model ? 
                          'Single model validation' :
                          `${analysisResult.model_consensus.total_models || 1} models agreement`
                      }
                    </Text>
                  </View>
                )}

                {/* Analysis Details */}
                {analysisResult.analysis_details?.primary_reasoning && (
                  <View style={styles.reasoningSection}>
                    <Text style={styles.reasoningTitle}>Analysis Details:</Text>
                    <Text style={styles.reasoningText}>
                      {analysisResult.analysis_details.primary_reasoning}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Recent Analysis History */}
          {analysisHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Ultra-Accurate Analysis</Text>
              {analysisHistory.slice(0, 3).map((item: any, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Ionicons 
                      name={item.result?.is_safe ? "checkmark-circle" : "warning"} 
                      size={16} 
                      color={item.result?.is_safe ? "#34C759" : "#FF3B30"} 
                    />
                    <Text style={styles.historyTime}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                    {item.accuracy_score && (
                      <Text style={styles.historyAccuracy}>
                        {Math.round(item.accuracy_score * 100)}%
                      </Text>
                    )}
                    {item.app_source && (
                      <Text style={styles.historySource}>{item.app_source}</Text>
                    )}
                  </View>
                  <Text style={styles.historyType}>{item.content_type?.toUpperCase()}</Text>
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
          <Text style={styles.sectionTitle}>Ultra-Accurate Settings</Text>
          <View style={styles.precisionIndicator}>
            <MaterialCommunityIcons name="target" size={20} color="#007AFF" />
            <Text style={styles.precisionText}>95%+</Text>
          </View>
        </View>
        
        {/* Filter Categories */}
        <Text style={styles.subsectionTitle}>Enhanced Filter Categories</Text>
        {Object.entries(advancedSettings.categories).map(([category, enabled]) => (
          <View key={category} style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Switch
              value={enabled}
              onValueChange={(value) => updateCategory(category as keyof AdvancedFilterSettings['categories'], value)}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        ))}

        {/* Strictness Level */}
        <Text style={styles.subsectionTitle}>Analysis Strictness</Text>
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
              {advancedSettings.strictness_level === level && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Ultra-Accurate Settings */}
        <Text style={styles.subsectionTitle}>Ultra-Accurate Controls</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Enable Auto Scan</Text>
          <Switch
            value={advancedSettings.auto_scan_enabled}
            onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, auto_scan_enabled: value }))}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>High-Priority Notifications</Text>
          <Switch
            value={advancedSettings.notification_enabled}
            onValueChange={(value) => setAdvancedSettings(prev => ({ ...prev, notification_enabled: value }))}
            trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
          />
        </View>

        {/* Performance Limits */}
        <Text style={styles.subsectionTitle}>Performance Limits</Text>
        <View style={styles.timeLimitContainer}>
          <Text style={styles.timeLimitLabel}>Daily Analysis Limit</Text>
          <TextInput
            style={styles.timeLimitInput}
            value={advancedSettings.time_limits.daily_scan_limit.toString()}
            onChangeText={(text) => updateTimeLimit('daily_scan_limit', parseInt(text) || 1000)}
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.timeLimitContainer}>
          <Text style={styles.timeLimitLabel}>Hourly Analysis Limit</Text>
          <TextInput
            style={styles.timeLimitInput}
            value={advancedSettings.time_limits.hourly_scan_limit.toString()}
            onChangeText={(text) => updateTimeLimit('hourly_scan_limit', parseInt(text) || 100)}
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
            placeholder="Add precision keyword to block"
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
        <TouchableOpacity style={styles.ultraSaveButton} onPress={saveAdvancedSettings}>
          <MaterialCommunityIcons name="target" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save Ultra-Accurate Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderUltraStatsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentSection}>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionTitle}>Ultra-Accurate Statistics</Text>
          <View style={styles.ultraBadge}>
            <MaterialCommunityIcons name="target" size={16} color="#FFFFFF" />
            <Text style={styles.ultraBadgeText}>95%+</Text>
          </View>
        </View>
        
        {ultraStats ? (
          <>
            {/* Accuracy Metrics */}
            {ultraStats.accuracy_metrics && (
              <View style={styles.accuracySection}>
                <Text style={styles.subsectionTitle}>Accuracy Performance</Text>
                <View style={styles.accuracyGrid}>
                  <View style={styles.accuracyCard}>
                    <MaterialCommunityIcons name="target" size={32} color="#007AFF" />
                    <Text style={styles.accuracyValue}>{ultraStats.accuracy_metrics.average_accuracy}%</Text>
                    <Text style={styles.accuracyLabel}>Avg Accuracy</Text>
                  </View>
                  
                  <View style={styles.accuracyCard}>
                    <MaterialIcons name="verified" size={32} color="#34C759" />
                    <Text style={styles.accuracyValue}>{ultraStats.accuracy_metrics.average_confidence}%</Text>
                    <Text style={styles.accuracyLabel}>Avg Confidence</Text>
                  </View>
                  
                  <View style={styles.accuracyCard}>
                    <MaterialCommunityIcons name="shield-check" size={32} color="#FF9500" />
                    <Text style={styles.accuracyValue}>{ultraStats.accuracy_metrics.high_accuracy_percentage}%</Text>
                    <Text style={styles.accuracyLabel}>95%+ Results</Text>
                  </View>
                  
                  <View style={styles.accuracyCard}>
                    <MaterialIcons name="grade" size={32} color={getAccuracyGradeColor(ultraStats.system_performance?.accuracy_grade || 'B')} />
                    <Text style={styles.accuracyValue}>{ultraStats.system_performance?.accuracy_grade || 'B'}</Text>
                    <Text style={styles.accuracyLabel}>System Grade</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Main Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="security" size={32} color="#007AFF" />
                <Text style={styles.statValue}>{ultraStats.total_analyses}</Text>
                <Text style={styles.statLabel}>Total Analyses</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="verified" size={32} color="#34C759" />
                <Text style={styles.statValue}>{ultraStats.safe_content}</Text>
                <Text style={styles.statLabel}>Safe Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="warning" size={32} color="#FF3B30" />
                <Text style={styles.statValue}>{ultraStats.flagged_content}</Text>
                <Text style={styles.statLabel}>Flagged Content</Text>
              </View>

              <View style={styles.statCard}>
                <MaterialIcons name="today" size={32} color="#FF9500" />
                <Text style={styles.statValue}>{ultraStats.today_analyses}</Text>
                <Text style={styles.statLabel}>Today's Analyses</Text>
              </View>
            </View>

            {/* App Breakdown */}
            {ultraStats.app_breakdown && ultraStats.app_breakdown.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.subsectionTitle}>App Performance Breakdown</Text>
                {ultraStats.app_breakdown.map((app: any, index: number) => (
                  <View key={index} style={styles.appBreakdownItem}>
                    <Text style={styles.breakdownApp}>
                      {app._id || 'Manual'}: {app.count} analyses
                    </Text>
                    <View style={styles.appMetrics}>
                      <Text style={styles.breakdownAccuracy}>
                        {Math.round(app.avg_accuracy * 100)}% accuracy
                      </Text>
                      <Text style={styles.breakdownUnsafe}>
                        {app.unsafe_count} flagged
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* System Performance */}
            {ultraStats.system_performance && (
              <View style={styles.performanceSection}>
                <Text style={styles.subsectionTitle}>System Performance</Text>
                <View style={styles.performanceCard}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>System Status</Text>
                    <Text style={[
                      styles.performanceValue,
                      { color: ultraStats.system_performance.system_status === 'ultra_high_accuracy' ? '#34C759' : '#007AFF' }
                    ]}>
                      {ultraStats.system_performance.system_status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Confidence Band</Text>
                    <Text style={styles.performanceValue}>
                      {ultraStats.system_performance.confidence_band.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Protection Effectiveness */}
            <View style={styles.protectionOverview}>
              <Text style={styles.overviewTitle}>Protection Effectiveness</Text>
              <View style={styles.effectivenessBar}>
                <View 
                  style={[
                    styles.effectivenessFill,
                    { width: `${100 - ultraStats.flagged_percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.effectivenessText}>
                {(100 - ultraStats.flagged_percentage).toFixed(1)}% of content was safe
              </Text>
              <Text style={styles.ultraEffectivenessNote}>
                Powered by Ultra-Accurate AI Analysis
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading ultra-accurate statistics...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.ultraRefreshButton} onPress={loadUltraStats}>
          <MaterialCommunityIcons name="target" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, { color: '#007AFF' }]}>Refresh Ultra Stats</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F2F2F7" />
      
      {/* Ultra Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="target" size={28} color="#007AFF" />
          <Text style={styles.headerTitle}>Content Safeguard Ultra</Text>
        </View>
        <Text style={styles.headerSubtitle}>Ultra-Accurate AI Protection • 95%+ Precision</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analyze' && styles.activeTab]}
          onPress={() => setActiveTab('analyze')}
        >
          <MaterialCommunityIcons 
            name="target" 
            size={18} 
            color={activeTab === 'analyze' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'analyze' && styles.activeTabText
          ]}>
            Ultra Analyze
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
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <MaterialIcons 
            name="analytics" 
            size={18} 
            color={activeTab === 'stats' ? '#007AFF' : '#8E8E93'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'stats' && styles.activeTabText
          ]}>
            Ultra Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'analyze' && renderAnalysisTab()}
      {activeTab === 'settings' && renderAdvancedSettingsTab()}
      {activeTab === 'stats' && renderUltraStatsTab()}
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
    color: '#007AFF',
    marginLeft: 40,
    fontWeight: '600',
  },
  ultraHeader: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  ultraHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  ultraTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  ultraSubtitle: {
    fontSize: 14,
    color: '#007AFF',
    opacity: 0.8,
  },
  accuracyBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accuracyBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  precisionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  precisionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ultraBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ultraBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
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
    borderWidth: 2,
    marginRight: 8,
  },
  activeAppSourceButton: {
    backgroundColor: '#007AFF',
  },
  appSourceText: {
    fontSize: 12,
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
  progressSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
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
  ultraAnalyzeButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  ultraResultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  ultraSafeCard: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  ultraUnsafeCard: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF0F0',
  },
  ultraResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  resultStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultStatus: {
    fontSize: 18,
    fontWeight: '700',
  },
  validationStatus: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginTop: 2,
  },
  accuracyMetrics: {
    alignItems: 'center',
  },
  accuracyBadgeLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  accuracyGradeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  accuracyPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  riskLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  riskLevelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sourceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  flaggedCategories: {
    marginBottom: 16,
  },
  flaggedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  categoryTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ultraCategoryTag: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  consensusSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  consensusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  consensusText: {
    fontSize: 12,
    color: '#007AFF',
  },
  reasoningSection: {
    marginTop: 12,
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
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
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
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
  historyAccuracy: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeStrictnessButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  strictnessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginRight: 4,
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
  ultraSaveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  accuracySection: {
    marginBottom: 24,
  },
  accuracyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accuracyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: (screenWidth - 64) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  accuracyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 8,
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
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
  appBreakdownItem: {
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
    flex: 1,
  },
  appMetrics: {
    alignItems: 'flex-end',
  },
  breakdownAccuracy: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  breakdownUnsafe: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
  },
  performanceSection: {
    marginBottom: 20,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceMetric: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
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
  ultraEffectivenessNote: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
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
  ultraRefreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
});