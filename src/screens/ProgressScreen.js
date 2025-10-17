import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import StorageService from '../services/StorageService';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const screenWidth = Dimensions.get('window').width;

const ProgressScreen = () => {
  const [progressType, setProgressType] = useState('body'); // 'body' or 'exercise'
  const [selectedMetric, setSelectedMetric] = useState('weight'); // weight, caloriesBurned, caloriesConsumed
  const [cardioMetric, setCardioMetric] = useState('pace'); // pace or distance
  const [timeView, setTimeView] = useState('week'); // week, month, year, allTime
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [currentYearOffset, setCurrentYearOffset] = useState(0);
  const [bodyData, setBodyData] = useState([]);
  const [exerciseData, setExerciseData] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    const progressData = await StorageService.getProgressData();
    if (progressData.bodyMetrics) {
      setBodyData(progressData.bodyMetrics);
    } else {
      // Initialize with sample data
      const sampleData = generateSampleData();
      setBodyData(sampleData.bodyMetrics);
      setExerciseData(sampleData.exercises);
      setAvailableExercises(Object.keys(sampleData.exercises));
      await StorageService.saveProgressData({
        bodyMetrics: sampleData.bodyMetrics,
        exercises: sampleData.exercises
      });
    }
  };

  const generateSampleData = () => {
    const today = new Date();
    const bodyMetrics = [];
    const exercises = {
      'Running': [],
      'Cycling': [],
      'Swimming': [],
      'Bench Press': [],
      'Squats': [],
      'Deadlifts': []
    };

    // Generate 30 days of body metrics data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      bodyMetrics.push({
        date: date.toISOString(),
        weight: 150 + Math.random() * 10,
        caloriesBurned: 300 + Math.random() * 200,
        caloriesConsumed: 1800 + Math.random() * 400
      });
    }

    // Generate exercise data
    const cardioExercises = ['Running', 'Cycling', 'Swimming'];
    cardioExercises.forEach(exercise => {
      for (let i = 0; i < 10; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        exercises[exercise].push({
          date: date.toISOString(),
          distance: (Math.random() * 10 + 1).toFixed(2),
          duration: Math.floor(Math.random() * 60 + 20),
          pace: (Math.random() * 3 + 5).toFixed(2)
        });
      }
    });

    return { bodyMetrics, exercises };
  };

  const getChartData = () => {
    if (progressType === 'body') {
      return getBodyChartData();
    } else {
      return getExerciseChartData();
    }
  };

  const getBodyChartData = () => {
    let filteredData = [];
    let labels = [];

    const now = new Date();

    switch (timeView) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (currentWeekOffset * 7));
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
          const targetDate = new Date(weekStart);
          targetDate.setDate(weekStart.getDate() + i);
          const dayData = bodyData.find(d =>
            new Date(d.date).toDateString() === targetDate.toDateString()
          );
          filteredData.push(dayData ? dayData[selectedMetric] : 0);
        }
        break;

      case 'month':
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
          if (i % 5 === 1) labels.push(i.toString());
          const targetDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
          const dayData = bodyData.find(d =>
            new Date(d.date).toDateString() === targetDate.toDateString()
          );
          filteredData.push(dayData ? dayData[selectedMetric] : 0);
        }
        break;

      case 'year':
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let month = 0; month < 12; month++) {
          const monthData = bodyData.filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === year && date.getMonth() === month;
          });
          const avg = monthData.length > 0
            ? monthData.reduce((sum, d) => sum + d[selectedMetric], 0) / monthData.length
            : 0;
          filteredData.push(avg);
        }
        break;

      case 'allTime':
        // Show monthly averages for all time
        const allMonths = {};
        bodyData.forEach(d => {
          const date = new Date(d.date);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!allMonths[key]) {
            allMonths[key] = [];
          }
          allMonths[key].push(d[selectedMetric]);
        });

        Object.keys(allMonths).sort().slice(-12).forEach(key => {
          const [year, month] = key.split('-');
          labels.push(`${month}/${year.slice(-2)}`);
          const values = allMonths[key];
          filteredData.push(values.reduce((a, b) => a + b, 0) / values.length);
        });
        break;
    }

    return {
      labels,
      datasets: [{
        data: filteredData.length > 0 ? filteredData : [0],
        strokeWidth: 2
      }]
    };
  };

  const getExerciseChartData = () => {
    if (!selectedExercise || !exerciseData[selectedExercise]) {
      return {
        labels: [],
        datasets: [{ data: [0] }]
      };
    }

    const cardioExercises = ['Running', 'Cycling', 'Swimming'];
    if (!cardioExercises.includes(selectedExercise)) {
      return {
        labels: [],
        datasets: [{ data: [0] }]
      };
    }

    let filteredData = [];
    let labels = [];
    const exerciseSessions = exerciseData[selectedExercise] || [];
    const now = new Date();

    switch (timeView) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (currentWeekOffset * 7));
        labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
          const targetDate = new Date(weekStart);
          targetDate.setDate(weekStart.getDate() + i);
          const dayData = exerciseSessions.filter(d =>
            new Date(d.date).toDateString() === targetDate.toDateString()
          );

          if (dayData.length > 0) {
            const avgValue = dayData.reduce((sum, d) => {
              return sum + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance);
            }, 0) / dayData.length;
            filteredData.push(avgValue);
          } else {
            filteredData.push(0);
          }
        }
        break;

      case 'month':
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

        // Show weekly averages for month view
        for (let week = 0; week < 4; week++) {
          labels.push(`Week ${week + 1}`);
          const weekStart = new Date(monthDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const weekData = exerciseSessions.filter(d => {
            const date = new Date(d.date);
            return date >= weekStart && date <= weekEnd;
          });

          if (weekData.length > 0) {
            const avgValue = weekData.reduce((sum, d) => {
              return sum + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance);
            }, 0) / weekData.length;
            filteredData.push(avgValue);
          } else {
            filteredData.push(0);
          }
        }
        break;

      case 'year':
        const year = now.getFullYear() - currentYearOffset;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let month = 0; month < 12; month++) {
          const monthData = exerciseSessions.filter(d => {
            const date = new Date(d.date);
            return date.getFullYear() === year && date.getMonth() === month;
          });

          if (monthData.length > 0) {
            const avgValue = monthData.reduce((sum, d) => {
              return sum + parseFloat(cardioMetric === 'pace' ? d.pace : d.distance);
            }, 0) / monthData.length;
            filteredData.push(avgValue);
          } else {
            filteredData.push(0);
          }
        }
        break;

      case 'allTime':
        // Show monthly averages for all time
        const allMonths = {};
        exerciseSessions.forEach(d => {
          const date = new Date(d.date);
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!allMonths[key]) {
            allMonths[key] = [];
          }
          allMonths[key].push(parseFloat(cardioMetric === 'pace' ? d.pace : d.distance));
        });

        Object.keys(allMonths).sort().slice(-12).forEach(key => {
          const [year, month] = key.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          labels.push(`${monthNames[parseInt(month)]} ${year.slice(-2)}`);
          const values = allMonths[key];
          filteredData.push(values.reduce((a, b) => a + b, 0) / values.length);
        });
        break;
    }

    return {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: filteredData.length > 0 ? filteredData : [0],
        strokeWidth: 2
      }]
    };
  };

  const getCurrentPeriodLabel = () => {
    const now = new Date();

    switch (timeView) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (currentWeekOffset * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

      case 'month':
        const monthDate = new Date(now.getFullYear(), now.getMonth() - currentMonthOffset, 1);
        return monthDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

      case 'year':
        return (now.getFullYear() - currentYearOffset).toString();

      case 'allTime':
        return 'All Time';

      default:
        return '';
    }
  };

  const handleSwipe = (direction) => {
    switch (timeView) {
      case 'week':
        setCurrentWeekOffset(prev => prev + direction);
        break;
      case 'month':
        setCurrentMonthOffset(prev => prev + direction);
        break;
      case 'year':
        setCurrentYearOffset(prev => prev + direction);
        break;
    }
  };

  const renderExerciseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => {
        setSelectedExercise(item);
        setExerciseModalVisible(false);
      }}
    >
      <Text style={styles.exerciseItemText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderCardioSession = ({ item }) => (
    <View style={styles.cardioSession}>
      <Text style={styles.sessionDate}>
        {new Date(item.date).toLocaleDateString()}
      </Text>
      <View style={styles.sessionDetails}>
        <View style={styles.sessionMetric}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{item.distance} km</Text>
        </View>
        <View style={styles.sessionMetric}>
          <Text style={styles.metricLabel}>Duration</Text>
          <Text style={styles.metricValue}>{item.duration} min</Text>
        </View>
        <View style={styles.sessionMetric}>
          <Text style={styles.metricLabel}>Pace</Text>
          <Text style={styles.metricValue}>{item.pace} min/km</Text>
        </View>
      </View>
    </View>
  );

  const chartConfig = {
    backgroundGradientFrom: Colors.cardBackground,
    backgroundGradientTo: Colors.background,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(88, 216, 219, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(88, 216, 219, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.text
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Progress Tracking</Text>

      {/* Progress Type Selector */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, progressType === 'body' && styles.typeButtonActive]}
          onPress={() => setProgressType('body')}
        >
          <Text style={[styles.typeText, progressType === 'body' && styles.typeTextActive]}>
            Body Metrics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, progressType === 'exercise' && styles.typeButtonActive]}
          onPress={() => setProgressType('exercise')}
        >
          <Text style={[styles.typeText, progressType === 'exercise' && styles.typeTextActive]}>
            Exercise Progress
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Metrics Section */}
      {progressType === 'body' && (
        <>
          {/* Metric Selector */}
          <View style={styles.metricSelector}>
            <TouchableOpacity
              style={[styles.metricButton, selectedMetric === 'weight' && styles.metricButtonActive]}
              onPress={() => setSelectedMetric('weight')}
            >
              <Text style={[styles.metricText, selectedMetric === 'weight' && styles.metricTextActive]}>
                Weight
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.metricButton, selectedMetric === 'caloriesBurned' && styles.metricButtonActive]}
              onPress={() => setSelectedMetric('caloriesBurned')}
            >
              <Text style={[styles.metricText, selectedMetric === 'caloriesBurned' && styles.metricTextActive]}>
                Calories Burned
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.metricButton, selectedMetric === 'caloriesConsumed' && styles.metricButtonActive]}
              onPress={() => setSelectedMetric('caloriesConsumed')}
            >
              <Text style={[styles.metricText, selectedMetric === 'caloriesConsumed' && styles.metricTextActive]}>
                Calories Consumed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time View Selector */}
          <View style={styles.timeViewSelector}>
            {['week', 'month', 'year', 'allTime'].map(view => (
              <TouchableOpacity
                key={view}
                style={[styles.timeButton, timeView === view && styles.timeButtonActive]}
                onPress={() => {
                  setTimeView(view);
                  setCurrentWeekOffset(0);
                  setCurrentMonthOffset(0);
                  setCurrentYearOffset(0);
                }}
              >
                <Text style={[styles.timeText, timeView === view && styles.timeTextActive]}>
                  {view === 'allTime' ? 'All' : view.charAt(0).toUpperCase() + view.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Period Navigation */}
          {timeView !== 'allTime' && (
            <View style={styles.periodNav}>
              <TouchableOpacity onPress={() => handleSwipe(1)}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.periodLabel}>{getCurrentPeriodLabel()}</Text>
              <TouchableOpacity
                onPress={() => handleSwipe(-1)}
                disabled={
                  (timeView === 'week' && currentWeekOffset === 0) ||
                  (timeView === 'month' && currentMonthOffset === 0) ||
                  (timeView === 'year' && currentYearOffset === 0)
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={
                    ((timeView === 'week' && currentWeekOffset === 0) ||
                    (timeView === 'month' && currentMonthOffset === 0) ||
                    (timeView === 'year' && currentYearOffset === 0))
                    ? '#ccc' : '#007AFF'
                  }
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Chart */}
          <View style={styles.chartContainer}>
            <LineChart
              data={getChartData()}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Add Data Button */}
          <TouchableOpacity
            style={styles.addDataButton}
            onPress={() => setInputModalVisible(true)}
          >
            <Text style={styles.addDataButtonText}>+ Log Today's Data</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Exercise Progress Section */}
      {progressType === 'exercise' && (
        <>
          <TouchableOpacity
            style={styles.selectExerciseButton}
            onPress={() => setExerciseModalVisible(true)}
          >
            <Text style={styles.selectExerciseText}>
              {selectedExercise || 'Select Exercise'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {selectedExercise && ['Running', 'Cycling', 'Swimming'].includes(selectedExercise) && (
            <>
              {/* Cardio Metric Selector */}
              <View style={styles.metricSelector}>
                <TouchableOpacity
                  style={[styles.metricButton, cardioMetric === 'pace' && styles.metricButtonActive]}
                  onPress={() => setCardioMetric('pace')}
                >
                  <Text style={[styles.metricText, cardioMetric === 'pace' && styles.metricTextActive]}>
                    Pace
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.metricButton, cardioMetric === 'distance' && styles.metricButtonActive]}
                  onPress={() => setCardioMetric('distance')}
                >
                  <Text style={[styles.metricText, cardioMetric === 'distance' && styles.metricTextActive]}>
                    Distance
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Time View Selector */}
              <View style={styles.timeViewSelector}>
                {['week', 'month', 'year', 'allTime'].map(view => (
                  <TouchableOpacity
                    key={view}
                    style={[styles.timeButton, timeView === view && styles.timeButtonActive]}
                    onPress={() => {
                      setTimeView(view);
                      setCurrentWeekOffset(0);
                      setCurrentMonthOffset(0);
                      setCurrentYearOffset(0);
                    }}
                  >
                    <Text style={[styles.timeText, timeView === view && styles.timeTextActive]}>
                      {view === 'allTime' ? 'All' : view.charAt(0).toUpperCase() + view.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Period Navigation */}
              {timeView !== 'allTime' && (
                <View style={styles.periodNav}>
                  <TouchableOpacity onPress={() => handleSwipe(1)}>
                    <Ionicons name="chevron-back" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.periodLabel}>{getCurrentPeriodLabel()}</Text>
                  <TouchableOpacity
                    onPress={() => handleSwipe(-1)}
                    disabled={
                      (timeView === 'week' && currentWeekOffset === 0) ||
                      (timeView === 'month' && currentMonthOffset === 0) ||
                      (timeView === 'year' && currentYearOffset === 0)
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={
                        ((timeView === 'week' && currentWeekOffset === 0) ||
                        (timeView === 'month' && currentMonthOffset === 0) ||
                        (timeView === 'year' && currentYearOffset === 0))
                        ? Colors.gray : Colors.primary
                      }
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Cardio Progress Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>
                  {cardioMetric === 'pace' ? 'Pace (min/km)' : 'Distance (km)'}
                </Text>
                <LineChart
                  data={getExerciseChartData()}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => cardioMetric === 'pace'
                      ? `rgba(88, 216, 219, ${opacity})`
                      : `rgba(40, 59, 137, ${opacity})`,
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: cardioMetric === 'pace' ? Colors.text : Colors.primary
                    }
                  }}
                  bezier
                  style={styles.chart}
                  yAxisLabel=""
                  yAxisSuffix={cardioMetric === 'pace' ? '' : ' km'}
                />
              </View>

              {/* Recent Sessions */}
              <Text style={styles.exerciseTitle}>Recent {selectedExercise} Sessions</Text>
              <FlatList
                data={(exerciseData[selectedExercise] || []).slice(0, 5)}
                renderItem={renderCardioSession}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            </>
          )}

          {selectedExercise && !['Running', 'Cycling', 'Swimming'].includes(selectedExercise) && (
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthText}>Strength exercise tracking coming soon!</Text>
            </View>
          )}
        </>
      )}

      {/* Exercise Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseModalVisible}
        onRequestClose={() => setExerciseModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <FlatList
              data={availableExercises}
              renderItem={renderExerciseItem}
              keyExtractor={(item) => item}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setExerciseModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input Data Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={inputModalVisible}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Log {selectedMetric === 'weight' ? 'Weight' :
                   selectedMetric === 'caloriesBurned' ? 'Calories Burned' :
                   'Calories Consumed'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${selectedMetric}`}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setInputModalVisible(false);
                  setInputValue('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  // Save the data
                  const newEntry = {
                    date: new Date().toISOString(),
                    [selectedMetric]: parseFloat(inputValue)
                  };
                  const updatedData = [...bodyData, newEntry];
                  setBodyData(updatedData);
                  await StorageService.saveProgressData({ bodyMetrics: updatedData });
                  setInputModalVisible(false);
                  setInputValue('');
                }}
              >
                <Text style={[styles.buttonText, { color: 'white' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: Colors.cardBackground,
    borderRadius: 25,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    fontSize: 15,
    color: Colors.gray,
  },
  typeTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  metricSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: Colors.cardBackground,
  },
  metricButtonActive: {
    backgroundColor: Colors.primary,
  },
  metricText: {
    fontSize: 13,
    color: Colors.gray,
  },
  metricTextActive: {
    color: Colors.white,
    fontWeight: '500',
  },
  timeViewSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
  },
  timeButtonActive: {
    backgroundColor: Colors.text,
  },
  timeText: {
    fontSize: 14,
    color: Colors.gray,
  },
  timeTextActive: {
    color: Colors.background,
    fontWeight: '500',
  },
  periodNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  chartContainer: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
  addDataButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  addDataButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  selectExerciseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectExerciseText: {
    fontSize: 16,
    color: Colors.text,
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 15,
    color: Colors.text,
  },
  cardioSession: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.text,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  strengthContainer: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  strengthText: {
    fontSize: 16,
    color: Colors.gray,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.modalBackground,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text,
  },
  exerciseItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  exerciseItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.darkGray,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ProgressScreen;