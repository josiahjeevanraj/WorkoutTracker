#!/usr/bin/env ruby
# Adds a watchOS App target to the Expo-generated iOS project
# Run: ruby scripts/add_watch_target.rb

require 'xcodeproj'
require 'fileutils'

PROJECT_PATH   = File.expand_path('../ios/WorkoutTracker.xcodeproj', __dir__)
WATCH_SRC      = File.expand_path('../ios/WorkoutTrackerWatch', __dir__)
WATCH_NAME     = 'WorkoutTrackerWatch'
WATCH_BUNDLE   = 'com.workouttracker.watchapp'
IOS_BUNDLE     = 'com.workouttracker.app'
WATCH_DEPLOY   = '7.0'
IOS_DEPLOY     = '15.1'

project = Xcodeproj::Project.open(PROJECT_PATH)

# ── Guard: don't add twice ────────────────────────────────────────────────────
if project.targets.any? { |t| t.name == WATCH_NAME }
  puts "Watch target already exists — skipping."
  exit 0
end

# ── Watch App target ──────────────────────────────────────────────────────────
watch_target = project.new_target(
  :watch2_app,
  WATCH_NAME,
  :watchos,
  WATCH_DEPLOY,
  project.products_group
)

# ── Source files group ────────────────────────────────────────────────────────
watch_group = project.main_group.new_group(WATCH_NAME, WATCH_SRC)

swift_files = Dir.glob("#{WATCH_SRC}/*.swift").sort
swift_files.each do |path|
  file_ref = watch_group.new_reference(path)
  watch_target.add_file_references([file_ref])
end

# Entitlements (not compiled, just referenced)
entitlements_path = "#{WATCH_SRC}/#{WATCH_NAME}.entitlements"
watch_group.new_reference(entitlements_path) if File.exist?(entitlements_path)

# ── Add WatchBridge files to main iOS target ──────────────────────────────────
ios_target = project.targets.find { |t| t.name == 'WorkoutTracker' }
ios_group  = project.main_group['WorkoutTracker'] || project.main_group.new_group('WorkoutTracker', File.expand_path('../ios/WorkoutTracker', __dir__))

bridge_files = Dir.glob(File.expand_path('../ios/WorkoutTracker/WatchBridge.*', __dir__))
bridge_files.each do |path|
  existing = ios_group.files.find { |f| f.path && File.basename(f.path) == File.basename(path) }
  unless existing
    ref = ios_group.new_reference(path)
    ios_target.add_file_references([ref])
  end
end

# ── Build settings ────────────────────────────────────────────────────────────
watch_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER']   = WATCH_BUNDLE
  config.build_settings['SWIFT_VERSION']               = '5.0'
  config.build_settings['WATCHOS_DEPLOYMENT_TARGET']   = WATCH_DEPLOY
  config.build_settings['TARGETED_DEVICE_FAMILY']      = '4'
  config.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = "#{WATCH_NAME}/#{WATCH_NAME}.entitlements"
  config.build_settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['INFOPLIST_KEY_CFBundleDisplayName'] = 'Workout'
  config.build_settings['INFOPLIST_KEY_WKApplication'] = 'YES'
  config.build_settings['INFOPLIST_KEY_UISupportedInterfaceOrientations'] = 'UIInterfaceOrientationPortrait'
end

# ── HealthKit capability on iOS target ───────────────────────────────────────
# (entitlements file already has the keys; just ensure the framework is linked)
healthkit = project.frameworks_group.new_reference('HealthKit.framework')
healthkit.last_known_file_type = 'wrapper.framework'
ios_target.frameworks_build_phase.add_file_reference(healthkit) rescue nil

# Watch also needs HealthKit + WatchConnectivity
[
  'HealthKit.framework',
  'WatchConnectivity.framework',
].each do |fw|
  ref = project.frameworks_group.new_reference(fw)
  ref.last_known_file_type = 'wrapper.framework'
  watch_target.frameworks_build_phase.add_file_reference(ref) rescue nil
end

project.save
puts "✅  Watch target '#{WATCH_NAME}' added and project saved."
puts "📌  Next: open ios/WorkoutTracker.xcworkspace in Xcode, select both targets,"
puts "    set your Team under Signing & Capabilities, then build."
