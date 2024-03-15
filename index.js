const UUID_PRIMARY_SERVICE        = '12345678-1234-1234-1234-123456789012';
const CHAR_UUID_START_UPDATE      = '12345678-1234-1234-1234-123456789020';
const CHAR_UUID_COMMIT_UPDATE     = '12345678-1234-1234-1234-123456789030';

const CHAR_UUID_ACTIVE_PROFILE    = '12345678-1234-1234-1234-123456789040';
const CHAR_UUID_FIRMWARE_VER      = '12345678-1234-1234-1234-123456789021';

const CHAR_UUID_ID_AND_NAME       = '12345678-1234-1234-1234-123456789022';
const CHAR_UUID_MISC_SETTINGS     = '12345678-1234-1234-1234-123456789023';
const CHAR_UUID_MAP_DPAD          = '12345678-1234-1234-1234-123456789024';
const CHAR_UUID_MAP_BUTTONS       = '12345678-1234-1234-1234-123456789025';
const CHAR_UUID_MAP_MISC_BUTTONS  = '12345678-1234-1234-1234-123456789026';

const appUI           = document.querySelector(".ui");
const settingsUI      = document.querySelector(".settings-ui"); // Correct this line
const connectBTN      = document.querySelector(".connect");
const connectUI       = document.querySelector(".connect-ui");
const errorTxt        = document.querySelector(".error");
const saveSettingsBTN = document.querySelector(".save-settings");

const profileIdValues = {
  0x01: "Profile 1",
  0x02: "Profile 2",
  0x03: "Profile 3",
  0x04: "Profile 4",
  0x05: "Profile 5",
  0x06: "Profile 6",
  0x07: "Profile 7",
  0x08: "Profile 8",
}

const consoleIdValues = {
  0x01: "Original Xbox",
  0x02: "XInput",
  0x03: "Nintendo Switch",
  0x04: "PS3/D-Input",
  0x05: "PS Classic"
};

const buttonMappings = {
  0x0001: "D-Up",
  0x0002: "D-Down",
  0x0004: "D-Left",
  0x0008: "D-Right",
  0x0010: "A",
  0x0020: "B",
  0x0040: "X",
  0x0080: "Y",
  0x0100: "L3",
  0x0200: "R3",
  0x0400: "Back",
  0x0800: "Start",
  0x1000: "LB",
  0x2000: "RB",
  0x4000: "Guide",
  0x8000: "Capture"
};

let device = null;
// let globalService = null;
let settingsCharacteristic = null;

async function requestDevice() {
    try {
        const options = {
            filters: [
              // {services: ['12345678-1234-1234-1234-123456789012']}
              { name: "OGX-Wireless" }
            ],
            acceptAllDevices: false,
            // acceptAllDevices: true,
            optionalServices: [UUID_PRIMARY_SERVICE]
        };   
        device = await navigator.bluetooth.requestDevice(options);
        device.addEventListener("gattserverdisconnected", onDisconnected);
        connectDevice();
    } catch (error) {
        console.error("An error occurred: ", error);
        errorTxt.classList.remove("hide"); // Unhide the error message
        errorTxt.textContent = `⚠️ An error occurred: ${error.message}`; // Optionally, update the message with the error details
    }
}

document.addEventListener('DOMContentLoaded', populateSelectElements);

async function readProfileData(service) {
  const firmwareVersionCharacteristic = await service.getCharacteristic(CHAR_UUID_FIRMWARE_VER);
  const firmwareVersion = await firmwareVersionCharacteristic.readValue();

  const idAndNameCharacteristic = await service.getCharacteristic(CHAR_UUID_ID_AND_NAME);
  const idAndNameValue = await idAndNameCharacteristic.readValue();

  const miscSettingsCharacteristic = await service.getCharacteristic(CHAR_UUID_MISC_SETTINGS);
  const miscSettingsValue = await miscSettingsCharacteristic.readValue();

  const mapDpadCharacteristic = await service.getCharacteristic(CHAR_UUID_MAP_DPAD);
  const dpadMapValues = await mapDpadCharacteristic.readValue();

  const mapButtonsCharacteristic = await service.getCharacteristic(CHAR_UUID_MAP_BUTTONS);
  const buttonMapValues = await mapButtonsCharacteristic.readValue();

  const mapMiscButtonsCharacteristic = await service.getCharacteristic(CHAR_UUID_MAP_MISC_BUTTONS);
  const buttonMiscMapValues = await mapMiscButtonsCharacteristic.readValue();

  decodeProfileDataAndUpdateUI(firmwareVersion, idAndNameValue, miscSettingsValue, dpadMapValues, buttonMapValues, buttonMiscMapValues);
}

async function decodeProfileDataAndUpdateUI(firmwareVersion, idAndNameValue, miscSettingsValue, dpadMapValues, buttonMapValues, buttonMiscMapValues) {
  const decoder = new TextDecoder('utf-8');  

  const firmwareVersionString = decoder.decode(firmwareVersion);
  updateFirmwareVersionString(firmwareVersionString);
  
  const profileId = idAndNameValue.getUint8(0);
  updateProfileIdSelect(profileId);

  console.log("Retrieved Profile ID:", profileId);

  // Create a new Uint8Array from the buffer starting at the second byte
  const nameArray = new Uint8Array(idAndNameValue.buffer, idAndNameValue.byteOffset + 1, idAndNameValue.byteLength - 1);
  const profileName = decoder.decode(nameArray);

  const consoleId           = miscSettingsValue.getUint8(0);
  updateConsoleSelect(consoleId);

  const joystickLeftInvert  = miscSettingsValue.getUint8(1);
  const joystickRightInvert = miscSettingsValue.getUint8(2);

  const joystickLeftDZ      = miscSettingsValue.getUint8(3);
  const joystickRightDZ     = miscSettingsValue.getUint8(4);

  const triggerLeftDZ       = miscSettingsValue.getUint8(5);
  const triggerRightDZ      = miscSettingsValue.getUint8(6);
  
  updateDeadzoneSliders('leftJoystickDZ',   'leftJoystickDZValue',  joystickLeftDZ);
  updateDeadzoneSliders('rightJoystickDZ',  'rightJoystickDZValue', joystickRightDZ);

  updateDeadzoneSliders('leftTriggerDZ',    'leftTriggerDZValue',   triggerLeftDZ);
  updateDeadzoneSliders('rightTriggerDZ',   'rightTriggerDZValue',  triggerRightDZ);

  updateInvertCheckbox('leftJoystickInvert',  'leftJoystickInvertValue',   joystickLeftInvert );
  updateInvertCheckbox('rightJoystickInvert', 'rightJoystickInvertValue',  joystickRightInvert);

  const receivedMappings = {
    "Dpad Up":    dpadMapValues.getUint16(0, true),
    "Dpad Down":  dpadMapValues.getUint16(2, true),
    "Dpad Left":  dpadMapValues.getUint16(4, true),
    "Dpad Right": dpadMapValues.getUint16(6, true),

    "A": buttonMapValues.getUint16(0, true),
    "B": buttonMapValues.getUint16(2, true),
    "X": buttonMapValues.getUint16(4, true),
    "Y": buttonMapValues.getUint16(6, true),

    "Left Stick":   buttonMiscMapValues.getUint16(0, true),
    "Right Stick":  buttonMiscMapValues.getUint16(2, true),
    "Back":         buttonMiscMapValues.getUint16(4, true),
    "Start":        buttonMiscMapValues.getUint16(6, true),
    "Left Bumper":  buttonMiscMapValues.getUint16(8, true),
    "Right Bumper": buttonMiscMapValues.getUint16(10, true),
    "Guide":        buttonMiscMapValues.getUint16(12, true),
    "Capture":      buttonMiscMapValues.getUint16(14, true),
  }
  // console.log("received lb button:", receivedMappings["Left Bumper"]);

  updateUIWithReceivedButtonValues(receivedMappings);
}

function updateFirmwareVersionString(receivedFirmwareVersionString) {
  const firmwareVersionElement = document.getElementById("firmwareVersion");
  if (firmwareVersionElement) {
    firmwareVersionElement.textContent = receivedFirmwareVersionString;
  }
}

function updateProfileIdSelect(receivedProfileId) {
  const profileIdElement = document.getElementById("profileId");
  if (profileIdElement) {
    profileIdElement.value = receivedProfileId.toString(16).toUpperCase();
  }
}

function updateConsoleSelect(receivedConsoleId) {
  const consoleSelectElement = document.getElementById("consoleId");
  if (consoleSelectElement) {
    consoleSelectElement.value = receivedConsoleId.toString(16).toUpperCase();
  }
}

function updateDeadzoneSliders(sliderId, displayId, value) {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  if (slider && display) {
    slider.value = value;
    display.textContent = value;
  } else {
    console.error(`Slider or display element not found for ${sliderId}`);
  }
}

function updateInvertCheckbox(checkboxId, displayId, invertValue) {
  const checkbox = document.getElementById(checkboxId);
  const display = document.getElementById(displayId);
  if (checkbox && display) {
    // Assuming invertValue is 1 for true/checked and 0 for false/unchecked
    checkbox.checked = invertValue === 1;
  } else {
    console.error(`Checkbox or display element not found for ${checkboxId}`);
  }
}

function updateUIWithReceivedButtonValues(receivedMappings) {
  Object.entries(receivedMappings).forEach(([buttonLabel, receivedButtonValue]) => {
      // The buttonLabel here is actually not used directly to find the matching option.
      // Find the select element for this button
      const selectElementId = `mapping-${buttonLabel.replace(/\s+/g, '-')}`;
      const selectElement = document.getElementById(selectElementId);
      if (selectElement) {
          // Directly use the receivedButtonValue to find the matching option
          const matchingOptionKey = Object.keys(buttonMappings).find(key => parseInt(key) === receivedButtonValue);
          if (matchingOptionKey) {
              // Set the select element to show the option that matches the received button value
              selectElement.value = matchingOptionKey;
          } else {
              console.warn(`No matching option for ${buttonLabel} with value ${receivedButtonValue}`);
          }
      } else {
          console.warn(`Select element not found for ${buttonLabel}`);
      }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const profileIdSelect = document.getElementById('profileId');
  if (profileIdSelect) {
      profileIdSelect.addEventListener('change', onProfileIdChange);
  }
});

async function onProfileIdChange(event) {
  const newValue = parseInt(event.target.value, 16); // Assuming the profile ID is in hexadecimal
  // console.log("Selected Profile ID:", newValue);

  const service = await device.gatt.getPrimaryService(UUID_PRIMARY_SERVICE);

  if (!device || !device.gatt.connected) {
      console.error("Device is not connected.");
      return;
  }

  if (!service) {
      console.error("Service is not available.");
      return;
  }

  try {
      // Assuming the profile ID needs to be written to the device
      const changeActiveProfileIDChar = await service.getCharacteristic(CHAR_UUID_ACTIVE_PROFILE);
      await changeActiveProfileIDChar.writeValue(new Uint8Array([newValue]));

      // Optionally, read profile data if necessary
      await readProfileData(service);
  } catch (error) {
      console.error("Failed to change profile:", error);
  }
}

function populateSelectElements() {
  document.querySelectorAll(".button-mapping").forEach(select => {
      while (select.firstChild) {
          select.removeChild(select.firstChild);
      }
      Object.entries(buttonMappings).forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.text = label;
          select.appendChild(option);
      });
  });

  // Populate consoleId select
  const consoleSelect = document.getElementById("consoleId");
  if (consoleSelect && consoleSelect.options.length === 0) { // Check if not already populated
    Object.entries(consoleIdValues).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value; // Make sure these values match the format of receivedConsoleId in updateConsoleSelect
      option.text = label;
      consoleSelect.appendChild(option);
    });
  }

  const profileIdSelect = document.getElementById("profileId");
  if (profileIdSelect && profileIdSelect.options.length === 0) { // Check if not already populated
    Object.entries(profileIdValues).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value; // Make sure these values match the format of receivedConsoleId in updateConsoleSelect
      option.text = label;
      profileIdSelect.appendChild(option);
    });
  }
}

async function connectDevice() {
    if (device.gatt.connected && settingsCharacteristic) return;

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(UUID_PRIMARY_SERVICE);
    console.log("Connected and service obtained");

    // After connecting and obtaining the service, request and display profile data
    await readProfileData(service);

    connectUI.classList.add("hide");
    settingsUI.classList.remove("hide");
}

function onDisconnected() {
    console.log("Device disconnected");

    // Show the connect button, hide settings
    connectUI.classList.remove("hide"); // Corrected
    settingsUI.classList.add("hide"); // Corrected
    settingsCharacteristic = null;
}

// Display error message
function showError(message) {
  errorTxt.textContent = `⚠️ ${message}`;
  errorTxt.classList.remove("hide");
}

document.addEventListener('DOMContentLoaded', function() {
  // Function to update the span displaying the slider's value
  function updateSliderValue(sliderId, valueId) {
      const slider = document.getElementById(sliderId);
      const valueDisplay = document.getElementById(valueId);
      valueDisplay.textContent = slider.value;
      slider.addEventListener('input', function() {
          valueDisplay.textContent = this.value;
      });
  }

  updateSliderValue('leftJoystickDZ', 'leftJoystickDZValue');
  updateSliderValue('rightJoystickDZ', 'rightJoystickDZValue');
  updateSliderValue('leftTriggerDZ', 'leftTriggerDZValue');
  updateSliderValue('rightTriggerDZ', 'rightTriggerDZValue');
});

///////////////////////////////////
// save settings
///////////////////////////////////

function constructUserProfile() {
  const profileId = parseInt(document.getElementById("profileId").value, 16);
  const consoleId = parseInt(document.getElementById("consoleId").value, 16);

  const leftJoystickInvert = document.getElementById("leftJoystickInvert").checked;
  const rightJoystickInvert = document.getElementById("rightJoystickInvert").checked;
  const leftJoystickInvertValue = leftJoystickInvert ? 1 : 0;
  const rightJoystickInvertValue = rightJoystickInvert ? 1 : 0;

  const leftJoystickDZValue = parseInt(document.getElementById("leftJoystickDZ").value);
  const rightJoystickDZValue = parseInt(document.getElementById("rightJoystickDZ").value);
  const leftTriggerDZValue = parseInt(document.getElementById("leftTriggerDZ").value);
  const rightTriggerDZValue = parseInt(document.getElementById("rightTriggerDZ").value);

  const dpadUpValue = parseInt(document.getElementById("mapping-Dpad-Up").value);
  const dpadDownValue = parseInt(document.getElementById("mapping-Dpad-Down").value);
  const dpadLeftValue = parseInt(document.getElementById("mapping-Dpad-Left").value);
  const dpadRightValue = parseInt(document.getElementById("mapping-Dpad-Right").value);

  const aButtonValue = parseInt(document.getElementById("mapping-A").value);
  const bButtonValue = parseInt(document.getElementById("mapping-B").value);
  const xButtonValue = parseInt(document.getElementById("mapping-X").value);
  const yButtonValue = parseInt(document.getElementById("mapping-Y").value);

  const l3ButtonValue = parseInt(document.getElementById("mapping-Left-Stick").value);
  const r3ButtonValue = parseInt(document.getElementById("mapping-Right-Stick").value);
  const backButtonValue = parseInt(document.getElementById("mapping-Back").value);
  const startButtonValue = parseInt(document.getElementById("mapping-Start").value);
  const lbButtonValue = parseInt(document.getElementById("mapping-Left-Bumper").value);
  const rbButtonValue = parseInt(document.getElementById("mapping-Right-Bumper").value);
  const sysButtonValue = parseInt(document.getElementById("mapping-Guide").value);
  const captureButtonValue = parseInt(document.getElementById("mapping-Capture").value);

  let userProfile = {
      profile_id: profileId,
      profile_name: "Profile " + profileId,
      console_id: consoleId,
      joystick_ly_invert: leftJoystickInvertValue,
      joystick_ry_invert: rightJoystickInvertValue,
      joystick_l_deadzone: leftJoystickDZValue,
      joystick_r_deadzone: rightJoystickDZValue,
      trigger_l_deadzone: leftTriggerDZValue,
      trigger_r_deadzone: rightTriggerDZValue,
      dpad_up: dpadUpValue,
      dpad_down: dpadDownValue,
      dpad_left: dpadLeftValue,
      dpad_right: dpadRightValue,
      a: aButtonValue,
      b: bButtonValue,
      x: xButtonValue,
      y: yButtonValue,
      l3: l3ButtonValue,
      r3: r3ButtonValue,
      back: backButtonValue,
      start: startButtonValue,
      lb: lbButtonValue,
      rb: rbButtonValue,
      sys: sysButtonValue,
      capture: captureButtonValue,
  };

  return userProfile;
}

function userProfileToByteArrays(userProfile) {
  // Helper function to create buffer segments
  function createBufferSegment(size, fillCallback) {
      const buffer = new ArrayBuffer(size);
      const view = new DataView(buffer);
      let offset = 0;

      fillCallback(view, offset);

      return new Uint8Array(buffer);
  }

  // Profile ID and Name segment
  const profileIdAndNameArray = createBufferSegment(1 + 17, (view, offset) => {
      view.setUint8(offset, userProfile.profile_id);
      for (let i = 0; i < 17; i++) {
          view.setUint8(offset + 1 + i, i < userProfile.profile_name.length ? userProfile.profile_name.charCodeAt(i) : 0);
      }
  });

  // Misc Settings segment
  const miscSettingsArray = createBufferSegment(1 + 2 + 4, (view, offset) => {
      view.setUint8(offset++, userProfile.console_id);
      view.setUint8(offset++, userProfile.joystick_ly_invert ? 1 : 0);
      view.setUint8(offset++, userProfile.joystick_ry_invert ? 1 : 0);
      view.setUint8(offset++, userProfile.joystick_l_deadzone);
      view.setUint8(offset++, userProfile.joystick_r_deadzone);
      view.setUint8(offset++, userProfile.trigger_l_deadzone);
      view.setUint8(offset, userProfile.trigger_r_deadzone);
  });

  // D-Pad Mappings segment
  const dpadMappingsArray = createBufferSegment(8, (view, offset) => {
      ['dpad_up', 'dpad_down', 'dpad_left', 'dpad_right'].forEach(field => {
          view.setUint16(offset, userProfile[field], true);
          offset += 2;
      });
  });

  // Button Mappings segment
  const buttonMappingsArray = createBufferSegment(8, (view, offset) => {
      ['a', 'b', 'x', 'y'].forEach(field => {
          view.setUint16(offset, userProfile[field], true);
          offset += 2;
      });
  });

  // Misc Button Mappings segment
  const miscButtonMappingsArray = createBufferSegment(16, (view, offset) => {
      ['l3', 'r3', 'back', 'start', 'lb', 'rb', 'sys', 'capture'].forEach(field => {
          view.setUint16(offset, userProfile[field], true);
          offset += 2;
      });
  });

  return {
      profileIdAndNameArray,
      miscSettingsArray,
      dpadMappingsArray,
      buttonMappingsArray,
      miscButtonMappingsArray
  };
}


async function saveSettings() {

  userProfile = constructUserProfile();

  // print some stuff to make sure we have the right values
  // console.log("leftjoy dz:", userProfile.joystick_l_deadzone);
  // console.log("console id:", userProfile.console_id);
  console.log("Saved Profile ID:", userProfile.profile_id);
  // console.log("a button:", userProfile.a);
  // console.log("lb button:", userProfile.lb);

  const { 
    profileIdAndNameArray, 
    miscSettingsArray, 
    dpadMappingsArray, 
    buttonMappingsArray, 
    miscButtonMappingsArray 
  } = userProfileToByteArrays(userProfile);

  if (!device || !device.gatt.connected) {
      console.error("Device is not connected");
      return;
  }

  try {
      const service = await device.gatt.getPrimaryService(UUID_PRIMARY_SERVICE);

      // signal start of update
      const startUpdateChar = await service.getCharacteristic(CHAR_UUID_START_UPDATE);
      await startUpdateChar.writeValue(new Uint8Array([1])); // Any value to trigger the start

      // profile id and name
      const idAndNameChar = await service.getCharacteristic(CHAR_UUID_ID_AND_NAME);
      await idAndNameChar.writeValue(profileIdAndNameArray);

      // misc settings
      const miscSettingsChar = await service.getCharacteristic(CHAR_UUID_MISC_SETTINGS);
      await miscSettingsChar.writeValue(miscSettingsArray);

      // dpad button map
      const dpadMappingsChar = await service.getCharacteristic(CHAR_UUID_MAP_DPAD);
      await dpadMappingsChar.writeValue(dpadMappingsArray);

      // abxy button map
      const buttonMappingsChar = await service.getCharacteristic(CHAR_UUID_MAP_BUTTONS);
      await buttonMappingsChar.writeValue(buttonMappingsArray);

      // misc button map
      const miscButtonMappingsChar = await service.getCharacteristic(CHAR_UUID_MAP_MISC_BUTTONS);
      await miscButtonMappingsChar.writeValue(miscButtonMappingsArray);

      // signal end and commit to memory
      const commitUpdateChar = await service.getCharacteristic(CHAR_UUID_COMMIT_UPDATE);
      await commitUpdateChar.writeValue(new Uint8Array([1]));

      console.log("Settings update process completed");
  } catch (error) {
      console.error("Failed to write settings:", error);
  }
}

function init() {
    if (!navigator.bluetooth) {
        showError("Web Bluetooth API is not available in this browser.");
        return;
    }
    // connectUI.classList.remove = "hide";
    settingsUI.classList.add("hide");
    
    connectBTN.addEventListener("click", requestDevice);
    saveSettingsBTN.addEventListener("click", saveSettings);
}

init();

