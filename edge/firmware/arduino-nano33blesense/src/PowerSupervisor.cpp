#include "PowerSupervisor.h"

#include "Config.h"

static float readBatteryVoltage() {
  if (BAT_ADC_PIN < 0) return NAN;
  const int raw = analogRead(BAT_ADC_PIN);
  const float v_in = (static_cast<float>(raw) / ADC_COUNTS) * ADC_REF_V;
  return v_in * BAT_DIVIDER_RATIO;
}

void PowerSupervisor::begin() {
  if (RELAY_SET_PIN >= 0) pinMode(RELAY_SET_PIN, OUTPUT);
  if (RELAY_RESET_PIN >= 0) pinMode(RELAY_RESET_PIN, OUTPUT);
}

PowerStatus PowerSupervisor::update() {
  PowerStatus st;
  st.vbat = readBatteryVoltage();

  if (!isnan(st.vbat)) {
    if (st.vbat <= BAT_CRIT_V) st.state = PowerState::Critical;
    else if (st.vbat <= BAT_WARN_V) st.state = PowerState::Warning;
    else st.state = PowerState::Nominal;
  }
  return st;
}

static void pulsePin(int pin) {
  if (pin < 0) return;
  digitalWrite(pin, HIGH);
  delay(RELAY_PULSE_MS);
  digitalWrite(pin, LOW);
}

void PowerSupervisor::relaySetOn() {
  pulsePin(RELAY_SET_PIN);
}

void PowerSupervisor::relaySetOff() {
  pulsePin(RELAY_RESET_PIN);
}

