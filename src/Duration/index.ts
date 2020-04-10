/**
 * https://firebase.google.com/docs/reference/rules/rules.Duration
 */
export type Duration = {
  /**
   * Get the nanoseconds portion (signed) of the duration from -999,999,999 to +999,999,999 inclusive.
   * https://firebase.google.com/docs/reference/rules/rules.Duration#nanos
   */
  nanos(): number

  /**
   * Get the seconds portion (signed) of the duration from -315,576,000,000 to +315,576,000,000 inclusive.
   * https://firebase.google.com/docs/reference/rules/rules.Duration#seconds
   */
  seconds(): number
}

export type DurationUnit =
  | 'w' // Weeks
  | 'd' // Days
  | 'h' // Hours
  | 'm' // Minutes
  | 's' // Seconds
  | 'ms' // Milliseconds
  | 'ns' // Nanoseconds

const duration = {
  /**
   * Absolute value of a duration.
   * https://firebase.google.com/docs/reference/rules/rules.duration_#.abs
   *
   * @param duration Duration value.
   * @returns The absolute duration value of the input.
   */
  abs(duration: Duration): Duration {},

  /**
   * Create a duration from hours, minutes, seconds, and nanoseconds.
   * https://firebase.google.com/docs/reference/rules/rules.duration_#.time
   *
   * @param hours Hours portion of the duration.
   * @param mins Minutes portion of the duration.
   * @param secs Seconds portion of the duration.
   * @param nanos Nanoseconds portion of the duration.
   */
  time(hours: number, mins: number, secs: number, nanos: number): Duration {},

  /**
   * Create a duration from a numeric magnitude and string unit.
   * @param magnitude Unitless magnitude of the duration.
   * @param unit Unit of the duration.
   */
  value(magnitude: number, unit: DurationUnit): Duration {}
}
export { duration }
