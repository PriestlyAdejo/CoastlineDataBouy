#pragma once

#include <Arduino.h>

// Field UART (Pi link) uses Serial1 at 115200 (3.3V logic on both sides).
static constexpr uint32_t PI_UART_BAUD = 115200;

// Streaming cadence (CSV) for compatibility with existing Pi scripts.
static constexpr uint32_t STREAM_HZ = 10;

// Watchdog: Pi must periodically send 'W' to indicate it's alive.
static constexpr uint32_t PI_HEARTBEAT_TIMEOUT_MS = 30'000;

// Battery measurement
// NOTE: Set BAT_ADC_PIN and calibration after verifying the exact divider hardware.
static constexpr uint8_t BAT_ADC_PIN = A0;
static constexpr float ADC_REF_V = 3.3f;
static constexpr float ADC_COUNTS = 1023.0f;  // 10-bit on many Arduino cores; confirm for Nano 33 BLE
static constexpr float BAT_DIVIDER_RATIO = 5.7f; // Vbat = Vadcin * ratio (placeholder; calibrate!)

// Battery thresholds (4S LiFePO4). Adjust after validation under load.
static constexpr float BAT_WARN_V = 12.4f;
static constexpr float BAT_CRIT_V = 12.0f;

// Latching relay control pins (placeholders; set to the actual wiring).
static constexpr int RELAY_SET_PIN = -1;
static constexpr int RELAY_RESET_PIN = -1;
static constexpr uint16_t RELAY_PULSE_MS = 150;

