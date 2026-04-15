import tkinter as tk
from tkinter import ttk, messagebox
import serial
import serial.tools.list_ports
import threading
import time

# ── Serial state ──────────────────────────────────────────────
ser = None
connected = False

# ── Sequence step list ────────────────────────────────────────
sequence_steps = []   # each item: dict {dir, speed, duration}

# ─────────────────────────────────────────────────────────────
# Serial helpers
# ─────────────────────────────────────────────────────────────

def list_ports():
    ports = serial.tools.list_ports.comports()
    return [p.device for p in ports]

def connect(port):
    global ser, connected
    try:
        ser = serial.Serial(port, 9600, timeout=2)
        time.sleep(2.5)          # let Arduino reset + arm ESC
        connected = True
        status_var.set(f"Connected  ·  {port}")
        status_label.config(fg="#1a7a3c")
        connect_btn.config(text="Disconnect")
        set_controls_state(tk.NORMAL)
        # Start serial read thread
        t = threading.Thread(target=serial_reader, daemon=True)
        t.start()
    except Exception as e:
        messagebox.showerror("Connection failed", str(e))

def disconnect():
    global ser, connected
    connected = False
    if ser:
        try:
            send_command("STOP")
            ser.close()
        except:
            pass
        ser = None
    status_var.set("Not connected")
    status_label.config(fg="#a0522d")
    connect_btn.config(text="Connect")
    set_controls_state(tk.DISABLED)

def send_command(cmd):
    if ser and connected:
        try:
            ser.write((cmd + "\n").encode())
        except:
            pass

def serial_reader():
    """Background thread: read serial responses and update log."""
    while connected and ser:
        try:
            line = ser.readline().decode().strip()
            if line:
                log(f"← {line}")
                if line == "WAITING_BTN":
                    root.after(0, on_waiting_btn)
                elif line == "BTN_START" or line == "OK_SEQ":
                    root.after(0, on_seq_started)
                elif line == "SEQ_DONE":
                    root.after(0, on_seq_done)
        except:
            break

def log(msg):
    root.after(0, lambda: _append_log(msg))

def _append_log(msg):
    log_box.config(state=tk.NORMAL)
    log_box.insert(tk.END, msg + "\n")
    log_box.see(tk.END)
    log_box.config(state=tk.DISABLED)

# ─────────────────────────────────────────────────────────────
# Motion commands
# ─────────────────────────────────────────────────────────────

def cmd_stop():
    send_command("STOP")
    log("→ STOP")

def cmd_move(direction, speed):
    """direction: 'FWD' or 'REV', speed: 1/2/3"""
    cmd = f"{direction} {speed}"
    send_command(cmd)
    log(f"→ {cmd}")

def build_seq_string():
    parts = []
    for step in sequence_steps:
        d = step["dir"]
        if d == "S":
            parts.append(f"S,{step['duration']}")
        else:
            parts.append(f"{d},{step['speed']},{step['duration']}")
    return "|".join(parts)

def run_sequence():
    """Arm the sequence: sends LOAD then SEQ.
    The cart will NOT move yet — it waits for the physical button."""
    if not sequence_steps:
        messagebox.showwarning("Empty sequence", "Add at least one step first.")
        return
    seq_str = build_seq_string()
    send_command(f"LOAD {seq_str}")
    time.sleep(0.1)
    send_command("SEQ")
    log(f"→ LOAD {seq_str}")
    log("→ SEQ  (arming — press button on cart to start)")
    run_seq_btn.config(text="Arming…", state=tk.DISABLED)

def stop_sequence():
    send_command("STOP_SEQ")
    log("→ STOP_SEQ")
    run_seq_btn.config(text="Arm sequence", state=tk.NORMAL)
    seq_status_var.set("")

def on_waiting_btn():
    """Arduino confirmed it's armed and waiting for the physical button."""
    run_seq_btn.config(text="⏳ Press cart button", state=tk.DISABLED)
    seq_status_var.set("🟡  Sequence armed — press the button on the cart to start")
    log("  [armed — waiting for physical button press]")

def on_seq_started():
    """Physical button was pressed, sequence is now running."""
    run_seq_btn.config(text="Running…", state=tk.DISABLED)
    seq_status_var.set("🟢  Sequence running…")
    log("  [button pressed — sequence started]")

def on_seq_done():
    run_seq_btn.config(text="Arm sequence", state=tk.NORMAL)
    seq_status_var.set("")
    log("  [sequence complete]")

# ─────────────────────────────────────────────────────────────
# Sequence builder helpers
# ─────────────────────────────────────────────────────────────

SPEED_LABELS = {1: "Slow (20 cm/s)", 2: "Med (40 cm/s)", 3: "Fast (60 cm/s)"}
DIR_LABELS   = {"F": "Forward", "R": "Reverse", "S": "Stop"}

def add_step():
    d = step_dir_var.get()
    dur_ms = int(float(step_dur_var.get()) * 1000)
    if dur_ms <= 0:
        messagebox.showwarning("Invalid duration", "Duration must be > 0.")
        return
    step = {"dir": d, "duration": dur_ms}
    if d != "S":
        step["speed"] = int(step_spd_var.get())
    sequence_steps.append(step)
    refresh_seq_list()

def remove_selected_step():
    sel = seq_listbox.curselection()
    if not sel:
        return
    idx = sel[0]
    sequence_steps.pop(idx)
    refresh_seq_list()

def clear_steps():
    sequence_steps.clear()
    refresh_seq_list()

def refresh_seq_list():
    seq_listbox.delete(0, tk.END)
    total = 0
    for i, step in enumerate(sequence_steps):
        d = step["dir"]
        dur_s = step["duration"] / 1000
        total += dur_s
        if d == "S":
            label = f"  {i+1}.  Stop  —  {dur_s:.1f}s"
        else:
            spd = SPEED_LABELS[step["speed"]]
            lbl = DIR_LABELS[d]
            label = f"  {i+1}.  {lbl}  ·  {spd}  —  {dur_s:.1f}s"
        seq_listbox.insert(tk.END, label)
    total_var.set(f"Total: {total:.1f}s")

def toggle_speed_state(*args):
    d = step_dir_var.get()
    state = tk.DISABLED if d == "S" else tk.NORMAL
    spd_menu.config(state=state)

# ─────────────────────────────────────────────────────────────
# UI state helpers
# ─────────────────────────────────────────────────────────────

ctrl_widgets = []

def set_controls_state(state):
    for w in ctrl_widgets:
        try:
            w.config(state=state)
        except:
            pass

# ─────────────────────────────────────────────────────────────
# Build GUI
# ─────────────────────────────────────────────────────────────

root = tk.Tk()
root.title("Physics Cart Controller")
root.resizable(False, False)
root.configure(bg="#f4f4f4")

FONT       = ("Segoe UI", 10)
FONT_BOLD  = ("Segoe UI", 10, "bold")
FONT_LARGE = ("Segoe UI", 13, "bold")
FONT_SMALL = ("Segoe UI", 9)

BG         = "#f4f4f4"
PANEL      = "#ffffff"
BORDER     = "#d0d0d0"
BTN_FG     = "#222222"
STOP_BG    = "#c0392b"
STOP_FG    = "#ffffff"
FWD_BG     = "#2171b5"
REV_BG     = "#6a51a3"
SEQ_BG     = "#1a7a3c"
GRAY_BTN   = "#888888"

def make_button(parent, text, cmd, bg="#e8e8e8", fg=BTN_FG,
                width=12, font=FONT_BOLD, pady=6):
    b = tk.Button(parent, text=text, command=cmd, bg=bg, fg=fg,
                  font=font, width=width, pady=pady,
                  relief=tk.FLAT, cursor="hand2",
                  activebackground=bg, activeforeground=fg)
    b.bind("<Enter>", lambda e: b.config(bg=_lighten(bg)))
    b.bind("<Leave>", lambda e: b.config(bg=bg))
    return b

def _lighten(hex_color):
    """Return a slightly lighter shade for hover."""
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    r = min(255, r + 20)
    g = min(255, g + 20)
    b = min(255, b + 20)
    return f"#{r:02x}{g:02x}{b:02x}"

def panel(parent, title=None, padx=12, pady=10):
    f = tk.Frame(parent, bg=PANEL, relief=tk.FLAT,
                 highlightbackground=BORDER, highlightthickness=1)
    if title:
        tk.Label(f, text=title, font=FONT_BOLD, bg=PANEL,
                 fg="#444444").pack(anchor="w", padx=padx, pady=(pady, 2))
    return f

# ── Top: connection bar ───────────────────────────────────────
conn_frame = tk.Frame(root, bg=BG)
conn_frame.pack(fill=tk.X, padx=14, pady=(14, 0))

tk.Label(conn_frame, text="Port:", font=FONT, bg=BG).pack(side=tk.LEFT)

port_var = tk.StringVar()
port_menu = ttk.Combobox(conn_frame, textvariable=port_var, width=16,
                          font=FONT, state="readonly")
port_menu["values"] = list_ports()
if port_menu["values"]:
    port_menu.current(0)
port_menu.pack(side=tk.LEFT, padx=(4, 8))

def refresh_ports():
    port_menu["values"] = list_ports()
    if port_menu["values"]:
        port_menu.current(0)

tk.Button(conn_frame, text="↻", font=FONT, bg=BG, relief=tk.FLAT,
          cursor="hand2", command=refresh_ports).pack(side=tk.LEFT, padx=(0, 8))

def toggle_connection():
    if connected:
        disconnect()
    else:
        p = port_var.get()
        if not p:
            messagebox.showwarning("No port", "Select a COM port first.")
            return
        connect(p)

connect_btn = tk.Button(conn_frame, text="Connect", font=FONT_BOLD,
                         bg="#2c7bb6", fg="white", relief=tk.FLAT,
                         cursor="hand2", command=toggle_connection, padx=12)
connect_btn.pack(side=tk.LEFT)

status_var   = tk.StringVar(value="Not connected")
status_label = tk.Label(conn_frame, textvariable=status_var,
                         font=FONT_SMALL, bg=BG, fg="#a0522d")
status_label.pack(side=tk.LEFT, padx=(12, 0))

# ── Main content area ─────────────────────────────────────────
content = tk.Frame(root, bg=BG)
content.pack(fill=tk.BOTH, padx=14, pady=10)

left_col  = tk.Frame(content, bg=BG)
right_col = tk.Frame(content, bg=BG)
left_col.pack(side=tk.LEFT, fill=tk.BOTH, padx=(0, 8))
right_col.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

# ── STOP button (always on top, big) ─────────────────────────
stop_panel = panel(left_col)
stop_panel.pack(fill=tk.X, pady=(0, 8))

stop_btn = make_button(stop_panel, "⏹  STOP", cmd_stop,
                        bg=STOP_BG, fg=STOP_FG, width=18,
                        font=("Segoe UI", 14, "bold"), pady=12)
stop_btn.pack(padx=12, pady=10)
ctrl_widgets.append(stop_btn)

# ── Forward controls ──────────────────────────────────────────
fwd_panel = panel(left_col, "Forward")
fwd_panel.pack(fill=tk.X, pady=(0, 8))

fwd_inner = tk.Frame(fwd_panel, bg=PANEL)
fwd_inner.pack(padx=12, pady=(0, 10))
for spd, label in [(1, "Slow\n20 cm/s"), (2, "Med\n40 cm/s"), (3, "Fast\n60 cm/s")]:
    b = make_button(fwd_inner, label,
                    lambda s=spd: cmd_move("FWD", s),
                    bg=FWD_BG, fg="white", width=8)
    b.pack(side=tk.LEFT, padx=4)
    ctrl_widgets.append(b)

# ── Reverse controls ──────────────────────────────────────────
rev_panel = panel(left_col, "Reverse")
rev_panel.pack(fill=tk.X, pady=(0, 8))

rev_inner = tk.Frame(rev_panel, bg=PANEL)
rev_inner.pack(padx=12, pady=(0, 10))
for spd, label in [(1, "Slow\n20 cm/s"), (2, "Med\n40 cm/s"), (3, "Fast\n60 cm/s")]:
    b = make_button(rev_inner, label,
                    lambda s=spd: cmd_move("REV", s),
                    bg=REV_BG, fg="white", width=8)
    b.pack(side=tk.LEFT, padx=4)
    ctrl_widgets.append(b)

# ── Serial log ────────────────────────────────────────────────
log_panel = panel(left_col, "Serial log")
log_panel.pack(fill=tk.BOTH, expand=True)

log_box = tk.Text(log_panel, height=8, font=("Consolas", 9),
                   bg="#1e1e1e", fg="#d4d4d4",
                   state=tk.DISABLED, relief=tk.FLAT, wrap=tk.WORD)
log_box.pack(padx=8, pady=(0, 8), fill=tk.BOTH, expand=True)

# ── Sequence builder ──────────────────────────────────────────
seq_panel = panel(right_col, "Sequence builder")
seq_panel.pack(fill=tk.BOTH, expand=True)

# Step controls row
step_row = tk.Frame(seq_panel, bg=PANEL)
step_row.pack(fill=tk.X, padx=12, pady=(0, 6))

tk.Label(step_row, text="Direction:", font=FONT, bg=PANEL).grid(row=0, column=0, sticky="w", padx=(0, 4))
step_dir_var = tk.StringVar(value="F")
dir_menu = ttk.Combobox(step_row, textvariable=step_dir_var,
                          values=["F", "R", "S"],
                          width=6, state="readonly", font=FONT)
dir_menu.grid(row=0, column=1, padx=(0, 14))
# Map display values
dir_display = {"F": "Forward", "R": "Reverse", "S": "Stop"}
dir_menu["values"] = ["F", "R", "S"]

tk.Label(step_row, text="Speed:", font=FONT, bg=PANEL).grid(row=0, column=2, sticky="w", padx=(0, 4))
step_spd_var = tk.IntVar(value=1)
spd_menu = ttk.Combobox(step_row, textvariable=step_spd_var,
                          values=[1, 2, 3], width=4,
                          state="readonly", font=FONT)
spd_menu.grid(row=0, column=3, padx=(0, 14))

tk.Label(step_row, text="Duration (s):", font=FONT, bg=PANEL).grid(row=0, column=4, sticky="w", padx=(0, 4))
step_dur_var = tk.StringVar(value="2.0")
dur_entry = tk.Entry(step_row, textvariable=step_dur_var,
                      width=6, font=FONT)
dur_entry.grid(row=0, column=5, padx=(0, 14))
ctrl_widgets.append(dur_entry)

add_btn = make_button(step_row, "Add step", add_step,
                       bg="#444444", fg="white", width=9)
add_btn.grid(row=0, column=6)
ctrl_widgets.append(add_btn)

step_dir_var.trace_add("write", toggle_speed_state)

# Listbox
list_frame = tk.Frame(seq_panel, bg=PANEL)
list_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 6))

scrollbar = tk.Scrollbar(list_frame, orient=tk.VERTICAL)
seq_listbox = tk.Listbox(list_frame, font=("Consolas", 10),
                          yscrollcommand=scrollbar.set,
                          selectmode=tk.SINGLE, height=10,
                          bg="#fafafa", relief=tk.FLAT,
                          highlightbackground=BORDER,
                          highlightthickness=1)
scrollbar.config(command=seq_listbox.yview)
seq_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

# Total time label
total_var = tk.StringVar(value="Total: 0.0s")
tk.Label(seq_panel, textvariable=total_var, font=FONT_SMALL,
          bg=PANEL, fg="#666666").pack(anchor="e", padx=14)

# Sequence status label (shows armed / running state)
seq_status_var = tk.StringVar(value="")
seq_status_label = tk.Label(seq_panel, textvariable=seq_status_var,
                             font=FONT_BOLD, bg=PANEL, fg="#b8860b")
seq_status_label.pack(anchor="w", padx=14, pady=(0, 4))

# Sequence action row
seq_btn_row = tk.Frame(seq_panel, bg=PANEL)
seq_btn_row.pack(fill=tk.X, padx=12, pady=(4, 10))

remove_btn = make_button(seq_btn_row, "Remove", remove_selected_step,
                          bg=GRAY_BTN, fg="white", width=8)
remove_btn.pack(side=tk.LEFT, padx=(0, 6))
ctrl_widgets.append(remove_btn)

clear_btn = make_button(seq_btn_row, "Clear all", clear_steps,
                         bg=GRAY_BTN, fg="white", width=8)
clear_btn.pack(side=tk.LEFT, padx=(0, 20))
ctrl_widgets.append(clear_btn)

run_seq_btn = make_button(seq_btn_row, "Arm sequence", run_sequence,
                           bg=SEQ_BG, fg="white", width=14)
run_seq_btn.pack(side=tk.LEFT, padx=(0, 6))
ctrl_widgets.append(run_seq_btn)

stop_seq_btn = make_button(seq_btn_row, "Stop", stop_sequence,
                            bg=STOP_BG, fg="white", width=6)
stop_seq_btn.pack(side=tk.LEFT)
ctrl_widgets.append(stop_seq_btn)

# ── Initial state: controls disabled until connected ──────────
set_controls_state(tk.DISABLED)

root.mainloop()
