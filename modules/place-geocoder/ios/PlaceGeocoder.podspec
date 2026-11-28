Pod::Spec.new do |s|
  s.name           = 'PlaceGeocoder'
  s.version        = '1.0.0'
  s.summary        = 'Address lookup without the location permission'
  s.description    = 'Looks up addresses and coordinates with CLGeocoder for the MindPin app.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
