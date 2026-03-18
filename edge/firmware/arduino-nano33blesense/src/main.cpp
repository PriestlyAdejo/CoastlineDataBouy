#include <Arduino.h>

#include "Config.h"
#include "PowerSupervisor.h"
#include "Protocol.h"
#include "Sensors.h"
#include "Watchdog.h"

static Sensors sensors;
static PowerSupervisor power;
static Watchdog wdog;

static uint32_t lastStreamMs = 0;

static bool debugUsb = true;  // USB serial prints for bench/debug

static void handleCommand(const Command& cmd) {
  switch (cmd.opcode) {
    case 'P':
      writeAck(Serial1, "PONG");
      if (debugUsb) writeAck(Serial, "PONG");
      break;
    case 'W':
      wdog.kick();
      writeAck(Serial1, "WDOG_OK");
      break;
    case 'T': {
      // One-shot telemetry snapshot (same CSV schema).
      SensorsSample s = sensors.read();
      Serial1.print(millis());
      Serial1.print(',');
      Serial1.print(s.tempC, 3);
      Serial1.print(',');
      Serial1.print(s.ax, 6);
      Serial1.print(',');
      Serial1.print(s.ay, 6);
      Serial1.print(',');
      Serial1.println(s.az, 6);
      break;
    }
    case 'S':
      // Shutdown request: for v1, acknowledge; later coordinate with relay state machine.
      writeAck(Serial1, "SHUTDOWN_ACK");
      break;
    case 'R':
      // Relay cycle request (optional): no-op unless relay pins configured.
      power.relaySetOff();
      delay(500);
      power.relaySetOn();
      writeAck(Serial1, "RELAY_CYCLE_DONE");
      break;
    default:
      writeAck(Serial1, "UNKNOWN_CMD");
      break;
  }
}

static void serviceCommands() {
  static String line;
  while (Serial1.available()) {
    const char c = static_cast<char>(Serial1.read());
    if (c == '\n' || c == '\r') {
      if (line.length() > 0) {
        Command cmd;
        if (parseCommandLine(line, cmd)) handleCommand(cmd);
      }
      line = "";
    } else {
      if (line.length() < 64) line += c;
    }
  }
}

static void streamTelemetryIfDue() {
  const uint32_t periodMs = 1000 / STREAM_HZ;
  const uint32_t now = millis();
  if ((now - lastStreamMs) < periodMs) return;
  lastStreamMs = now;

  SensorsSample s = sensors.read();
  // CSV payload currently expected by Pi fragments:
  // millis, temperature, accel_x, accel_y, accel_z
  Serial1.print(now);
  Serial1.print(',');
  Serial1.print(s.tempC, 3);
  Serial1.print(',');
  Serial1.print(s.ax, 6);
  Serial1.print(',');
  Serial1.print(s.ay, 6);
  Serial1.print(',');
  Serial1.println(s.az, 6);
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(PI_UART_BAUD);

  delay(250);
  if (debugUsb) {
    Serial.println("Buoy firmware boot");
    Serial.print("FW=");
    Serial.println(BUOY_FW_VERSION);
  }

  const bool sensorsOk = sensors.begin();
  if (debugUsb) {
    Serial.print("Sensors begin: ");
    Serial.println(sensorsOk ? "OK" : "FAIL");
  }

  power.begin();
  wdog.begin(PI_HEARTBEAT_TIMEOUT_MS);
}

void loop() {
  serviceCommands();
  streamTelemetryIfDue();

  const PowerStatus p = power.update();
  if (p.state == PowerState::Critical) {
    // v1 safety: if battery is critical, cut power (placeholder).
    // In production this should coordinate with Pi shutdown handshake.
    power.relaySetOff();
  }

  if (wdog.expired()) {
    // If Pi is not kicking watchdog, power-cycle it.
    power.relaySetOff();
    delay(500);
    power.relaySetOn();
    wdog.kick();
    writeAck(Serial1, "WDOG_RESET_PI");
    if (debugUsb) Serial.println("Watchdog expired -> cycled relay");
  }
}

