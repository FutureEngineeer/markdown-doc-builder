# Setup and Installation Guide

## Installation

### Hardware Requirements

Before installation, ensure you have:
- 12-48V DC power supply (minimum 3A capacity)
- NEMA17 stepper motor
- Appropriate cables and connectors
- Optional: External heatsink for high-current applications

### Physical Installation

1. **Mount the Driver**
   - Secure to DIN rail or mounting surface
   - Allow 5mm clearance on all sides for ventilation
   - Orient with connectors accessible

2. **Connect Power Supply**
   - Use 16-18 AWG wire for power connections
   - Observe polarity: Red (+), Black (-)
   - Add 100μF capacitor near driver for noise reduction

3. **Connect Stepper Motor**
   - Use shielded 4-wire cable
   - Maximum cable length: 3 meters
   - Connect phases A and B as marked

## UART Configuration

### Connection Setup

The UART interface uses a 4-pin JST-PH connector:

| Pin | Signal | Description |
|-----|--------|-------------|
| 1   | GND    | Ground reference |
| 2   | RX     | Receive data (to driver) |
| 3   | TX     | Transmit data (from driver) |
| 4   | 3V3    | 3.3V power output |

### Communication Parameters

- **Baud Rate:** 115200 bps (default)
- **Data Format:** 8N1
- **Flow Control:** None
- **Termination:** CR+LF (\r\n)

### Basic Commands

```bash
# Check current setting
GET CURRENT

# Set appropriate current (typically 70-80% of motor rating)
SET CURRENT 3000  # For 4A motor, use 3000mA
```

```
# Read current position
GET POS

# Set target position  
SET POS 1000

# Set maximum current (mA)
SET CURRENT 3000

# Enable/disable motor
SET ENABLE 1
SET ENABLE 0

# Read status
GET STATUS
```

## CAN-FD Configuration

### Network Setup

1. **Termination Resistors**
   - Enable built-in 120Ω termination for end nodes
   - Disable for intermediate nodes
   - Use `SET TERM 1` or `SET TERM 0`

2. **Node ID Assignment**
   - Each driver needs unique ID (1-127)
   - Set via `SET NODE_ID <id>` command
   - Default ID is 1

3. **Baud Rate Configuration**
   - Standard rates: 125k, 250k, 500k, 1M bps
   - CAN-FD rates: up to 5M bps
   - Configure via `SET CAN_SPEED <rate>`

### CANopen Integration

The driver supports CANopen protocol for industrial networks:

```python
# Python example using python-canopen
import canopen

# Create network
network = canopen.Network()
network.connect(channel='can0', bustype='socketcan')

# Add driver node
node = network.add_node(1, 'driver_profile.eds')

# Read position
position = node.sdo['Position Actual Value'].raw

# Set target position
node.sdo['Target Position'].raw = 5000
```

## Specifications 
### Electrical Parameters

| Parameter | Min | Typ | Max | Unit |
|-----------|-----|-----|-----|------|
| Input Voltage | 10 | 24 | 50 | V |
| Continuous Current | - | 6 | - | A |
| Peak Current | - | - | 8 | A |

### Control

- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible
- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible
- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)
- **Logic Voltage:** 3.3V/5V compatible

### Physical

- 🎓**Dimensions:** 50mm × 40mm × 15mm
- 🎓**PCB Layers:** 4-layer with optimized thermal design
- 🎓**Connectors:** JST-PH 2.0mm power, 2.54mm headers

Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!NOTE]
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

## Encoder Setup

### Wiring

Connect incremental encoder to 6-pin connector:

| Pin | Signal | Description |
|-----|--------|-------------|
| 1   | VCC    | 5V power |
| 2   | GND    | Ground |
| 3   | A+     | Channel A positive |
| 4   | A-     | Channel A negative |
| 5   | B+     | Channel B positive |
| 6   | B-     | Channel B negative |

### Calibration

1. **Set Encoder Resolution**
   ```
   SET ENC_PPR 1000
   ```

2. **Perform Homing**
   ```
   SET HOME_MODE 1    # Home to index pulse
   CMD HOME           # Start homing sequence
   ```

3. **Verify Operation**
   ```
   GET ENC_POS        # Read encoder position
   GET MOTOR_POS      # Read motor position
   ```

## Software Configuration

### Configuration Tool

Use the provided configuration software for easy setup:

1. Download from [releases page](https://github.com/creapunk/cln17-config/releases)
2. Connect via USB-UART adapter
3. Auto-detect driver and load current settings
4. Modify parameters using GUI
5. Save configuration to driver EEPROM

### Parameter Backup

Save current configuration:
```
CMD SAVE_CONFIG    # Save to EEPROM
CMD EXPORT_CONFIG  # Export as text file
```

Restore configuration:
```
CMD LOAD_CONFIG    # Load from EEPROM
CMD IMPORT_CONFIG  # Import from text file
```

## Troubleshooting

### Common Issues

**Motor not moving:**
- Check power supply voltage and current capacity
- Verify motor connections and phases
- Ensure ENABLE signal is active
- Check for fault conditions with `GET STATUS`

**Position errors:**
- Verify encoder connections and signals
- Check for mechanical binding or excessive load
- Adjust current settings if insufficient torque
- Calibrate encoder resolution and direction

**Communication problems:**
- Verify baud rate and connection parameters
- Check cable integrity and shielding
- Ensure proper ground connections
- Test with simple commands first

For detailed troubleshooting, see [troubleshooting guide](troubleshooting.md#common-issues).

## Safety Considerations

> [!WARNING]
> Always disconnect power before making connections

> [!CAUTION]  
> Driver can become hot during operation - avoid direct contact

- Use appropriate wire gauges for current ratings
- Provide adequate ventilation and cooling
- Install emergency stop systems for automated equipment
- Follow local electrical codes and regulations