#pragma once

#include <Arduino.h>

enum class PowerState : uint8_t {
  Nominal = 0,
  Warning = 1,
  Critical = 2,
};

struct PowerStatus {
  float vbat = NAN;
  PowerState state = PowerState::Nominal;
};

class PowerSupervisor {
 public:
  void begin();
  PowerStatus update();

  // Relay actions (latching relay). These are safe no-ops until pins configured.
  void relaySetOn();
  void relaySetOff();
};

