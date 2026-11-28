import CoreLocation
import ExpoModulesCore

/// Address lookup with CLGeocoder, which needs no location permission.
/// An empty list means "no match"; a thrown error means the lookup could not run (offline or
/// rate limited), and the app retries it later.
public final class PlaceGeocoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PlaceGeocoder")

    AsyncFunction("reverseAsync") { (latitude: Double, longitude: Double) in
      try await lookUpAddresses(latitude: latitude, longitude: longitude)
    }

    AsyncFunction("forwardAsync") { (address: String) in
      try await lookUpCoordinates(address: address)
    }
  }
}

private func lookUpAddresses(latitude: Double, longitude: Double) async throws -> [[String: String]] {
  let location = CLLocation(latitude: latitude, longitude: longitude)
  let placemarks = try await lookUp {
    try await CLGeocoder().reverseGeocodeLocation(location)
  }
  return placemarks.map { placemark -> [String: String] in
    var fields: [String: String] = [:]
    fields["name"] = placemark.name
    fields["streetNumber"] = placemark.subThoroughfare
    fields["street"] = placemark.thoroughfare
    fields["district"] = placemark.subLocality
    fields["city"] = placemark.locality
    fields["region"] = placemark.administrativeArea
    return fields
  }
}

private func lookUpCoordinates(address: String) async throws -> [[String: Double]] {
  let placemarks = try await lookUp {
    try await CLGeocoder().geocodeAddressString(address)
  }
  return placemarks.compactMap { placemark -> [String: Double]? in
    guard let coordinate = placemark.location?.coordinate else {
      return nil
    }
    return ["lat": coordinate.latitude, "lng": coordinate.longitude]
  }
}

/// "No result" is an answer, not a failure, so it becomes an empty list and is not retried.
private func lookUp(_ request: () async throws -> [CLPlacemark]) async throws -> [CLPlacemark] {
  do {
    return try await request()
  } catch let error as CLError
    where error.code == .geocodeFoundNoResult || error.code == .geocodeFoundPartialResult {
    return []
  } catch {
    throw GeocodeFailedException()
  }
}

// The message never includes the address or coordinates being looked up (privacy rules).
private final class GeocodeFailedException: Exception {
  override var reason: String {
    "The address lookup could not be completed"
  }
}
