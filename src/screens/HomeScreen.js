import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = () => {
  const [selectedMetric, setSelectedMetric] = useState('calories');
  const [timePeriod, setTimePeriod] = useState('week');

  const metrics = [
    { id: 'calories', label: 'Calories Burned', unit: 'kcal' },
    { id: 'weight', label: 'Body Weight', unit: 'kg' },
    { id: 'workouts', label: 'Workouts Completed', unit: '' },
    { id: 'duration', label: 'Workout Duration', unit: 'min' },
  ];

  const timePeriods = [
    { id: 'week', label: 'Week', icon: 'calendar-outline' },
    { id: 'month', label: 'Month', icon: 'calendar' },
    { id: 'year', label: 'Year', icon: 'calendar-sharp' },
    { id: 'all', label: 'All Time', icon: 'time-outline' },
  ];

  // Extended sample data for different time periods
  const sampleData = {
    calories: {
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [420, 380, 450, 390, 480, 520, 410],
        }],
      },
      month: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: [2850, 3100, 2950, 3200],
        }],
      },
      year: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: [12000, 11500, 13200, 12800, 14000, 13500, 14200, 13800, 12900, 13100, 12500, 13000],
        }],
      },
      all: {
        labels: ['2023', '2024', '2025'],
        datasets: [{
          data: [145000, 156000, 8500],
        }],
      },
    },
    weight: {
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [75.2, 75.1, 74.9, 74.8, 74.7, 74.5, 74.3],
        }],
      },
      month: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: [75.2, 74.8, 74.5, 74.1],
        }],
      },
      year: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: [78, 77.5, 77, 76.5, 76, 75.8, 75.5, 75.2, 74.9, 74.6, 74.3, 74.1],
        }],
      },
      all: {
        labels: ['2023', '2024', '2025'],
        datasets: [{
          data: [82, 78, 74.1],
        }],
      },
    },
    workouts: {
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [1, 0, 1, 1, 0, 1, 0],
        }],
      },
      month: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: [4, 5, 4, 3],
        }],
      },
      year: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: [18, 16, 20, 19, 22, 21, 20, 18, 17, 19, 16, 18],
        }],
      },
      all: {
        labels: ['2023', '2024', '2025'],
        datasets: [{
          data: [180, 234, 12],
        }],
      },
    },
    duration: {
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          data: [45, 0, 60, 30, 0, 75, 0],
        }],
      },
      month: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          data: [210, 285, 195, 240],
        }],
      },
      year: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: [950, 880, 1020, 980, 1100, 1050, 990, 920, 870, 960, 840, 910],
        }],
      },
      all: {
        labels: ['2023', '2024', '2025'],
        datasets: [{
          data: [9200, 11500, 620],
        }],
      },
    },
  };

  // Get stats based on current time period
  const getStats = () => {
    switch(timePeriod) {
      case 'week':
        return {
          calories: '2,450',
          workouts: '4',
          weight: '74.1',
          minutes: '210'
        };
      case 'month':
        return {
          calories: '12,100',
          workouts: '16',
          weight: '74.1',
          minutes: '930'
        };
      case 'year':
        return {
          calories: '156,500',
          workouts: '234',
          weight: '74.1',
          minutes: '11,470'
        };
      case 'all':
        return {
          calories: '309,500',
          workouts: '426',
          weight: '74.1',
          minutes: '21,320'
        };
      default:
        return {
          calories: '2,450',
          workouts: '4',
          weight: '74.1',
          minutes: '210'
        };
    }
  };

  const chartConfig = {
    backgroundColor: Colors.cardBackground,
    backgroundGradientFrom: Colors.cardBackground,
    backgroundGradientTo: Colors.cardBackground,
    decimalPlaces: selectedMetric === 'weight' ? 1 : 0,
    color: (opacity = 1) => `rgba(40, 59, 137, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(88, 216, 219, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  const currentMetric = metrics.find(m => m.id === selectedMetric);
  const currentData = sampleData[selectedMetric][timePeriod];
  const currentStats = getStats();

  // Adjust chart width based on number of data points
  const getChartWidth = () => {
    const dataLength = currentData.labels.length;
    if (dataLength > 7) {
      return Math.max(screenWidth - 40, dataLength * 50);
    }
    return screenWidth - 40;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Track your fitness journey</Text>
      </View>

      <View style={styles.timePeriodContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {timePeriods.map(period => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.timePeriodButton,
                timePeriod === period.id && styles.timePeriodButtonActive,
              ]}
              onPress={() => setTimePeriod(period.id)}
            >
              <Ionicons
                name={period.icon}
                size={16}
                color={timePeriod === period.id ? Colors.white : Colors.gray}
              />
              <Text
                style={[
                  styles.timePeriodButtonText,
                  timePeriod === period.id && styles.timePeriodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.metricSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {metrics.map(metric => (
            <TouchableOpacity
              key={metric.id}
              style={[
                styles.metricButton,
                selectedMetric === metric.id && styles.metricButtonActive,
              ]}
              onPress={() => setSelectedMetric(metric.id)}
            >
              <Text
                style={[
                  styles.metricButtonText,
                  selectedMetric === metric.id && styles.metricButtonTextActive,
                ]}
              >
                {metric.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {currentMetric.label} {currentMetric.unit && `(${currentMetric.unit})`}
          </Text>
          <View style={styles.timePeriodBadge}>
            <Text style={styles.timePeriodBadgeText}>
              {timePeriods.find(p => p.id === timePeriod)?.label}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <LineChart
            data={currentData}
            width={getChartWidth()}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withDots={true}
          />
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Quick Stats</Text>
          <Text style={styles.statsPeriod}>
            {timePeriods.find(p => p.id === timePeriod)?.label} Overview
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={24} color="#FF6B6B" />
            <Text style={styles.statValue}>{currentStats.calories}</Text>
            <Text style={styles.statLabel}>
              Calories {timePeriod === 'all' ? 'Total' : `This ${timePeriods.find(p => p.id === timePeriod)?.label}`}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{currentStats.workouts}</Text>
            <Text style={styles.statLabel}>
              Workouts {timePeriod === 'all' ? 'Total' : `This ${timePeriods.find(p => p.id === timePeriod)?.label}`}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="body-outline" size={24} color="#2196F3" />
            <Text style={styles.statValue}>{currentStats.weight}</Text>
            <Text style={styles.statLabel}>Current Weight (kg)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#9C27B0" />
            <Text style={styles.statValue}>{currentStats.minutes}</Text>
            <Text style={styles.statLabel}>
              Total Minutes {timePeriod !== 'all' && `This ${timePeriods.find(p => p.id === timePeriod)?.label}`}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: Colors.cardBackground,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 5,
  },
  timePeriodContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  timePeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: Colors.darkGray,
  },
  timePeriodButtonActive: {
    backgroundColor: Colors.primary,
  },
  timePeriodButtonText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
    marginLeft: 5,
  },
  timePeriodButtonTextActive: {
    color: Colors.white,
  },
  metricSelector: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  metricButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: Colors.darkGray,
  },
  metricButtonActive: {
    backgroundColor: Colors.primary,
  },
  metricButtonText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  metricButtonTextActive: {
    color: Colors.white,
  },
  chartContainer: {
    backgroundColor: Colors.cardBackground,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  timePeriodBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timePeriodBadgeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  statsPeriod: {
    fontSize: 14,
    color: Colors.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: Colors.cardBackground,
    width: '48%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;