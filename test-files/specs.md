# Technical Specifications

## Electrical Parameters

| Parameter | Min | Typ | Max | Unit |
|-----------|-----|-----|-----|------|
| Input Voltage | 10 | 24 | 50 | V |
| Continuous Current | - | 6 | - | A |
| Peak Current | - | - | 8 | A |
| Logic Voltage | 3.0 | 3.3/5.0 | 5.5 | V |

## Control Features

### Microstepping
- **Resolution:** 1/1 to 1/256 steps
- **Interpolation:** Hardware-based smooth motion
- **Accuracy:** ±0.1% step accuracy

### PWM Control
- **Frequency:** 25 kHz (configurable 15-50 kHz)
- **Dead Time:** 100ns minimum
- **Current Regulation:** Chopper-based with adaptive decay

## Physical Specifications

### Dimensions
- **PCB Size:** 50mm × 40mm × 15mm
- **Weight:** 25g (without heatsink)
- **Mounting:** 4x M3 holes, 2.54mm pitch

### Environmental
- **Operating Temperature:** -20°C to +85°C
- **Storage Temperature:** -40°C to +125°C
- **Humidity:** 5% to 95% non-condensing

## Interface Specifications

### Step/Direction Interface
- **Step Input:** 3.3V/5V compatible
- **Direction Input:** 3.3V/5V compatible  
- **Maximum Step Rate:** 200 kHz
- **Input Impedance:** 10kΩ pull-down

### UART Interface
- **Baud Rate:** 9600 to 115200 bps
- **Data Format:** 8N1 (8 data bits, no parity, 1 stop bit)
- **Voltage Levels:** 3.3V TTL
- **Connector:** 4-pin JST-PH 2.0mm

### CAN-FD Interface  
- **Speed:** Up to 5 Mbps
- **Termination:** 120Ω built-in (switchable)
- **Connector:** 4-pin JST-PH 2.0mm
- **Protocol:** CANopen compatible

## Encoder Interface

### Supported Encoders
- **Type:** Incremental quadrature
- **Resolution:** Up to 4096 PPR
- **Voltage:** 3.3V or 5V
- **Connector:** 6-pin JST-PH 2.0mm

### Feedback Performance
- **Position Accuracy:** ±1 encoder count
- **Velocity Measurement:** Real-time calculation
- **Stall Detection:** Configurable threshold

## Protection Features

### Overcurrent Protection
- **Hardware Limit:** 8A peak
- **Software Limit:** User configurable
- **Response Time:** <10μs

### Thermal Protection
- **Temperature Sensor:** On-board NTC
- **Shutdown Temperature:** 125°C
- **Hysteresis:** 10°C

### Fault Detection
- **Motor Disconnection:** Automatic detection
- **Encoder Failure:** Signal validation
- **Power Supply Issues:** Under/overvoltage protection

## Compliance

- **EMC:** CE marked, FCC Part 15 Class B
- **Safety:** UL recognized components
- **RoHS:** Compliant (lead-free)