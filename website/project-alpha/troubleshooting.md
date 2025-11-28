# Troubleshooting Guide

## Common Issues

### Motor Not Moving

**Symptoms:**
- Motor receives step signals but doesn't rotate
- No response to position commands
- Motor feels locked or difficult to turn by hand

**Possible Causes & Solutions:**

#### Power Supply Issues
- **Check voltage:** Ensure 12-48V DC supply within specifications
- **Check current capacity:** Minimum 3A recommended for full performance
- **Verify connections:** Loose power connections can cause intermittent operation

#### Motor Current Settings
``` bash
# Check current setting
GET CURRENT

# Set appropriate current (typically 70-80% of motor rating)
SET CURRENT 3000  # For 4A motor, use 3000mA
```

#### Enable Signal
```bash
# Verify motor is enabled
GET STATUS

# Enable motor if disabled
SET ENABLE 1
```

#### Motor Wiring
- Verify correct phase connections (A+, A-, B+, B-)
- Check for short circuits or open connections
- Test motor resistance (typically 1-5Ω per phase)

### Position Errors

**Symptoms:**
- Motor position doesn't match commanded position
- Gradual drift over time
- Large position errors after rapid movements

**Diagnostic Steps:**

#### Check Encoder Operation
```bash
# Read encoder position
GET ENC_POS

# Read motor position  
GET MOTOR_POS

# Compare values - should track closely
```

#### Verify Encoder Connections
- Check A/B channel signals with oscilloscope
- Ensure proper 5V power supply to encoder
- Verify cable shielding and grounding

#### Mechanical Issues
- Check for binding or excessive friction
- Verify coupling alignment between motor and load
- Ensure adequate torque for the application

#### Tuning Parameters
```bash
# Adjust position loop gains
SET KP 100        # Proportional gain
SET KI 10         # Integral gain  
SET KD 5          # Derivative gain

# Set position error limits
SET POS_ERROR_LIMIT 50  # Steps
```

### Communication Problems

**Symptoms:**
- No response to commands
- Garbled or incomplete responses
- Intermittent communication

**Solutions:**

#### UART Interface
```bash
# Test basic communication
GET STATUS

# Check baud rate setting
GET BAUDRATE

# Reset to default if needed
SET BAUDRATE 115200
```

#### Cable Issues
- Use shielded cable for long runs (>1m)
- Check for proper ground connections
- Avoid running signal cables parallel to power cables

#### Electrical Interference
- Add ferrite cores to signal cables
- Use twisted pair wiring for differential signals
- Ensure proper system grounding

### Overheating Issues

**Symptoms:**
- Thermal protection triggered
- Reduced performance at high currents
- Hot driver enclosure

**Prevention & Solutions:**

#### Cooling Improvements
- Install external heatsink (recommended for >4A continuous)
- Ensure adequate airflow around driver
- Mount driver vertically for better convection

#### Current Optimization
```bash
# Reduce current when not moving
SET IDLE_CURRENT 1000  # 50% of run current

# Use current ramping for smooth operation
SET CURRENT_RAMP 100   # mA per ms
```

#### Thermal Monitoring
```bash
# Check temperature
GET TEMP

# Set thermal limits
SET TEMP_LIMIT 80      # Celsius
```

### Encoder Faults

**Symptoms:**
- ENCODER_FAULT error code
- Erratic position readings
- Loss of closed-loop control

**Diagnostic Procedure:**

#### Signal Quality Check
Use oscilloscope to verify:
- Clean square wave signals on A/B channels
- Proper voltage levels (0V/5V or 0V/3.3V)
- 90° phase relationship between channels

#### Electrical Checks
```bash
# Check encoder power
GET ENC_VOLTAGE  # Should be ~5V

# Verify signal integrity
GET ENC_SIGNALS  # Returns A/B state
```

#### Mechanical Alignment
- Ensure encoder shaft coupling is secure
- Check for excessive runout or vibration
- Verify encoder mounting is rigid

### CAN-FD Network Issues

**Symptoms:**
- Node not visible on network
- Message transmission failures
- Network errors or timeouts

**Network Diagnostics:**

#### Basic Connectivity
```bash
# Check node ID and network status
GET NODE_ID
GET CAN_STATUS

# Verify termination settings
GET TERMINATION
```

#### Bus Configuration
```bash
# Set appropriate baud rate
SET CAN_SPEED 500000   # 500 kbps

# Enable/disable termination as needed
SET TERMINATION 1      # Enable for end nodes
SET TERMINATION 0      # Disable for intermediate nodes
```

#### Message Monitoring
Use CAN analyzer to check:
- Proper message formatting
- Correct node IDs
- No bus conflicts or collisions

## Error Code Reference

### System Errors

| Code | Description | Action Required |
|------|-------------|-----------------|
| 0x01 | Overcurrent Protection | Reduce current setting or check motor |
| 0x02 | Thermal Protection | Improve cooling or reduce current |
| 0x04 | Encoder Fault | Check encoder connections and signals |
| 0x08 | Position Error | Verify mechanical system and tuning |
| 0x10 | Supply Voltage Fault | Check power supply voltage |
| 0x20 | Motor Disconnected | Verify motor connections |

### Communication Errors

| Code | Description | Action Required |
|------|-------------|-----------------|
| 0x40 | UART Timeout | Check cable and baud rate |
| 0x80 | CAN Bus Error | Verify network configuration |
| 0x100 | Command Error | Check command syntax |
| 0x200 | Parameter Error | Verify parameter ranges |

## Diagnostic Tools

### Built-in Diagnostics

```bash
# Comprehensive system test
CMD SELFTEST

# Motor and encoder test
CMD MOTOR_TEST

# Communication test
CMD COMM_TEST

# Generate diagnostic report
CMD DIAG_REPORT
```

### External Tools

#### Oscilloscope Measurements
- **Step/Dir signals:** Check timing and voltage levels
- **Encoder signals:** Verify quadrature relationship
- **Power supply:** Check for noise and regulation

#### Multimeter Checks
- **Motor resistance:** 1-5Ω typical per phase
- **Supply voltage:** Within ±5% of nominal
- **Ground continuity:** <1Ω resistance

### Performance Monitoring

```bash
# Monitor key parameters
GET PERFORMANCE

# Returns:
# - Step rate capability
# - Position accuracy
# - Thermal status
# - Error history
```

## Preventive Maintenance

### Regular Checks
- Monthly temperature monitoring during operation
- Quarterly connection inspection and tightening
- Annual encoder alignment verification

### Firmware Updates
```bash
# Check current firmware version
GET VERSION

# Update procedure (via bootloader)
CMD BOOTLOADER
# Follow update instructions in manual
```

### Configuration Backup
```bash
# Save current settings
CMD SAVE_CONFIG

# Export for backup
CMD EXPORT_CONFIG > backup.txt
```

## Getting Help

If problems persist after following this guide:

1. **Check Documentation:** Review [setup guide](setup.md) and [API reference](../sub/api.md)
2. **Community Support:** Visit our [forum](https://forum.creapunk.com)
3. **Technical Support:** Email support@creapunk.com with:
   - Detailed problem description
   - System configuration
   - Error codes and diagnostic output
   - Photos/videos if applicable

### Support Information Template

```
System Information:
- Driver Model: CLN17 v3.0
- Firmware Version: [GET VERSION output]
- Motor Type: [manufacturer/model]
- Encoder Type: [manufacturer/model]
- Power Supply: [voltage/current rating]

Problem Description:
- When does the issue occur?
- What was the system doing when it started?
- Any recent changes to setup or configuration?

Diagnostic Output:
[Include output from GET STATUS, CMD DIAG_REPORT]
```