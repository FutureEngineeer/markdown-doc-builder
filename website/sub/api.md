# API Documentation

## Command Reference

### Position Control

#### GET POS
Returns current motor position in steps.

**Syntax:** `GET POS`  
**Response:** `POS <value>`  
**Example:**
```
> GET POS
< POS 1500
```

#### SET POS
Sets target position for motor movement.

**Syntax:** `SET POS <steps>`  
**Parameters:**
- `steps`: Target position (-2147483648 to 2147483647)

**Example:**
```
> SET POS 1000
< OK
```

#### MOVE REL
Moves motor relative to current position.

**Syntax:** `MOVE REL <steps>`  
**Parameters:**
- `steps`: Relative movement in steps

**Example:**
```
> MOVE REL 500
< OK
```

### Velocity Control

#### SET VEL
Sets maximum velocity for movements.

**Syntax:** `SET VEL <steps_per_sec>`  
**Parameters:**
- `steps_per_sec`: Maximum velocity (1 to 50000)

**Example:**
```
> SET VEL 2000
< OK
```

#### GET VEL
Returns current velocity setting.

**Syntax:** `GET VEL`  
**Response:** `VEL <value>`

### Current Control

#### SET CURRENT
Sets motor current in milliamps.

**Syntax:** `SET CURRENT <milliamps>`  
**Parameters:**
- `milliamps`: Current setting (100 to 6000)

**Example:**
```
> SET CURRENT 3000
< OK
```

#### GET CURRENT
Returns current setting.

**Syntax:** `GET CURRENT`  
**Response:** `CURRENT <value>`

### System Commands

#### GET STATUS
Returns comprehensive system status.

**Syntax:** `GET STATUS`  
**Response:** Multi-line status information

**Example:**
```
> GET STATUS
< STATUS OK
< POS 1500
< VEL 2000  
< CURRENT 3000
< TEMP 45
< ENABLED 1
```

#### RESET
Performs system reset.

**Syntax:** `RESET`  
**Response:** `RESET OK`

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 0x01 | OVERCURRENT | Motor current exceeded limit |
| 0x02 | OVERHEAT | Temperature protection triggered |
| 0x04 | ENCODER_FAULT | Encoder signal lost or invalid |
| 0x08 | POSITION_ERROR | Position tracking error too large |
| 0x10 | SUPPLY_FAULT | Power supply voltage out of range |
| 0x20 | MOTOR_FAULT | Motor disconnected or short circuit |

## Programming Examples

### Python Interface

```python
import serial
import time

class CLN17Driver:
    def __init__(self, port, baudrate=115200):
        self.ser = serial.Serial(port, baudrate, timeout=1)
        time.sleep(0.1)  # Allow connection to establish
    
    def send_command(self, cmd):
        """Send command and return response"""
        self.ser.write(f"{cmd}\r\n".encode())
        response = self.ser.readline().decode().strip()
        return response
    
    def get_position(self):
        """Get current position"""
        response = self.send_command("GET POS")
        return int(response.split()[1])
    
    def set_position(self, pos):
        """Set target position"""
        response = self.send_command(f"SET POS {pos}")
        return response == "OK"
    
    def move_relative(self, steps):
        """Move relative to current position"""
        response = self.send_command(f"MOVE REL {steps}")
        return response == "OK"
    
    def set_current(self, current_ma):
        """Set motor current in mA"""
        response = self.send_command(f"SET CURRENT {current_ma}")
        return response == "OK"
    
    def enable_motor(self, enable=True):
        """Enable or disable motor"""
        cmd = "SET ENABLE 1" if enable else "SET ENABLE 0"
        response = self.send_command(cmd)
        return response == "OK"

# Usage example
driver = CLN17Driver('/dev/ttyUSB0')
driver.set_current(3000)
driver.enable_motor(True)
driver.set_position(1000)
```

### Arduino Interface

```cpp
#include <SoftwareSerial.h>

SoftwareSerial driverSerial(2, 3); // RX, TX

void setup() {
  Serial.begin(115200);
  driverSerial.begin(115200);
  
  // Initialize driver
  sendCommand("SET CURRENT 3000");
  sendCommand("SET ENABLE 1");
}

void loop() {
  // Move back and forth
  sendCommand("SET POS 1000");
  delay(2000);
  sendCommand("SET POS 0");
  delay(2000);
}

String sendCommand(String cmd) {
  driverSerial.println(cmd);
  delay(10);
  
  String response = "";
  while (driverSerial.available()) {
    response += (char)driverSerial.read();
  }
  
  Serial.println("Sent: " + cmd);
  Serial.println("Response: " + response);
  return response.trim();
}
```

### C# Interface

```csharp
using System;
using System.IO.Ports;
using System.Threading;

public class CLN17Driver
{
    private SerialPort serialPort;
    
    public CLN17Driver(string portName, int baudRate = 115200)
    {
        serialPort = new SerialPort(portName, baudRate);
        serialPort.Open();
        Thread.Sleep(100); // Allow connection to establish
    }
    
    public string SendCommand(string command)
    {
        serialPort.WriteLine(command);
        Thread.Sleep(10);
        return serialPort.ReadLine().Trim();
    }
    
    public int GetPosition()
    {
        string response = SendCommand("GET POS");
        return int.Parse(response.Split(' ')[1]);
    }
    
    public bool SetPosition(int position)
    {
        string response = SendCommand($"SET POS {position}");
        return response == "OK";
    }
    
    public bool SetCurrent(int currentMa)
    {
        string response = SendCommand($"SET CURRENT {currentMa}");
        return response == "OK";
    }
    
    public void Close()
    {
        serialPort?.Close();
    }
}

// Usage
var driver = new CLN17Driver("COM3");
driver.SetCurrent(3000);
driver.SetPosition(1000);
```

## Advanced Features

### Trajectory Planning

For smooth motion profiles, use velocity ramping:

```python
def smooth_move(driver, target, max_vel=2000, accel=5000):
    """Move with acceleration/deceleration"""
    current_pos = driver.get_position()
    distance = abs(target - current_pos)
    
    # Calculate ramp parameters
    ramp_distance = (max_vel * max_vel) // (2 * accel)
    
    if distance > 2 * ramp_distance:
        # Trapezoidal profile
        driver.send_command(f"SET ACCEL {accel}")
        driver.send_command(f"SET VEL {max_vel}")
    else:
        # Triangular profile
        peak_vel = int((distance * accel) ** 0.5)
        driver.send_command(f"SET VEL {peak_vel}")
    
    driver.set_position(target)
```

### Multi-Axis Coordination

For coordinated multi-axis movement:

```python
def coordinated_move(drivers, targets):
    """Move multiple axes simultaneously"""
    # Calculate timing for synchronized arrival
    distances = []
    for i, driver in enumerate(drivers):
        current = driver.get_position()
        distances.append(abs(targets[i] - current))
    
    max_distance = max(distances)
    
    # Set velocities proportionally
    for i, driver in enumerate(drivers):
        if distances[i] > 0:
            vel = int(2000 * distances[i] / max_distance)
            driver.send_command(f"SET VEL {vel}")
            driver.set_position(targets[i])
```

For more examples, see [example projects](../project-alpha/examples.md#multi-axis-control).