# Example Projects

## Basic Setup

### Simple Position Control

This example demonstrates basic position control using Python:

```python
#!/usr/bin/env python3
"""
Basic CLN17 Position Control Example
Moves motor between two positions repeatedly
"""

import serial
import time
import sys

class CLN17Controller:
    def __init__(self, port='/dev/ttyUSB0', baudrate=115200):
        try:
            self.serial = serial.Serial(port, baudrate, timeout=1)
            time.sleep(0.5)  # Allow connection to establish
            print(f"Connected to CLN17 on {port}")
        except serial.SerialException as e:
            print(f"Error connecting to {port}: {e}")
            sys.exit(1)
    
    def send_command(self, cmd):
        """Send command and return response"""
        self.serial.write(f"{cmd}\r\n".encode())
        response = self.serial.readline().decode().strip()
        print(f"CMD: {cmd} -> {response}")
        return response
    
    def initialize(self):
        """Initialize driver with safe settings"""
        self.send_command("SET CURRENT 2000")  # 2A current
        self.send_command("SET VEL 1000")      # 1000 steps/sec
        self.send_command("SET ACCEL 2000")    # 2000 steps/sec²
        self.send_command("SET ENABLE 1")      # Enable motor
        time.sleep(0.1)
    
    def move_to_position(self, position):
        """Move to absolute position and wait for completion"""
        self.send_command(f"SET POS {position}")
        
        # Wait for movement to complete
        while True:
            status = self.send_command("GET STATUS")
            if "MOVING" not in status:
                break
            time.sleep(0.1)
    
    def get_position(self):
        """Get current position"""
        response = self.send_command("GET POS")
        return int(response.split()[1])

def main():
    # Initialize controller
    controller = CLN17Controller()
    controller.initialize()
    
    # Define positions
    positions = [0, 1000, 2000, 1000, 0]
    
    print("Starting position sequence...")
    
    try:
        for i, pos in enumerate(positions):
            print(f"\nStep {i+1}: Moving to position {pos}")
            controller.move_to_position(pos)
            
            # Verify position
            actual_pos = controller.get_position()
            print(f"Target: {pos}, Actual: {actual_pos}")
            
            time.sleep(1)  # Pause between moves
            
    except KeyboardInterrupt:
        print("\nStopping...")
        controller.send_command("SET ENABLE 0")
    
    print("Example complete!")

if __name__ == "__main__":
    main()
```

### Arduino Stepper Control

```cpp
/*
  CLN17 Arduino Control Example
  Controls stepper motor via UART commands
*/

#include <SoftwareSerial.h>

// Create serial connection to CLN17
SoftwareSerial driverSerial(2, 3); // RX, TX pins

// Position array for demo
int positions[] = {0, 500, 1000, 1500, 2000, 1000, 0};
int numPositions = sizeof(positions) / sizeof(positions[0]);
int currentIndex = 0;

void setup() {
  Serial.begin(115200);
  driverSerial.begin(115200);
  
  Serial.println("CLN17 Arduino Control Example");
  
  // Initialize driver
  delay(1000);
  sendCommand("SET CURRENT 2000");
  sendCommand("SET VEL 800");
  sendCommand("SET ACCEL 1500");
  sendCommand("SET ENABLE 1");
  
  Serial.println("Driver initialized");
}

void loop() {
  int targetPos = positions[currentIndex];
  
  Serial.print("Moving to position: ");
  Serial.println(targetPos);
  
  // Send position command
  String cmd = "SET POS " + String(targetPos);
  sendCommand(cmd);
  
  // Wait for movement to complete
  waitForCompletion();
  
  // Verify position
  String response = sendCommand("GET POS");
  Serial.println("Position confirmed: " + response);
  
  // Move to next position
  currentIndex = (currentIndex + 1) % numPositions;
  
  delay(2000); // Wait 2 seconds between moves
}

String sendCommand(String cmd) {
  driverSerial.println(cmd);
  delay(50); // Allow processing time
  
  String response = "";
  unsigned long timeout = millis() + 1000; // 1 second timeout
  
  while (millis() < timeout) {
    if (driverSerial.available()) {
      char c = driverSerial.read();
      if (c == '\n') break;
      if (c != '\r') response += c;
    }
  }
  
  Serial.println("CMD: " + cmd + " -> " + response);
  return response;
}

void waitForCompletion() {
  Serial.print("Waiting for movement completion");
  
  while (true) {
    String status = sendCommand("GET STATUS");
    
    if (status.indexOf("MOVING") == -1) {
      Serial.println(" Done!");
      break;
    }
    
    Serial.print(".");
    delay(100);
  }
}
```

## Multi-Axis Control

### Coordinated XY Movement

```python
#!/usr/bin/env python3
"""
Multi-axis coordinated movement example
Controls X and Y axes for 2D positioning
"""

import serial
import time
import math

class MultiAxisController:
    def __init__(self, x_port='/dev/ttyUSB0', y_port='/dev/ttyUSB1'):
        self.x_axis = CLN17Controller(x_port)
        self.y_axis = CLN17Controller(y_port)
        
        # Initialize both axes
        for axis in [self.x_axis, self.y_axis]:
            axis.initialize()
    
    def move_to_xy(self, x, y, speed=1000):
        """Move to X,Y coordinate with synchronized timing"""
        
        # Get current positions
        current_x = self.x_axis.get_position()
        current_y = self.y_axis.get_position()
        
        # Calculate distances
        dx = abs(x - current_x)
        dy = abs(y - current_y)
        total_distance = math.sqrt(dx*dx + dy*dy)
        
        if total_distance == 0:
            return  # Already at target
        
        # Calculate time for movement
        move_time = total_distance / speed
        
        # Set velocities for synchronized arrival
        if dx > 0:
            x_vel = int(dx / move_time)
            self.x_axis.send_command(f"SET VEL {x_vel}")
        
        if dy > 0:
            y_vel = int(dy / move_time)
            self.y_axis.send_command(f"SET VEL {y_vel}")
        
        # Start movements simultaneously
        print(f"Moving to ({x}, {y})")
        self.x_axis.send_command(f"SET POS {x}")
        self.y_axis.send_command(f"SET POS {y}")
        
        # Wait for both axes to complete
        self.wait_for_both_axes()
        
        print(f"Reached ({self.x_axis.get_position()}, {self.y_axis.get_position()})")
    
    def wait_for_both_axes(self):
        """Wait for both axes to stop moving"""
        while True:
            x_status = self.x_axis.send_command("GET STATUS")
            y_status = self.y_axis.send_command("GET STATUS")
            
            if "MOVING" not in x_status and "MOVING" not in y_status:
                break
            
            time.sleep(0.1)
    
    def draw_circle(self, center_x, center_y, radius, points=36):
        """Draw a circle using coordinated movement"""
        print(f"Drawing circle: center=({center_x},{center_y}), radius={radius}")
        
        for i in range(points + 1):  # +1 to close the circle
            angle = 2 * math.pi * i / points
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            
            self.move_to_xy(int(x), int(y))
            time.sleep(0.1)  # Small pause at each point
    
    def draw_square(self, x1, y1, x2, y2):
        """Draw a square with given corners"""
        points = [(x1, y1), (x2, y1), (x2, y2), (x1, y2), (x1, y1)]
        
        print(f"Drawing square: ({x1},{y1}) to ({x2},{y2})")
        
        for x, y in points:
            self.move_to_xy(x, y)
            time.sleep(0.5)

def main():
    # Initialize multi-axis controller
    controller = MultiAxisController()
    
    try:
        # Move to origin
        controller.move_to_xy(0, 0)
        time.sleep(1)
        
        # Draw a square
        controller.draw_square(0, 0, 1000, 1000)
        time.sleep(2)
        
        # Draw a circle
        controller.draw_circle(500, 500, 400)
        time.sleep(2)
        
        # Return to origin
        controller.move_to_xy(0, 0)
        
    except KeyboardInterrupt:
        print("\nStopping all axes...")
        controller.x_axis.send_command("SET ENABLE 0")
        controller.y_axis.send_command("SET ENABLE 0")

if __name__ == "__main__":
    main()
```

## CNC Integration

### G-code Interpreter

```python
#!/usr/bin/env python3
"""
Simple G-code interpreter for CLN17 drivers
Supports basic G0/G1 linear movements
"""

import re
import math

class GCodeInterpreter:
    def __init__(self, x_controller, y_controller, z_controller=None):
        self.controllers = {
            'X': x_controller,
            'Y': y_controller,
            'Z': z_controller
        }
        
        # Current position
        self.position = {'X': 0, 'Y': 0, 'Z': 0}
        
        # Feed rate (steps per minute)
        self.feed_rate = 1000
        
        # Initialize all controllers
        for controller in self.controllers.values():
            if controller:
                controller.initialize()
    
    def parse_gcode_line(self, line):
        """Parse a single line of G-code"""
        line = line.strip().upper()
        
        # Remove comments
        if ';' in line:
            line = line[:line.index(';')]
        
        if not line:
            return None
        
        # Extract command and parameters
        tokens = re.findall(r'[A-Z]-?\d*\.?\d*', line)
        
        if not tokens:
            return None
        
        command = tokens[0]
        params = {}
        
        for token in tokens[1:]:
            letter = token[0]
            value = float(token[1:]) if len(token) > 1 else 0
            params[letter] = value
        
        return {'command': command, 'params': params}
    
    def execute_g0_g1(self, params, rapid=False):
        """Execute G0 (rapid) or G1 (linear) movement"""
        
        # Extract target coordinates
        target = self.position.copy()
        
        for axis in ['X', 'Y', 'Z']:
            if axis in params:
                target[axis] = params[axis]
        
        # Calculate movement distance
        distance = 0
        for axis in ['X', 'Y', 'Z']:
            delta = target[axis] - self.position[axis]
            distance += delta * delta
        distance = math.sqrt(distance)
        
        if distance == 0:
            return
        
        # Set feed rate
        if 'F' in params:
            self.feed_rate = params['F']
        
        # Calculate movement time
        speed = 5000 if rapid else self.feed_rate  # steps/min
        move_time = (distance * 60) / speed  # seconds
        
        print(f"Moving to X:{target['X']} Y:{target['Y']} Z:{target['Z']} (F:{speed})")
        
        # Set velocities for coordinated movement
        for axis in ['X', 'Y', 'Z']:
            controller = self.controllers[axis]
            if controller and axis in params:
                delta = abs(target[axis] - self.position[axis])
                if delta > 0 and move_time > 0:
                    velocity = int(delta / move_time)
                    controller.send_command(f"SET VEL {velocity}")
        
        # Start movements
        for axis in ['X', 'Y', 'Z']:
            controller = self.controllers[axis]
            if controller and axis in params:
                controller.send_command(f"SET POS {int(target[axis])}")
        
        # Wait for completion
        self.wait_for_all_axes()
        
        # Update position
        self.position = target
    
    def wait_for_all_axes(self):
        """Wait for all axes to complete movement"""
        while True:
            all_stopped = True
            
            for controller in self.controllers.values():
                if controller:
                    status = controller.send_command("GET STATUS")
                    if "MOVING" in status:
                        all_stopped = False
                        break
            
            if all_stopped:
                break
            
            time.sleep(0.1)
    
    def execute_gcode_file(self, filename):
        """Execute G-code from file"""
        print(f"Executing G-code file: {filename}")
        
        try:
            with open(filename, 'r') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                parsed = self.parse_gcode_line(line)
                
                if not parsed:
                    continue
                
                command = parsed['command']
                params = parsed['params']
                
                print(f"Line {line_num}: {line.strip()}")
                
                if command == 'G0':
                    self.execute_g0_g1(params, rapid=True)
                elif command == 'G1':
                    self.execute_g0_g1(params, rapid=False)
                elif command.startswith('M'):
                    # M-codes (tool control, etc.)
                    print(f"M-code {command} not implemented")
                else:
                    print(f"Unknown command: {command}")
                
                time.sleep(0.1)  # Small delay between commands
        
        except FileNotFoundError:
            print(f"Error: File {filename} not found")
        except Exception as e:
            print(f"Error executing G-code: {e}")

# Example G-code file content
sample_gcode = """
; Simple square toolpath
G0 X0 Y0          ; Rapid to origin
G1 X100 Y0 F1000  ; Line to (100,0)
G1 X100 Y100      ; Line to (100,100)
G1 X0 Y100        ; Line to (0,100)
G1 X0 Y0          ; Line to origin
"""

def main():
    # Create G-code file
    with open('sample.gcode', 'w') as f:
        f.write(sample_gcode)
    
    # Initialize controllers
    x_controller = CLN17Controller('/dev/ttyUSB0')
    y_controller = CLN17Controller('/dev/ttyUSB1')
    
    # Create interpreter
    interpreter = GCodeInterpreter(x_controller, y_controller)
    
    try:
        # Execute sample G-code
        interpreter.execute_gcode_file('sample.gcode')
        
    except KeyboardInterrupt:
        print("\nStopping...")
        for controller in interpreter.controllers.values():
            if controller:
                controller.send_command("SET ENABLE 0")

if __name__ == "__main__":
    main()
```

## 3D Printer Integration

### Marlin Firmware Integration

For integrating CLN17 drivers with 3D printer firmware, see our [Marlin configuration guide](setup.md#marlin-integration).

### Klipper Configuration

```ini
# Klipper configuration for CLN17 drivers
# Add to printer.cfg

[stepper_x]
step_pin: !PC2
dir_pin: PB9
enable_pin: !PC3
microsteps: 16
rotation_distance: 40
endstop_pin: ^PA5
position_endstop: 0
position_max: 235
homing_speed: 50

# CLN17 specific settings
[tmc_uart stepper_x]
uart_pin: PC10
tx_pin: PC11
uart_address: 0
run_current: 0.580
stealthchop_threshold: 999999

# Closed-loop feedback
[closed_loop stepper_x]
enable: true
encoder_pin: ^PA6
encoder_ppr: 1000
max_error: 50
```

For more integration examples, visit our [GitHub repository](https://github.com/creapunk/cln17-examples).