#pragma once

#include <Arduino.h>

class Watchdog {
 public:
  void begin(uint32_t timeoutMs);
  void kick();
  bool expired() const;

 private:
  uint32_t timeoutMs_ = 30000;
  uint32_t lastKickMs_ = 0;
};

