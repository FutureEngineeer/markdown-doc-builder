# CLN17-V1.0 Specification

## ⚡ Electrical characteristics

- **Input voltage:** 5-25VDC with overcurrent protection, reverse polarity protection and surge protection
- **Current requirements:** 2A<sub>RMS</sub> with up to 3A peak current
- **Powering options:**
	- 2-Pin connector XH2.5 (3A limited by connector); 
	- 6-Pin control connector XH2.5 with power lines (3A limited by connector);
	- USB Type-C connector (20VDC 5A limited by connector)
- **System voltage source:** On-board 1.4MHz synchronous DC-DC converter

## 🔄 Motor Driving Control Capabilities

- **Supported stepper motor form factor:** NEMA17
- **Maximum coil current (bipolar configuration only):**
	- **1.4A<sub>RMS</sub>** per phase continuously
	- **2A<sub>RMS</sub>** per phase with 50% duty cycle (period 1s)
	- **2.5A** peak per phase
- **Maximum output voltage:** 25VDC
- **Maximum step sub-division resolution:** 1/256 of full step
- **Energy saving features:** Passive Braking, Freewheeling and automatic power down

## 📏 Mechanical data

- **Size dimensions:** PCB outline is 40x40mm (adapted for NEMA17 form factor) 7.5-12mm total height (depends on the connectors type)
- **Driver housing:** 42x42mm CNC-milled alluminum case for PCB mounting, heatsink and mechanical protection with
- Weight: 
	- **8g**   board only
	- **18g** board with mount
	- **24g** with **low-profile** aluminum housing
	- **28g** with **full-size** aluminum housing