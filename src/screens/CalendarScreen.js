import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const CalendarScreen = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
  const [calendarHeight] = useState(new Animated.Value(350));
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState({
    caloriesConsumed: '',
    caloriesBurned: '',
    weight: '',
    workouts: [],
  });
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [customWorkoutInput, setCustomWorkoutInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [strengthInput, setStrengthInput] = useState({
    sets: [],
  });
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Predefined workout options organized by category
  const workoutCategories = {
    'Upper Body Push': [
      'Push-ups',
      'Bench press (barbell)',
      'Bench press (dumbbell)',
      'Incline bench press',
      'Decline bench press',
      'Overhead press (military press)',
      'Shoulder press (dumbbell)',
      'Arnold press',
      'Lateral raises',
      'Front raises',
      'Rear delt flyes',
      'Tricep dips',
      'Close-grip bench press',
      'Tricep pushdowns',
      'Overhead tricep extension',
    ],
    'Upper Body Pull': [
      'Pull-ups',
      'Chin-ups',
      'Lat pulldowns',
      'Seated cable rows',
      'Bent-over barbell rows',
      'T-bar rows',
      'One-arm dumbbell rows',
      'Face pulls',
      'Reverse flyes',
      'Shrugs',
      'Barbell curls',
      'Dumbbell curls',
      'Hammer curls',
      'Preacher curls',
      'Cable curls',
    ],
    'Lower Body': [
      'Squats (bodyweight)',
      'Back squats (barbell)',
      'Front squats',
      'Goblet squats',
      'Bulgarian split squats',
      'Lunges (forward)',
      'Reverse lunges',
      'Walking lunges',
      'Lateral lunges',
      'Deadlifts (conventional)',
      'Romanian deadlifts',
      'Sumo deadlifts',
      'Single-leg deadlifts',
      'Hip thrusts',
      'Glute bridges',
      'Leg press',
      'Leg extensions',
      'Leg curls (hamstring)',
      'Calf raises (standing)',
      'Calf raises (seated)',
    ],
    'Core & Abs': [
      'Planks',
      'Side planks',
      'Crunches',
      'Bicycle crunches',
      'Russian twists',
      'Mountain climbers',
      'Dead bugs',
      'Bird dogs',
      'Hanging knee raises',
      'Leg raises',
      'Sit-ups',
      'V-ups',
      'Hollow body holds',
      'Ab wheel rollouts',
      'Wood choppers',
    ],
    'Compound Movements': [
      'Burpees',
      'Thrusters',
      'Man makers',
      'Turkish get-ups',
      'Clean and press',
      'Snatches',
      'Clean and jerk',
      'Farmer\'s walks',
      'Bear crawls',
      'Renegade rows',
    ],
    'Machine Exercises': [
      'Cable crossovers',
      'Pec deck flyes',
      'Machine shoulder press',
      'Lat pulldown variations',
      'Cable bicep curls',
      'Cable tricep extensions',
      'Leg press variations',
      'Smith machine squats',
      'Cable upright rows',
      'Machine rows',
    ],
    'Functional & Bodyweight': [
      'Jump squats',
      'Pistol squats',
      'Wall sits',
      'Step-ups',
      'Box jumps',
      'Jump lunges',
      'Pike push-ups',
      'Diamond push-ups',
      'Wide-grip push-ups',
      'Handstand push-ups',
      'Pull-up variations',
      'Dip variations',
      'Single-arm planks',
      'Plank variations',
      'Bodyweight rows',
    ],
    'Cardio': [
      'Running (treadmill)',
      'Running (outdoor)',
      'Walking (brisk)',
      'Cycling (stationary bike)',
      'Cycling (outdoor)',
      'Elliptical machine',
      'Rowing machine',
      'Stair climber',
      'Jump rope',
      'High-intensity interval training (HIIT)',
      'Swimming',
      'Dancing',
      'Kickboxing',
      'Spinning classes',
      'Zumba',
      'Step aerobics',
      'Circuit training',
      'Battle ropes',
      'Mountain climbers',
      'Burpees',
      'Jumping jacks',
      'Cross-training',
      'Incline walking',
      'Stationary rowing',
      'Shadow boxing',
    ],
    'Team Sports': [
      'Basketball',
      'Soccer (Football)',
      'Volleyball',
      'American Football',
      'Baseball',
      'Softball',
      'Hockey (Ice/Field)',
      'Rugby',
      'Cricket',
      'Lacrosse',
    ],
    'Racquet Sports': [
      'Tennis',
      'Badminton',
      'Squash',
      'Table tennis',
      'Pickleball',
      'Racquetball',
    ],
    'Individual Sports': [
      'Golf',
      'Swimming',
      'Track and field',
      'Gymnastics',
      'Martial arts (Karate, Taekwondo, Jiu-Jitsu)',
      'Boxing',
      'Wrestling',
      'Rock climbing',
      'Surfing',
      'Skiing/Snowboarding',
    ],
    'Water Sports': [
      'Water polo',
      'Diving',
      'Sailing',
      'Kayaking',
      'Paddleboarding',
      'Windsurfing',
    ],
  };

  // Common duration presets for quick selection
  const durationPresets = ['15', '20', '30', '45', '60', '75', '90', '120'];

  // Common reps presets for quick selection
  const repsPresets = ['6', '8', '10', '12', '15', '20'];

  // Initial mock data - in production, this would come from a database
  const [fitnessData, setFitnessData] = useState({
    '2025-01-20': {
      caloriesConsumed: 2100,
      caloriesBurned: 450,
      weight: 74.5,
      workouts: ['Running - 30 mins', 'Bench Press - Set 1: 60kg x 10, Set 2: 60kg x 10, Set 3: 55kg x 12'],
    },
    '2025-01-21': {
      caloriesConsumed: 1850,
      caloriesBurned: 320,
      weight: 74.3,
      workouts: ['Squat - Set 1: 80kg x 8, Set 2: 80kg x 8, Set 3: 75kg x 10, Set 4: 75kg x 10', 'Pull-ups - Set 1: 10, Set 2: 8, Set 3: 6'],
    },
    '2025-01-22': {
      caloriesConsumed: 2250,
      caloriesBurned: 580,
      weight: 74.2,
      workouts: ['Swimming - 45 mins', 'Cycling - 30 mins'],
    },
    '2025-01-23': {
      caloriesConsumed: 1950,
      caloriesBurned: 210,
      weight: 74.1,
      workouts: ['Walking - 20 mins'],
    },
    '2025-01-24': {
      caloriesConsumed: 2000,
      caloriesBurned: 520,
      weight: 74.0,
      workouts: ['HIIT Training - 30 mins', 'Deadlift - Set 1: 100kg x 6, Set 2: 100kg x 6, Set 3: 105kg x 5'],
    },
  });

  // Get marked dates for calendar
  const getMarkedDates = () => {
    const marked = {};
    Object.keys(fitnessData).forEach(date => {
      marked[date] = { marked: true, dotColor: Colors.success };
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: Colors.primary,
      };
    }
    return marked;
  };

  // Toggle calendar collapse/expand
  const toggleCalendar = () => {
    const toValue = isCalendarCollapsed ? 350 : 80;
    Animated.timing(calendarHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsCalendarCollapsed(!isCalendarCollapsed);
  };

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filter workouts based on search query
  const getFilteredWorkouts = () => {
    // Always return all categories when the selector is first opened
    if (!showWorkoutSelector) {
      return workoutCategories;
    }

    if (!searchQuery.trim()) {
      return workoutCategories;
    }

    const filtered = {};
    Object.entries(workoutCategories).forEach(([category, workouts]) => {
      const filteredWorkouts = workouts.filter(workout =>
        workout.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredWorkouts.length > 0) {
        filtered[category] = filteredWorkouts;
      }
    });
    return filtered;
  };

  // Auto-expand categories when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const filteredWorkouts = getFilteredWorkouts();
      const newExpandedCategories = {};
      Object.keys(filteredWorkouts).forEach(category => {
        newExpandedCategories[category] = true;
      });
      setExpandedCategories(newExpandedCategories);
    }
  }, [searchQuery]);

  // Start editing mode
  const startEditing = () => {
    if (!selectedDate) {
      Alert.alert('No Date Selected', 'Please select a date to add or edit data.');
      return;
    }

    const existingData = fitnessData[selectedDate];
    if (existingData) {
      setEditingData({
        caloriesConsumed: existingData.caloriesConsumed.toString(),
        caloriesBurned: existingData.caloriesBurned.toString(),
        weight: existingData.weight ? existingData.weight.toString() : '',
        workouts: [...existingData.workouts],
      });
    } else {
      setEditingData({
        caloriesConsumed: '',
        caloriesBurned: '',
        weight: '',
        workouts: [],
      });
    }
    setIsEditing(true);
  };

  // Save edited data
  const saveData = () => {
    if (!editingData.caloriesConsumed || !editingData.caloriesBurned) {
      Alert.alert('Missing Data', 'Please enter calories consumed and burned.');
      return;
    }

    const newData = {
      caloriesConsumed: parseInt(editingData.caloriesConsumed) || 0,
      caloriesBurned: parseInt(editingData.caloriesBurned) || 0,
      weight: editingData.weight ? parseFloat(editingData.weight) : null,
      workouts: editingData.workouts.filter(w => w.trim() !== ''),
    };

    setFitnessData(prev => ({
      ...prev,
      [selectedDate]: newData,
    }));

    setIsEditing(false);
    setShowWorkoutSelector(false);
    setExpandedCategories({});
    Alert.alert('Success', 'Data saved successfully!');
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditingData({
      caloriesConsumed: '',
      caloriesBurned: '',
      weight: '',
      workouts: [],
    });
    setShowWorkoutSelector(false);
    setExpandedCategories({});
    setCustomWorkoutInput('');
    setSearchQuery('');
  };

  // Handle workout selection based on category
  const handleWorkoutSelection = (workout, category) => {
    if (category === 'Cardio' || category === 'Team Sports' || category === 'Racquet Sports' ||
        category === 'Individual Sports' || category === 'Water Sports') {
      // For cardio and sports, show duration modal
      setSelectedExercise(workout);
      setDurationInput('');
      setShowDurationModal(true);
    } else if (category === 'Upper Body Push' || category === 'Upper Body Pull' ||
               category === 'Lower Body' || category === 'Core & Abs' ||
               category === 'Compound Movements' || category === 'Machine Exercises' ||
               category === 'Functional & Bodyweight') {
      // For strength training categories, show individual sets modal
      setSelectedExercise(workout);
      setStrengthInput({ sets: [{ weight: '', reps: '' }] });
      setShowStrengthModal(true);
    } else {
      // For other categories, add directly
      addWorkout(workout);
    }
  };

  // Add workout with duration
  const addWorkoutWithDuration = () => {
    if (durationInput.trim()) {
      const workoutWithDuration = `${selectedExercise} - ${durationInput} mins`;
      addWorkout(workoutWithDuration);
      setShowDurationModal(false);
      setDurationInput('');
      setSelectedExercise('');
    } else {
      Alert.alert('Missing Duration', 'Please enter the duration in minutes.');
    }
  };

  // Add a new set
  const addSet = () => {
    setStrengthInput(prev => ({
      ...prev,
      sets: [...prev.sets, { weight: '', reps: '' }]
    }));
  };

  // Remove a set
  const removeSet = (index) => {
    setStrengthInput(prev => ({
      ...prev,
      sets: prev.sets.filter((_, i) => i !== index)
    }));
  };

  // Update a specific set's data
  const updateSet = (index, field, value) => {
    setStrengthInput(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) =>
        i === index ? { ...set, [field]: value } : set
      )
    }));
  };

  // Add strength workout with individual set details
  const addStrengthWorkout = () => {
    const { sets } = strengthInput;

    // Validate that all sets have reps entered
    const validSets = sets.filter(set => set.reps.trim());
    if (validSets.length === 0) {
      Alert.alert('Missing Data', 'Please enter reps for at least one set.');
      return;
    }

    // Build workout string with individual set details
    let workoutString = selectedExercise + ' - ';
    const setStrings = validSets.map((set, index) => {
      let setString = `Set ${index + 1}: `;
      if (set.weight.trim()) {
        setString += `${set.weight}kg x ${set.reps}`;
      } else {
        setString += `${set.reps}`;
      }
      return setString;
    });
    workoutString += setStrings.join(', ');

    addWorkout(workoutString);
    setShowStrengthModal(false);
    setStrengthInput({ sets: [] });
    setSelectedExercise('');
  };

  // Add a workout
  const addWorkout = (workout) => {
    setEditingData(prev => ({
      ...prev,
      workouts: [...prev.workouts, workout],
    }));
    setShowWorkoutSelector(false);
    setCustomWorkoutInput('');
    setSearchQuery('');
  };

  // Add custom workout
  const addCustomWorkout = () => {
    if (customWorkoutInput.trim()) {
      addWorkout(customWorkoutInput.trim());
    }
  };

  // Remove a workout
  const removeWorkout = (index) => {
    const newWorkouts = editingData.workouts.filter((_, i) => i !== index);
    setEditingData(prev => ({
      ...prev,
      workouts: newWorkouts,
    }));
  };

  // Delete all data for selected date
  const deleteData = () => {
    Alert.alert(
      'Delete Data',
      `Are you sure you want to delete all data for ${selectedDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newData = { ...fitnessData };
            delete newData[selectedDate];
            setFitnessData(newData);
            setIsEditing(false);
          },
        },
      ]
    );
  };

  // Render duration modal for cardio exercises
  const renderDurationModal = () => {
    return (
      <Modal
        visible={showDurationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedExercise} Duration</Text>

            <Text style={styles.modalSubtitle}>Quick select:</Text>
            <View style={styles.presetContainer}>
              {durationPresets.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={styles.presetButton}
                  onPress={() => setDurationInput(duration)}
                >
                  <Text style={[
                    styles.presetText,
                    durationInput === duration && styles.presetTextActive
                  ]}>
                    {duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSubtitle}>Or enter custom duration:</Text>
            <View style={styles.durationInputContainer}>
              <TextInput
                style={styles.durationInput}
                value={durationInput}
                onChangeText={setDurationInput}
                placeholder="Enter duration"
                keyboardType="numeric"
                placeholderTextColor={Colors.gray}
                autoFocus
              />
              <Text style={styles.durationUnit}>mins</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDurationModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddButton, !durationInput.trim() && styles.disabledButton]}
                onPress={addWorkoutWithDuration}
                disabled={!durationInput.trim()}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render strength training modal with individual set tracking
  const renderStrengthModal = () => {
    return (
      <Modal
        visible={showStrengthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStrengthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedExercise}</Text>

              <ScrollView style={styles.setsContainer} showsVerticalScrollIndicator={false}>
                {strengthInput.sets.map((set, index) => (
                  <View key={index} style={styles.setInputRow}>
                    <Text style={styles.setLabel}>Set {index + 1}:</Text>

                    <View style={styles.setInputs}>
                      <View style={styles.weightInputContainer}>
                        <TextInput
                          style={styles.setInput}
                          value={set.weight}
                          onChangeText={(text) => updateSet(index, 'weight', text)}
                          placeholder="Weight"
                          keyboardType="numeric"
                          placeholderTextColor={Colors.gray}
                        />
                        <Text style={styles.inputUnit}>kg</Text>
                      </View>

                      <Text style={styles.multiplicationSign}>×</Text>

                      <View style={styles.repsInputContainer}>
                        <TextInput
                          style={styles.setInput}
                          value={set.reps}
                          onChangeText={(text) => updateSet(index, 'reps', text)}
                          placeholder="Reps"
                          keyboardType="numeric"
                          placeholderTextColor={Colors.gray}
                        />
                        <Text style={styles.inputUnit}>reps</Text>
                      </View>

                      {strengthInput.sets.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeSetButton}
                          onPress={() => removeSet(index)}
                        >
                          <Ionicons name="remove-circle" size={24} color="#FF6B6B" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.repsPresetContainer}>
                      <Text style={styles.presetLabel}>Quick reps:</Text>
                      {repsPresets.map((reps) => (
                        <TouchableOpacity
                          key={reps}
                          style={styles.smallPresetButton}
                          onPress={() => updateSet(index, 'reps', reps)}
                        >
                          <Text style={[
                            styles.smallPresetText,
                            set.reps === reps && styles.presetTextActive
                          ]}>
                            {reps}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
                  <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
                  <Text style={styles.addSetButtonText}>Add Another Set</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowStrengthModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalAddButton, strengthInput.sets.filter(set => set.reps.trim()).length === 0 && styles.disabledButton]}
                  onPress={addStrengthWorkout}
                  disabled={strengthInput.sets.filter(set => set.reps.trim()).length === 0}
                >
                  <Text style={styles.modalAddText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Render workout selector with collapsible categories
  const renderWorkoutSelector = () => {
    const filteredWorkouts = getFilteredWorkouts();

    return (
      <View style={styles.workoutSelectorContainer}>
        <View style={styles.selectorHeader}>
          <Text style={styles.selectorTitle}>Select Workout</Text>
          <TouchableOpacity
            onPress={() => {
              setShowWorkoutSelector(false);
              setSearchQuery('');
            }}
            style={styles.selectorCloseButton}
          >
            <Ionicons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={Colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search workouts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.gray}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.customInputContainer}>
          <TextInput
            style={styles.customInput}
            placeholder="Custom workout (e.g., Hiking - 90 mins)"
            value={customWorkoutInput}
            onChangeText={setCustomWorkoutInput}
            placeholderTextColor={Colors.gray}
          />
          <TouchableOpacity
            onPress={addCustomWorkout}
            style={[styles.customAddButton, !customWorkoutInput.trim() && styles.disabledButton]}
            disabled={!customWorkoutInput.trim()}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.categoriesContainer} showsVerticalScrollIndicator={false}>
          {Object.keys(filteredWorkouts).length === 0 ? (
            searchQuery.trim() ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={50} color={Colors.gray} />
                <Text style={styles.noResultsText}>No workouts found for "{searchQuery}"</Text>
                <Text style={styles.noResultsSubText}>Try a different search term or add a custom workout</Text>
              </View>
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="fitness-outline" size={50} color={Colors.gray} />
                <Text style={styles.noResultsText}>Select exercises to add to your workout</Text>
                <Text style={styles.noResultsSubText}>Browse categories below or add a custom workout</Text>
              </View>
            )
          ) : (
            Object.entries(filteredWorkouts).map(([category, workouts]) => (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryTitleContainer}>
                  <Ionicons
                    name={
                      category === 'Upper Body Push' ? 'arrow-up-outline' :
                      category === 'Upper Body Pull' ? 'arrow-down-outline' :
                      category === 'Lower Body' ? 'walk-outline' :
                      category === 'Core & Abs' ? 'body-outline' :
                      category === 'Compound Movements' ? 'flash-outline' :
                      category === 'Machine Exercises' ? 'cog-outline' :
                      category === 'Functional & Bodyweight' ? 'fitness-outline' :
                      category === 'Cardio' ? 'heart-outline' :
                      category === 'Team Sports' ? 'people-outline' :
                      category === 'Racquet Sports' ? 'tennisball-outline' :
                      category === 'Individual Sports' ? 'person-outline' :
                      category === 'Water Sports' ? 'water-outline' :
                      'barbell-outline'
                    }
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <Text style={styles.categoryCount}>({workouts.length})</Text>
                </View>
                <Ionicons
                  name={expandedCategories[category] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {expandedCategories[category] && (
                <Animated.View style={styles.workoutsList}>
                  {workouts.map((workout, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.workoutOption}
                      onPress={() => handleWorkoutSelection(workout, category)}
                    >
                      <Text style={styles.workoutOptionText}>{workout}</Text>
                      {(category === 'Cardio' || category === 'Team Sports' || category === 'Racquet Sports' ||
                        category === 'Individual Sports' || category === 'Water Sports') ? (
                        <Ionicons name="time-outline" size={20} color="#2196F3" />
                      ) : (category === 'Upper Body Push' || category === 'Upper Body Pull' ||
                             category === 'Lower Body' || category === 'Core & Abs' ||
                             category === 'Compound Movements' || category === 'Machine Exercises' ||
                             category === 'Functional & Bodyweight') ? (
                        <Ionicons name="fitness-outline" size={20} color="#9C27B0" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
            </View>
          )))}
        </ScrollView>
      </View>
    );
  };

  const renderEditForm = () => {
    return (
      <ScrollView style={styles.editContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.editHeader}>
          <Text style={styles.editTitle}>Edit Data for {selectedDate}</Text>
          <TouchableOpacity onPress={cancelEditing} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            <Ionicons name="restaurant-outline" size={16} color="#FF6B6B" /> Calories Consumed
          </Text>
          <TextInput
            style={styles.input}
            value={editingData.caloriesConsumed}
            onChangeText={(text) => setEditingData(prev => ({ ...prev, caloriesConsumed: text }))}
            placeholder="Enter calories consumed"
            keyboardType="numeric"
            placeholderTextColor={Colors.gray}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            <Ionicons name="flame-outline" size={16} color="#4CAF50" /> Calories Burned
          </Text>
          <TextInput
            style={styles.input}
            value={editingData.caloriesBurned}
            onChangeText={(text) => setEditingData(prev => ({ ...prev, caloriesBurned: text }))}
            placeholder="Enter calories burned"
            keyboardType="numeric"
            placeholderTextColor={Colors.gray}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            <Ionicons name="body-outline" size={16} color="#2196F3" /> Weight (kg)
          </Text>
          <TextInput
            style={styles.input}
            value={editingData.weight}
            onChangeText={(text) => setEditingData(prev => ({ ...prev, weight: text }))}
            placeholder="Enter current weight (optional)"
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.gray}
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.workoutsHeader}>
            <Text style={styles.inputLabel}>
              <Ionicons name="fitness-outline" size={16} color="#9C27B0" /> Workouts
            </Text>
            {!showWorkoutSelector && (
              <TouchableOpacity
                onPress={() => setShowWorkoutSelector(true)}
                style={styles.addButton}
              >
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>

          {editingData.workouts.map((workout, index) => (
            <View key={index} style={styles.workoutItem}>
              <View style={styles.workoutTextContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.workoutText}>{workout}</Text>
              </View>
              <TouchableOpacity onPress={() => removeWorkout(index)} style={styles.removeButton}>
                <Ionicons name="remove-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))}

          {editingData.workouts.length === 0 && !showWorkoutSelector && (
            <TouchableOpacity
              onPress={() => setShowWorkoutSelector(true)}
              style={styles.addWorkoutPrompt}
            >
              <Ionicons name="add-circle-outline" size={20} color="#666" />
              <Text style={styles.addWorkoutText}>Add a workout</Text>
            </TouchableOpacity>
          )}

          {showWorkoutSelector && renderWorkoutSelector()}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={saveData} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Data</Text>
          </TouchableOpacity>

          {fitnessData[selectedDate] && (
            <TouchableOpacity onPress={deleteData} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete Data</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderDurationModal()}
        {renderStrengthModal()}
      </ScrollView>
    );
  };

  const renderDayData = () => {
    if (!selectedDate) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.noDataText}>Select a date to view or add details</Text>
        </View>
      );
    }

    const dayData = fitnessData[selectedDate];

    if (!dayData) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="calendar-outline" size={50} color="#ccc" />
          <Text style={styles.noDataText}>No data for {selectedDate}</Text>
          <TouchableOpacity onPress={startEditing} style={styles.addDataButton}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addDataButtonText}>Add Data</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const netCalories = dayData.caloriesConsumed - dayData.caloriesBurned;

    return (
      <View style={styles.dataContainer}>
        <View style={styles.dataHeader}>
          <Text style={styles.dateHeader}>{selectedDate}</Text>
          <TouchableOpacity onPress={startEditing} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="restaurant-outline" size={24} color="#FF6B6B" />
            <Text style={styles.statValue}>{dayData.caloriesConsumed}</Text>
            <Text style={styles.statLabel}>Calories Consumed</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>{dayData.caloriesBurned}</Text>
            <Text style={styles.statLabel}>Calories Burned</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name={netCalories > 0 ? "trending-up-outline" : netCalories < 0 ? "trending-down-outline" : "remove-outline"}
              size={24}
              color={netCalories > 0 ? "#FF6B6B" : netCalories < 0 ? "#4CAF50" : "#FFA500"}
            />
            <Text style={[styles.statValue, netCalories > 0 ? styles.surplus : netCalories < 0 ? styles.deficit : styles.maintenance]}>
              {netCalories > 0 ? '+' : ''}{netCalories}
            </Text>
            <Text style={styles.statLabel}>
              {netCalories > 0 ? 'Caloric Surplus' : netCalories < 0 ? 'Caloric Deficit' : 'Maintenance'}
            </Text>
          </View>
        </View>

        {dayData.weight && (
          <View style={styles.weightContainer}>
            <Ionicons name="body-outline" size={20} color="#9C27B0" />
            <Text style={styles.weightText}>Weight: {dayData.weight} kg</Text>
          </View>
        )}

        {dayData.workouts && dayData.workouts.length > 0 && (
          <View style={styles.workoutsContainer}>
            <Text style={styles.workoutsHeaderText}>
              <Ionicons name="fitness-outline" size={20} color="#333" /> Workouts ({dayData.workouts.length})
            </Text>
            {dayData.workouts.map((workout, index) => (
              <View key={index} style={styles.workoutDisplayItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.workoutDisplayText}>{workout}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Get list of years for year picker (last 5 years to next 2 years)
  const getYears = () => {
    const years = [];
    const startYear = new Date().getFullYear() - 5;
    const endYear = new Date().getFullYear() + 2;
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  // Month names for month picker
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Render year picker modal
  const renderYearPicker = () => (
    <Modal
      visible={showYearPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowYearPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.pickerModalContent, { backgroundColor: Colors.cardBackground, borderColor: Colors.borderColor }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: Colors.text }]}>Select Year</Text>
            <TouchableOpacity onPress={() => setShowYearPicker(false)}>
              <Ionicons name="close-circle" size={28} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getYears().map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.pickerOption,
                  year === currentYear && { backgroundColor: Colors.primary }
                ]}
                onPress={() => {
                  setCurrentYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  { color: Colors.text },
                  year === currentYear && { color: Colors.white, fontWeight: 'bold' }
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render month picker modal
  const renderMonthPicker = () => (
    <Modal
      visible={showMonthPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMonthPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.pickerModalContent, { backgroundColor: Colors.cardBackground, borderColor: Colors.borderColor }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: Colors.text }]}>Select Month</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Ionicons name="close-circle" size={28} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {monthNames.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerOption,
                  index + 1 === currentMonth && { backgroundColor: Colors.primary }
                ]}
                onPress={() => {
                  setCurrentMonth(index + 1);
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  { color: Colors.text },
                  index + 1 === currentMonth && { color: Colors.white, fontWeight: 'bold' }
                ]}>
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>Fitness Calendar</Text>
          {isCalendarCollapsed && selectedDate && (
            <Text style={styles.collapsedDateText}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          )}
        </View>
        {!isCalendarCollapsed && (
          <View style={styles.dateSelectors}>
            <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>{monthNames[currentMonth - 1]}</Text>
              <Ionicons name="caret-down" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowYearPicker(true)} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>{currentYear}</Text>
              <Ionicons name="caret-down" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          onPress={toggleCalendar}
          style={[
            styles.collapseButton,
            isCalendarCollapsed && styles.collapseButtonHighlight
          ]}
        >
          <Ionicons
            name={isCalendarCollapsed ? 'calendar' : 'chevron-up'}
            size={24}
            color={isCalendarCollapsed ? Colors.primary : Colors.gray}
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.calendarContainer, { height: calendarHeight }]}>
        <Calendar
          current={`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`}
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setIsEditing(false);
            // Auto-collapse calendar when a date is selected
            if (!isCalendarCollapsed) {
              const toValue = 80;
              Animated.timing(calendarHeight, {
                toValue,
                duration: 300,
                useNativeDriver: false,
              }).start();
              setIsCalendarCollapsed(true);
            }
          }}
          markedDates={getMarkedDates()}
          onMonthChange={(month) => {
            setCurrentYear(month.year);
            setCurrentMonth(month.month);
          }}
          theme={{
            backgroundColor: Colors.cardBackground,
            calendarBackground: Colors.cardBackground,
            textSectionTitleColor: Colors.gray,
            todayTextColor: Colors.primary,
            dayTextColor: Colors.text,
            textDisabledColor: Colors.darkGray,
            dotColor: Colors.success,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            arrowColor: Colors.primary,
            monthTextColor: Colors.text,
            indicatorColor: Colors.primary,
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '300',
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
          style={styles.calendar}
        />
      </Animated.View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isEditing ? renderEditForm() : renderDayData()}
      </ScrollView>

      {renderYearPicker()}
      {renderMonthPicker()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  headerLeft: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  collapsedDateText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
  },
  dateSelectors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  dateButtonText: {
    fontSize: 14,
    color: Colors.text,
    marginRight: 4,
    fontWeight: '500',
  },
  collapseButton: {
    padding: 8,
    borderRadius: 8,
  },
  collapseButtonHighlight: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pickerModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '60%',
    borderWidth: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  pickerOption: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 18,
  },
  calendarContainer: {
    backgroundColor: Colors.cardBackground,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  addDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  addDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  dataContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 20,
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
  dataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  editButton: {
    padding: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
  },
  surplus: {
    color: '#FF6B6B',
  },
  deficit: {
    color: '#4CAF50',
  },
  maintenance: {
    color: '#FFA500',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  weightText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 10,
    fontWeight: '500',
  },
  workoutsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 15,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutsHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  workoutDisplayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  workoutDisplayText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 10,
    flex: 1,
  },
  editContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 20,
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
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginBottom: 8,
  },
  workoutTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 5,
  },
  addButton: {
    padding: 5,
  },
  addWorkoutPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addWorkoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutSelectorContainer: {
    marginTop: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    overflow: 'hidden',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  selectorCloseButton: {
    padding: 2,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  clearSearchButton: {
    padding: 4,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderColor,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderColor,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.cardBackground,
    color: Colors.text,
    marginRight: 10,
  },
  customAddButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  categoriesContainer: {
    maxHeight: 400,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
  noResultsSubText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  categorySection: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 10,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  workoutsList: {
    backgroundColor: Colors.cardBackground,
  },
  workoutOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  workoutOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.modalBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  presetButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  presetText: {
    fontSize: 14,
    color: '#666',
  },
  presetTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 10,
  },
  durationUnit: {
    fontSize: 16,
    color: '#666',
  },
  strengthInputGroup: {
    marginBottom: 15,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  setsContainer: {
    maxHeight: 400,
    marginBottom: 15,
  },
  setInputRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  setInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  weightInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  repsInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
    minWidth: 30,
  },
  multiplicationSign: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  removeSetButton: {
    marginLeft: 10,
  },
  repsPresetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  presetLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  smallPresetButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
    marginTop: 2,
  },
  smallPresetText: {
    fontSize: 12,
    color: '#666',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 10,
    borderStyle: 'dashed',
    backgroundColor: '#f8fff8',
  },
  addSetButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default CalendarScreen;