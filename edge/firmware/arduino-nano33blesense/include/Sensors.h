#pragma once

#include <Arduino.h>

struct SensorsSample {
  float tempC = NAN;
  float rhPct = NAN;
  float ax = NAN;
  float ay = NAN;
  float az = NAN;
};

class Sensors {
 public:
  bool begin();
  SensorsSample read();
};

