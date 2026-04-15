#include <Servo.h>

Servo esc;

const int ESC_PIN    = 9;
const int BUTTON_PIN = 4;   // Physical start button — wire between pin 2 and GND

// ── Speed calibration ────────────────────────────────────────
// Neutral = 90.  Forward > 90.  Reverse < 90.
//
// Your old FWD_MED (150) was giving ~40 cm/s and working.
// That becomes the new FAST reference point.  Everything else
// is spaced relative to that so the three speeds are clearly
// distinguishable and map to the teacher's targets:
//
//   Slow   ≈ 20 cm/s     Medium ≈ 40 cm/s     Fast ≈ 60 cm/s
//
// TUNING: adjust these ±5 at a time on the Vernier track.
// Measure with a stopwatch over 1 m to verify.

const int BATT_PIN = A0;
const float VDIVIDER_RATIO = 2.0;
const float BATT_FULL      = 8.4;
const float BATT_EMPTY     = 6.0;
unsigned long lastBattReport = 0;
const unsigned long BATT_INTERVAL_MS = 3000;

const int NEUTRAL   = 90;

const int FWD_SLOW  = 105;   // ≈ 20 cm/s  — well below old working range
const int FWD_MED   = 130;   // ≈ 40 cm/s  — midpoint, clearly faster than slow
const int FWD_FAST  = 150;   // ≈ 60 cm/s  — your old "medium" that actually worked

const int REV_SLOW  = 75;    // ≈ 20 cm/s  — mirror of forward slow
const int REV_MED   = 55;    // ≈ 40 cm/s  — mirror of forward medium
const int REV_FAST  = 40;    // ≈ 60 cm/s  — mirror of forward fast

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
  delay(100);
  esc.write(NEUTRAL - 15);   // brief brake pulse
  delay(150);
  esc.write(NEUTRAL);
  delay(100);
  esc.write(val);             // actual reverse throttle
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
    stepStart  = millis();
    seqRunning = true;
    seqWaiting = false;
    inReverse  = false;
    setMotorForSeq(sequence[0].servoVal);
    Serial.println("BTN_START");
    Serial.println("OK_SEQ");
  }
}


void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // button wired between pin 2 & GND
  esc.attach(ESC_PIN);
  esc.write(NEUTRAL);
  delay(3000);   // ESC arming delay
  Serial.println("READY");
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
        Serial.println("SEQ_DONE");
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
    seqWaiting = false;
    inReverse  = false;
    esc.write(NEUTRAL);
    Serial.println("OK_STOP");

  // ── Forward (direct write, no brake dance needed) ──────────
  } else if (cmd == "FWD 1") {
    seqRunning = false;
    inReverse  = false;
    esc.write(FWD_SLOW);
    Serial.println("OK_FWD1");

  } else if (cmd == "FWD 2") {
    seqRunning = false;
    inReverse  = false;
    esc.write(FWD_MED);
    Serial.println("OK_FWD2");

  } else if (cmd == "FWD 3") {
    seqRunning = false;
    inReverse  = false;
    esc.write(FWD_FAST);
    Serial.println("OK_FWD3");

  // ── Reverse (uses brake dance to arm ESC for reverse) ──────
  } else if (cmd == "REV 1") {
    seqRunning = false;
    enterReverse(REV_SLOW);
    Serial.println("OK_REV1");

  } else if (cmd == "REV 2") {
    seqRunning = false;
    enterReverse(REV_MED);
    Serial.println("OK_REV2");

  } else if (cmd == "REV 3") {
    seqRunning = false;
    enterReverse(REV_FAST);
    Serial.println("OK_REV3");

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
        unsigned long dur = token.substring(c2 + 1).toInt();

        int val = NEUTRAL;
        if (dir == "F") {
          if      (spd == 1) val = FWD_SLOW;
          else if (spd == 2) val = FWD_MED;
          else if (spd == 3) val = FWD_FAST;
        } else if (dir == "R") {
          if      (spd == 1) val = REV_SLOW;
          else if (spd == 2) val = REV_MED;
          else if (spd == 3) val = REV_FAST;
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

  } else {
    Serial.print("ERR_UNKNOWN: ");
    Serial.println(cmd);
  }
}
