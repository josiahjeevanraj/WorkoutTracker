import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import StorageService from '../services/StorageService';
import { Colors } from '../constants/colors';

const WorkoutsScreen = () => {
  const [workouts, setWorkouts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    const savedWorkouts = await StorageService.getWorkouts();
    if (savedWorkouts.length === 0) {
      // Add default workouts if none exist
      const defaultWorkouts = [
        { name: 'Full Body Workout', exercises: 8, duration: '45', description: 'Complete body training' },
        { name: 'Upper Body Push', exercises: 6, duration: '40', description: 'Chest, shoulders, triceps' },
        { name: 'Upper Body Pull', exercises: 6, duration: '40', description: 'Back, biceps' },
        { name: 'Leg Day', exercises: 7, duration: '50', description: 'Quads, hamstrings, glutes, calves' },
        { name: 'Core & Abs', exercises: 5, duration: '30', description: 'Core strengthening' },
        { name: 'HIIT Cardio', exercises: 8, duration: '25', description: 'High intensity intervals' },
        { name: 'Yoga Flow', exercises: 12, duration: '60', description: 'Flexibility and balance' },
        { name: 'Strength Training', exercises: 5, duration: '45', description: 'Heavy compound lifts' },
      ];

      for (const workout of defaultWorkouts) {
        await StorageService.addWorkout(workout);
      }
      const updatedWorkouts = await StorageService.getWorkouts();
      setWorkouts(updatedWorkouts);
    } else {
      setWorkouts(savedWorkouts);
    }
  };

  const handleAddWorkout = async () => {
    if (!workoutName || !exercises || !duration) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const newWorkout = {
      name: workoutName,
      exercises: parseInt(exercises),
      duration: duration,
      description: 'Custom workout'
    };

    const added = await StorageService.addWorkout(newWorkout);
    if (added) {
      await loadWorkouts();
      setModalVisible(false);
      setWorkoutName('');
      setExercises('');
      setDuration('');
    }
  };

  const handleDeleteWorkout = (id) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteWorkout(id);
            await loadWorkouts();
          }
        }
      ]
    );
  };

  const renderWorkoutItem = ({ item }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onLongPress={() => handleDeleteWorkout(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.duration} min</Text>
        </View>
      </View>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      <View style={styles.workoutDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Exercises</Text>
          <Text style={styles.detailValue}>{item.exercises}</Text>
        </View>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Library</Text>
        <Text style={styles.subtitle}>{workouts.length} workouts available</Text>
      </View>
      <FlatList
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Workout</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Workout</Text>

            <TextInput
              style={styles.input}
              placeholder="Workout Name"
              placeholderTextColor={Colors.gray}
              value={workoutName}
              onChangeText={setWorkoutName}
            />

            <TextInput
              style={styles.input}
              placeholder="Number of Exercises"
              placeholderTextColor={Colors.gray}
              value={exercises}
              onChangeText={setExercises}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Duration (minutes)"
              placeholderTextColor={Colors.gray}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddWorkout}
              >
                <Text style={[styles.buttonText, { color: Colors.white }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  workoutCard: {
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  badgeText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  workoutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'column',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: Colors.primary,
    margin: 20,
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
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
    padding: 25,
    width: '90%',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
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
});

export default WorkoutsScreen;