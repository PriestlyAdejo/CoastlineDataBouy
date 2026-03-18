#pragma once

#include <Arduino.h>

// Minimal v1 protocol:
// - telemetry stream: CSV over Serial1 at ~10Hz: ms,tempC,ax,ay,az
// - commands from Pi (single-char opcodes, newline terminated):
//   P=ping, W=watchdog kick, T=request telemetry snapshot, S=request shutdown, R=request relay cycle (optional)

struct Command {
  char opcode = '\0';
};

inline bool parseCommandLine(const String& line, Command& cmd) {
  if (line.length() == 0) return false;
  cmd.opcode = line.charAt(0);
  return true;
}

inline void writeAck(Stream& out, const char* msg) {
  out.print("ACK,");
  out.println(msg);
}

