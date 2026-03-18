#include "Sensors.h"

#include <Arduino_HS300x.h>
#include <Arduino_BMI270_BMM150.h>

bool Sensors::begin() {
  bool ok = true;
  ok = ok && HS300x.begin();
  ok = ok && IMU.begin();
  return ok;
}

SensorsSample Sensors::read() {
  SensorsSample s;

  s.tempC = HS300x.readTemperature();
  s.rhPct = HS300x.readHumidity();

  float x, y, z;
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(x, y, z);
    // Library returns g; keep as g for v1 compatibility or convert? We keep raw as-is for now.
    // Pi side can interpret/convert consistently.
    s.ax = x;
    s.ay = y;
    s.az = z;
  }
  return s;
}

