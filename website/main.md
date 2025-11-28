# CLN17 Stepper Driver - Main Documentation

## Project Overview

![Driver Image](../assets/CLN17V3.0-Spin.gif)

Professional-grade stepper motor driver with closed-loop control.

**Version:** 3.0  
**Status:** Active  
**Price:** $45 (retail)


## Features

### 🔧 Closed-Loop Control
Eliminates step loss using high-resolution encoder feedback for precise positioning.

### ⚡ High Current Output  
Supports up to 6A continuous current with 8A peak capability for demanding applications.

### 🌡️ Thermal Management
Advanced thermal protection with integrated heat dissipation and optional heatsink support.

### 🔌 Multiple Interfaces
- Step/Direction for CNC compatibility
- UART for configuration
- CAN-FD for networked systems

## Development Checklist

### Hardware Development
- [x] PCB design completed
- [x] Component selection finalized
- [x] Prototype testing completed
- [ ] EMC compliance testing
- [ ] Final production run

### Software Development  
- [x] Firmware core functionality
- [x] Communication protocols
- [ ] Advanced control algorithms
- [ ] User configuration tool
- [ ] Documentation and examples

### Quality Assurance
- [x] Unit testing
- [ ] Integration testing
- [ ] Long-term reliability testing
- [ ] Customer validation


## Specifications

See detailed [technical specifications](project-alpha/specs.md#electrical-parameters) for complete electrical and mechanical parameters.

### Electrical Parameters

| Parameter | Min | Typ | Max | Unit |
|-----------|-----|-----|-----|------|
| Input Voltage | 10 | 24 | 50 | V |
| Continuous Current | - | 6 | - | A |
| Peak Current | - | - | 8 | A |

### Control Features

- **Microstepping:** 1/1 to 1/256
- **PWM Frequency:** 25 kHz (configurable 15-50 kHz)  
- **Logic Voltage:** 3.3V/5V compatible
- **Position Resolution:** 0.01° (with encoder feedback)

### Physical Dimensions

- **Size:** 50mm × 40mm × 15mm
- **Weight:** 45g
- **Mounting:** DIN rail or screw mount
- **Operating Temperature:** -20°C to +70°C
> [!NOTE]
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!NOTE] 
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!IMPORTANT]  
> Crucial information necessary for users to succeed.
>
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.
> Allow 5mm `f` clearance [on](аа) all sides **during***installation*.

> [!WARNING]  
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action



## Applications

- 🏭 **Industrial Automation** - Precise positioning systems
- 🖨️ **3D Printing** - Reliable extruder and axis control
- 🔬 **Laboratory Equipment** - Sample positioning and analysis
- 🤖 **Robotics** - Joint and actuator control


## Getting Started

For installation and setup instructions, see our [setup guide](project-alpha/setup.md#installation).



## Quick Start

1. Connect 12-48V power supply
2. Attach NEMA17 stepper motor  
3. Send Step/Dir signals
4. Configure via [UART interface](project-alpha/setup.md#uart-configuration)

* Элемент списка 1 
* Элемент списка 2 
    + Элемент второго уровня списка 1 
    + Элемент второго уровня списка 2 
        - Элемент третьего уровня списка 1 
        - Элемент третьего уровня списка 2 
        - Элемент третьего уровня списка 3



## Media Examples

### Product Images

![CLN17 Driver Animation](../assets/CLN17V3.0-Spin.gif)

![Creapunk Logo](../assets/logo.png)

### Video Tutorials

<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="CLN17 Setup Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<iframe title="vimeo-player" src="https://player.vimeo.com/video/1131777323?h=f684df3324" width="640" height="360" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" allowfullscreen></iframe>


## Resources

- 📚 [API Documentation](sub/api.md)
- 🔧 [Troubleshooting Guide](project-alpha/troubleshooting.md)
- 💡 [Example Projects](project-alpha/examples.md#basic-setup)