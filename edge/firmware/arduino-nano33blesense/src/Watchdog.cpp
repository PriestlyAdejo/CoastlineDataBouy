#include "Watchdog.h"

void Watchdog::begin(uint32_t timeoutMs) {
  timeoutMs_ = timeoutMs;
  lastKickMs_ = millis();
}

void Watchdog::kick() {
  lastKickMs_ = millis();
}

bool Watchdog::expired() const {
  return (millis() - lastKickMs_) > timeoutMs_;
}

