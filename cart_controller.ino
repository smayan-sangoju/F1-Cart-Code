#include <Servo.h>
#include <EEPROM.h>

Servo esc;

const int ESC_PIN    = 9;
const int BUTTON_PIN = 4;   // Physical start button — wire between pin 2 and GND

// ── Speed calibration ────────────────────────────────────────
// Neutral = 90.  Forward > 90.  Reverse < 90.
//
// TUNING: adjust ±1 at a time on the Vernier track.

const int BATT_PIN = A0;
const float VDIVIDER_RATIO = 2.0;
const float BATT_FULL      = 8.4;
const float BATT_EMPTY     = 6.0;
unsigned long lastBattReport = 0;
const unsigned long BATT_INTERVAL_MS = 3000;

const int NEUTRAL   = 90;

// Motor wired backwards: below neutral = physical forward, above neutral = physical backward
const int FWD_SLOW  = 98;    // ~20 cm/s  (above neutral = physical forward)
const int FWD_MED   = 102;   // ~40 cm/s
const int FWD_FAST  = 106;   // ~60 cm/s

const int REV_SLOW  = 84;    // ~20 cm/s  (below neutral = physical reverse)
const int REV_MED   = 77;    // ~40 cm/s
const int REV_FAST  = 71;    // ~60 cm/s

// Forward kicks above neutral; reverse kicks further below
const int KICK_F1_VAL = 107; const int KICK_F1_MS = 280;  // Slow fwd
const int KICK_F2_VAL = 110; const int KICK_F2_MS = 200;  // Med fwd
const int KICK_F3_VAL = 114; const int KICK_F3_MS = 150;  // Fast fwd
const int KICK_R1_VAL = 73;  const int KICK_R1_MS = 280;  // Slow rev
const int KICK_R2_VAL = 70;  const int KICK_R2_MS = 200;  // Med rev
const int KICK_R3_VAL = 65;  const int KICK_R3_MS = 150;  // Fast rev

// ── Sequence storage ─────────────────────────────────────────
struct Step {
  int  servoVal;
  unsigned long dur;
};

const int MAX_STEPS = 20;
Step sequence[MAX_STEPS];
int  stepCount = 0;

// ── Sequence runtime state ───────────────────────────────────
bool seqRunning  = false;
bool seqWaiting  = false;   // armed, waiting for physical button
int  seqIndex    = 0;
unsigned long stepStart = 0;

// ── Reverse tracking ─────────────────────────────────────────
// Brushless ESCs need a "brake-then-reverse" double-tap to
// enter reverse mode.  We track whether we already did this
// so we don't repeat the dance on every reverse step.
bool inReverse = false;

String inputBuffer = "";

// ── EEPROM persistence ───────────────────────────────────────
// Layout: [0] magic byte | [1] stepCount | [2..] steps (6 bytes each)
//   step = servoVal (int, 2 B) + dur (unsigned long, 4 B)
const uint8_t EEPROM_MAGIC = 0xF1;
const int     EEPROM_BASE  = 0;

void saveSequenceToEEPROM() {
  EEPROM.update(EEPROM_BASE,     EEPROM_MAGIC);
  EEPROM.update(EEPROM_BASE + 1, (uint8_t)stepCount);
  int addr = EEPROM_BASE + 2;
  for (int i = 0; i < stepCount; i++) {
    EEPROM.put(addr, sequence[i].servoVal); addr += sizeof(int);
    EEPROM.put(addr, sequence[i].dur);      addr += sizeof(unsigned long);
  }
  Serial.print("OK_SAVE ");
  Serial.println(stepCount);
}

void loadSequenceFromEEPROM() {
  if (EEPROM.read(EEPROM_BASE) != EEPROM_MAGIC) return;
  uint8_t count = EEPROM.read(EEPROM_BASE + 1);
  if (count == 0 || count > MAX_STEPS) return;
  stepCount = count;
  int addr = EEPROM_BASE + 2;
  for (int i = 0; i < stepCount; i++) {
    EEPROM.get(addr, sequence[i].servoVal); addr += sizeof(int);
    EEPROM.get(addr, sequence[i].dur);      addr += sizeof(unsigned long);
  }
  seqWaiting = true;   // auto-arm: button press will start it immediately
  Serial.print("EEPROM_LOADED ");
  Serial.println(stepCount);
}

// ── Button debounce ──────────────────────────────────────────
bool lastBtnReading    = HIGH;
bool lastBtnState      = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_MS = 50;


void reportBattery() {
  int raw = analogRead(BATT_PIN);
  float pinVoltage = (raw / 1023.0) * 5.0;
  float battVoltage = pinVoltage * VDIVIDER_RATIO;
  if (battVoltage > BATT_FULL) battVoltage = BATT_FULL;
  if (battVoltage < BATT_EMPTY) battVoltage = BATT_EMPTY;
  int percent = (int)(((battVoltage - BATT_EMPTY) / (BATT_FULL - BATT_EMPTY)) * 100.0);
  Serial.print("BAT ");
  Serial.print(percent);
  Serial.print(" ");
  Serial.println(battVoltage, 1);
}

// ═══════════════════════════════════════════════════════════════
// Soft-start helpers — kick past cogging then settle at target
// ═══════════════════════════════════════════════════════════════
// FWD is above neutral — direct write, no brake dance needed.
void softStartFwd(int targetVal) {
  int kickVal, kickMs;
  if      (targetVal <= FWD_SLOW) { kickVal = KICK_F1_VAL; kickMs = KICK_F1_MS; }
  else if (targetVal <= FWD_MED)  { kickVal = KICK_F2_VAL; kickMs = KICK_F2_MS; }
  else                             { kickVal = KICK_F3_VAL; kickMs = KICK_F3_MS; }
  inReverse = false;
  esc.write(kickVal);
  delay(kickMs);
  esc.write(targetVal);
}

// REV is below neutral — needs brake dance to arm ESC.
void softStartRev(int targetVal) {
  int kickVal, kickMs;
  if      (targetVal >= REV_SLOW) { kickVal = KICK_R1_VAL; kickMs = KICK_R1_MS; }
  else if (targetVal >= REV_MED)  { kickVal = KICK_R2_VAL; kickMs = KICK_R2_MS; }
  else                             { kickVal = KICK_R3_VAL; kickMs = KICK_R3_MS; }
  enterReverse(kickVal);
  delay(kickMs);
  esc.write(targetVal);
}

// ═══════════════════════════════════════════════════════════════
// Reverse helper — the core fix
// ═══════════════════════════════════════════════════════════════
// Most brushless ESC + Servo library combos ignore values < 90
// unless they first see a brake signal.  This function sends
// neutral → brake → neutral → reverse to arm the ESC for
// backward rotation.
//
// If your specific ESC already has reverse enabled and doesn't
// need the double-tap, you can simplify this to esc.write(val).

void enterReverse(int val) {
  esc.write(NEUTRAL);
  delay(200);
  esc.write(NEUTRAL - 35);   // strong brake pulse (55) to reliably arm ESC
  delay(400);
  esc.write(NEUTRAL);
  delay(200);
  esc.write(val);
  inReverse = true;
}

// For sequence steps: only does the brake dance on the FIRST
// reverse step.  Subsequent reverse steps just change speed.
void setMotorForSeq(int val) {
  if (val < NEUTRAL) {
    if (!inReverse) {
      enterReverse(val);
    } else {
      esc.write(val);         // already in reverse, just adjust
    }
  } else {
    esc.write(val);
    if (val == NEUTRAL) {
      // staying neutral is fine, don't clear inReverse yet
      // so a following reverse step doesn't re-brake
    } else {
      inReverse = false;      // going forward, clear flag
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// Physical button handler
// ═══════════════════════════════════════════════════════════════
void onButtonPress() {
  Serial.println("BTN_PRESSED");   // DEBUG: remove after button verified
  if (seqWaiting && stepCount > 0) {
    seqIndex   = 0;
    seqRunning = true;
    seqWaiting = false;
    inReverse  = false;
    int firstVal = sequence[0].servoVal;
    if (firstVal > NEUTRAL) {
      softStartFwd(firstVal);
    } else if (firstVal < NEUTRAL) {
      softStartRev(firstVal);
    } else {
      esc.write(NEUTRAL);
    }
    stepStart = millis();        // set AFTER kickstart so step duration is accurate
    Serial.println("BTN_START");
    Serial.println("OK_SEQ");
  }
}


void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // button wired between pin 4 & GND
  esc.attach(ESC_PIN);
  esc.write(NEUTRAL);
  delay(3000);   // ESC arming delay
  Serial.println("READY");
  loadSequenceFromEEPROM();  // restore saved sequence (auto-arms if found)
}


void loop() {
  // ── Read serial commands ───────────────────────────────────
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      inputBuffer.trim();
      handleCommand(inputBuffer);
      inputBuffer = "";
    } else {
      inputBuffer += c;
    }
  }

  // ── Physical button with debounce ─────────────────────────
  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastBtnReading) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    if (reading == LOW && lastBtnState == HIGH) {
      onButtonPress();
    }
    lastBtnState = reading;
  }
  lastBtnReading = reading;

  // ── Battery reporting (disabled — no voltage divider wired) ──
  // if (millis() - lastBattReport >= BATT_INTERVAL_MS) {
  //   reportBattery();
  //   lastBattReport = millis();
  // }

  // ── Sequence step machine ─────────────────────────────────
  if (seqRunning) {
    unsigned long now = millis();
    if (now - stepStart >= sequence[seqIndex].dur) {
      seqIndex++;
      if (seqIndex >= stepCount) {
        esc.write(NEUTRAL);
        seqRunning = false;
        inReverse  = false;
        seqWaiting = true;   // re-arm so button can run it again
        Serial.println("SEQ_DONE");
        Serial.println("SEQ_ARMED");
      } else {
        setMotorForSeq(sequence[seqIndex].servoVal);
        stepStart = now;
        Serial.print("SEQ_STEP ");
        Serial.println(seqIndex);
      }
    }
  }
}


void handleCommand(String cmd) {

  if (cmd == "STOP") {
    seqRunning = false;
    inReverse  = false;
    esc.write(NEUTRAL);
    // Re-arm for next button press if a sequence is loaded
    seqWaiting = (stepCount > 0);
    Serial.println("OK_STOP");
    if (seqWaiting) Serial.println("SEQ_ARMED");

  } else if (cmd == "FWD 1") {
    seqRunning = false;
    softStartFwd(FWD_SLOW);
    Serial.println("OK_FWD1");

  } else if (cmd == "FWD 2") {
    seqRunning = false;
    softStartFwd(FWD_MED);
    Serial.println("OK_FWD2");

  } else if (cmd == "FWD 3") {
    seqRunning = false;
    softStartFwd(FWD_FAST);
    Serial.println("OK_FWD3");

  } else if (cmd == "REV 1") {
    seqRunning = false;
    softStartRev(REV_SLOW);
    Serial.println("OK_REV1");

  } else if (cmd == "REV 2") {
    seqRunning = false;
    softStartRev(REV_MED);
    Serial.println("OK_REV2");

  } else if (cmd == "REV 3") {
    seqRunning = false;
    softStartRev(REV_FAST);
    Serial.println("OK_REV3");

  // ── Custom speed ───────────────────────────────────────────
  } else if (cmd.startsWith("FWD CUSTOM ")) {
    int val = constrain(cmd.substring(11).toInt(), 92, 130);
    seqRunning = false;
    inReverse = false;
    esc.write(val);
    Serial.println("OK_FWD_CUSTOM");

  } else if (cmd.startsWith("REV CUSTOM ")) {
    int val = constrain(cmd.substring(11).toInt(), 50, 88);
    seqRunning = false;
    if (!inReverse) enterReverse(val); else esc.write(val);
    Serial.println("OK_REV_CUSTOM");

  // ── Load sequence ──────────────────────────────────────────
  } else if (cmd.startsWith("LOAD ")) {
    String payload = cmd.substring(5);
    stepCount  = 0;
    seqRunning = false;
    seqWaiting = false;

    int start = 0;
    while (start < (int)payload.length() && stepCount < MAX_STEPS) {
      int sep = payload.indexOf('|', start);
      if (sep == -1) sep = payload.length();
      String token = payload.substring(start, sep);

      int c1 = token.indexOf(',');
      String dir = token.substring(0, c1);

      if (dir == "S") {
        sequence[stepCount].servoVal = NEUTRAL;
        sequence[stepCount].dur     = token.substring(c1 + 1).toInt();
      } else {
        int c2  = token.indexOf(',', c1 + 1);
        int spd = token.substring(c1 + 1, c2).toInt();
        unsigned long dur;
        int val = NEUTRAL;

        if (spd == 0) {
          // Custom speed: F,0,<servoVal>,<durMs>
          int c3 = token.indexOf(',', c2 + 1);
          int rawVal = token.substring(c2 + 1, c3).toInt();
          dur = token.substring(c3 + 1).toInt();
          if (dir == "F") val = constrain(rawVal, 92, 130);
          else if (dir == "R") val = constrain(rawVal, 50, 88);
        } else {
          dur = token.substring(c2 + 1).toInt();
          if (dir == "F") {
            if      (spd == 1) val = FWD_SLOW;
            else if (spd == 2) val = FWD_MED;
            else if (spd == 3) val = FWD_FAST;
          } else if (dir == "R") {
            if      (spd == 1) val = REV_SLOW;
            else if (spd == 2) val = REV_MED;
            else if (spd == 3) val = REV_FAST;
          }
        }

        sequence[stepCount].servoVal = val;
        sequence[stepCount].dur     = dur;
      }
      stepCount++;
      start = sep + 1;
    }
    Serial.print("OK_LOAD ");
    Serial.println(stepCount);

  // ── SEQ now arms but waits for physical button ─────────────
  } else if (cmd == "SEQ") {
    if (stepCount == 0) {
      Serial.println("ERR_EMPTY");
    } else {
      seqWaiting = true;
      Serial.println("WAITING_BTN");
      // Cart does NOT move.  It waits for the physical button.
    }

  } else if (cmd == "STOP_SEQ") {
    seqRunning = false;
    seqWaiting = false;
    inReverse  = false;
    esc.write(NEUTRAL);
    Serial.println("OK_STOP");

  } else if (cmd == "SAVE") {
    if (stepCount == 0) {
      Serial.println("ERR_EMPTY");
    } else {
      saveSequenceToEEPROM();
      seqWaiting = true;   // arm immediately so button press starts it
    }

  } else {
    Serial.print("ERR_UNKNOWN: ");
    Serial.println(cmd);
  }
}
