/**
 * Type representing a geopoint.
 * https://firebase.google.com/docs/reference/rules/rules.LatLng
 */
export type LatLng = {
  /**
   * Calculate distance between two LatLng points in distance (meters).
   * https://firebase.google.com/docs/reference/rules/rules.LatLng#distance
   *
   * @param other The other point.
   */
  distance(other: LatLng): number

  /**
   * Get the latitude value in the range [-90.0, 90.0].
   * https://firebase.google.com/docs/reference/rules/rules.LatLng#latitude
   */
  latitude(): number

  /**
   * Get the longitude value in the range [-180.0, 180.0].
   * https://firebase.google.com/docs/reference/rules/rules.LatLng#longitude
   */
  longitude(): number
}

const latlng = {
  /**
   * Create a LatLng from floating point coordinates.
   *
   * @param lat The latitude.
   * @param lng The longitude.
   */
  value(lat: number, lng: number): LatLng
}
export { latlng }
