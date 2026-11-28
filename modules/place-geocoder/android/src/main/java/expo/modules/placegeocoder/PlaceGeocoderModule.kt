package expo.modules.placegeocoder

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.Locale
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val MAX_RESULTS = 1

// Messages never include the address or coordinates being looked up (privacy rules).
class GeocoderUnavailableException : CodedException("This device has no address lookup service")

class GeocodeFailedException : CodedException("The address lookup could not be completed")

/**
 * Address lookup with Android's built-in Geocoder, which needs no location permission.
 * An empty list means "no match"; an exception means the lookup could not run (offline or
 * service unavailable), and the app retries it later.
 */
class PlaceGeocoderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PlaceGeocoder")

    AsyncFunction("reverseAsync") Coroutine { latitude: Double, longitude: Double ->
      lookUpAddresses(latitude, longitude).map { it.toAddressFields() }
    }

    AsyncFunction("forwardAsync") Coroutine { address: String ->
      lookUpCoordinates(address).mapNotNull { it.toCoordinates() }
    }
  }

  private fun createGeocoder(): Geocoder {
    if (!Geocoder.isPresent()) {
      throw GeocoderUnavailableException()
    }
    return Geocoder(context, Locale.getDefault())
  }

  @Suppress("DEPRECATION")
  private suspend fun lookUpAddresses(latitude: Double, longitude: Double): List<Address> {
    val geocoder = createGeocoder()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return suspendCancellableCoroutine { continuation ->
        geocoder.getFromLocation(
          latitude,
          longitude,
          MAX_RESULTS,
          object : Geocoder.GeocodeListener {
            override fun onGeocode(addresses: MutableList<Address>) {
              if (continuation.isActive) continuation.resume(addresses)
            }

            override fun onError(errorMessage: String?) {
              if (continuation.isActive) continuation.resumeWithException(GeocodeFailedException())
            }
          }
        )
      }
    }
    return runBlockingLookup { geocoder.getFromLocation(latitude, longitude, MAX_RESULTS) }
  }

  @Suppress("DEPRECATION")
  private suspend fun lookUpCoordinates(address: String): List<Address> {
    val geocoder = createGeocoder()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return suspendCancellableCoroutine { continuation ->
        geocoder.getFromLocationName(
          address,
          MAX_RESULTS,
          object : Geocoder.GeocodeListener {
            override fun onGeocode(addresses: MutableList<Address>) {
              if (continuation.isActive) continuation.resume(addresses)
            }

            override fun onError(errorMessage: String?) {
              if (continuation.isActive) continuation.resumeWithException(GeocodeFailedException())
            }
          }
        )
      }
    }
    return runBlockingLookup { geocoder.getFromLocationName(address, MAX_RESULTS) }
  }

  // Before Android 13 the lookup is a blocking call, so it runs off the main thread.
  private suspend fun runBlockingLookup(request: () -> List<Address>?): List<Address> =
    withContext(Dispatchers.IO) {
      try {
        request().orEmpty()
      } catch (e: IOException) {
        throw GeocodeFailedException()
      }
    }
}

private fun Address.toAddressFields(): Map<String, String?> = mapOf(
  "formattedAddress" to if (maxAddressLineIndex >= 0) getAddressLine(0) else null,
  "name" to featureName,
  "streetNumber" to subThoroughfare,
  "street" to thoroughfare,
  "district" to subLocality,
  "city" to locality,
  "region" to adminArea
)

private fun Address.toCoordinates(): Map<String, Double>? =
  if (hasLatitude() && hasLongitude()) {
    mapOf("lat" to latitude, "lng" to longitude)
  } else {
    null
  }
