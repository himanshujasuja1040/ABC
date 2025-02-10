import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { db } from '../../configs/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { AuthContext } from '../AuthContext/AuthContext';
import { useNavigation } from 'expo-router';
import YoutubePlayer from "react-native-youtube-iframe";
import WebView from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper function to extract a YouTube video ID from a URL.
const getYoutubeId = (url) => {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]+)/,
  );
  return match?.[1] || null;
};

const FreeLecture = () => {
  const { selectedStandard } = useContext(AuthContext);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  // New search state variables.
  const [subjectQuery, setSubjectQuery] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: 'Lectures' });
  }, [navigation]);

  // Fetch lectures from the "FreeLecture" collection.
  const fetchLectures = useCallback(async () => {
    try {
      setLoading(true);
      const lecturesCollectionRef = collection(db, 'FreeLecture');
      const querySnapshot = await getDocs(lecturesCollectionRef);
      const fetchedLectures = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLectures(fetchedLectures);
      setError(null);
    } catch (err) {
      console.error('Error fetching lectures:', err);
      setError('Failed to load lectures. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);
  
    const handleRefresh = useCallback(() => {
      setRefreshing(true);
    fetchLectures();
    }, [fetchLectures]);

  // Filter lectures based on the selected standard and search queries.
  const filteredLectures = useMemo(() => {
    const lowerStd = selectedStandard.toLowerCase();
    return lectures.filter((lecture) => {
      if (!lecture.class || lecture.class.toLowerCase() !== lowerStd) {
        return false;
      }
      if (
        subjectQuery.trim() !== '' &&
        lecture.subject &&
        !lecture.subject.toLowerCase().includes(subjectQuery.toLowerCase())
      ) {
        return false;
      }
      if (globalQuery.trim() !== '') {
        const queryLower = globalQuery.toLowerCase();
        if (
          !(lecture.title && lecture.title.toLowerCase().includes(queryLower)) &&
          !(lecture.subject && lecture.subject.toLowerCase().includes(queryLower))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [lectures, selectedStandard, subjectQuery, globalQuery]);

  // Lecture card component with YouTube player at the bottom.
  const LectureCard = ({ item }) => {
    return (
      <View style={styles.lectureCard}>
        {/* Header Section */}
        <View style={styles.cardHeader}>
          <Text style={styles.classBadge}>{item.class}</Text>
          <Text style={styles.duration}>🎥 Video Lecture</Text>
        </View>

        {/* Lecture Details */}
        <View style={styles.cardContent}>
          <Text style={styles.topTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.subjectText}>
            Subject: {item.subject}
          </Text>
          
          
        </View>

        {/* YouTube Player Section (at the bottom) */}
        <View style={styles.videoContainer}>
          {item.youtubelink ? (
            <YoutubePlayer
              height={SCREEN_WIDTH * 0.56} // Maintain a 16:9 aspect ratio
              width={SCREEN_WIDTH * 0.85}
              videoId={getYoutubeId(item.youtubelink)}
              play={false}
              webViewStyle={styles.videoPlayer}
            />
          ) : (
            <Text style={styles.noVideoText}>No video available.</Text>
          )}
        </View>
      </View>
    );
  };

  const renderLecture = useCallback(({ item }) => <LectureCard item={item} />, []);
  const keyExtractor = useCallback(item => item.id, []);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading Lectures...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchLectures} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredLectures}
        renderItem={renderLecture}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <Text style={styles.header}>📚 Free Lectures</Text>
            {/* Search Bars */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by subject..."
                placeholderTextColor="#888"
                value={subjectQuery}
                onChangeText={setSubjectQuery}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search lectures..."
                placeholderTextColor="#888"
                value={globalQuery}
                onChangeText={setGlobalQuery}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centeredContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              No lectures available for {selectedStandard}
            </Text>
          </View>
        }
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                initialNumToRender={5}
                windowSize={10}
                removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Changed to a softer background color
    paddingTop: 10,
    paddingBottom:40,
  },
  header: {
    fontSize: 28, // Increased font size for better visibility
    fontWeight: 'bold', // Changed to bold for emphasis
    color: '#2c3e50', // Darker color for better readability
    textAlign: 'center',
    marginVertical: 12, // Increased margin for better spacing
    letterSpacing: 1, // Added letter spacing for a more modern look
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20, // Increased bottom margin for more space
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7', // Changed to a softer gray color
    borderRadius: 8, // More rounded corners
    padding: 12, // Increased padding for better touch area
    fontSize: 16,
    marginBottom: 12, // Increased spacing between inputs
    backgroundColor: '#ffffff', // Keeping input background white
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4, // Adding shadow for depth
    elevation: 2,
  },
  lectureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15, // More pronounced rounded corners
    marginHorizontal: 16,
    marginBottom: 25, // Increased spacing for better separation
    padding: 20, // Increased padding for a spacious feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Increased elevation for a stronger shadow effect
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14, // Added margin for better space
  },
  classBadge: {
    backgroundColor: '#3498db', // Changed to a more vibrant blue
    color: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 25,
    fontSize: 16,
    fontWeight: '600', // Made font weight a bit stronger
  },
  duration: {
    color: '#7f8c8d', // Changed to a softer gray
    fontSize: 15,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 18,
  },
  topTitle: {
    fontSize: 18, // Slightly larger font size for titles
    fontWeight: '500',
    color: '#34495e', // Darker color for better contrast
    marginBottom: 6,
    lineHeight: 24, // Increased line height for readability
  },
  subjectText: {
    fontSize: 15,
    color: '#7f8c8d', // Softer gray color for subject text
    marginBottom: 10,
  },
  videoContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  videoPlayer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bdc3c7', // Border to give a defined look
  },
  noVideoText: {
    fontSize: 15,
    color: '#e74c3c', // Changed to red for emphasis when no video is available
    textAlign: 'center',
    marginVertical: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // Increased padding to prevent content from being too close to edges
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#e74c3c', // Red for error icon
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db', // Consistent with the badge color
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#95a5a6', // Softer gray for empty state
  },
  emptyText: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 30, // More padding at the bottom for scrollable content
  },
});

export default React.memo(FreeLecture);
