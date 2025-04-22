const { remote } = require("webdriverio");
const fs = require("fs");
const { execSync } = require("child_process");
const inquirer = require("inquirer");

const APP_PACKAGE = "com.parentgeenee";
const APP_ACTIVITY = "io.ionic.starter.activity.MainActivity";
const APK_PATH = "C:\\Users\\user\\parentgeenee-april-17-qa.apk";
const emailFile = "emailCounter.txt";

// Keeps track of how many test emails have been used
const generateUniqueNumber = () => {
  let counter = 1;
  if (fs.existsSync(emailFile)) {
    counter = parseInt(fs.readFileSync(emailFile, "utf8"), 10) || 1;
  }
  fs.writeFileSync(emailFile, (counter + 1).toString());
  return counter;
};

// Ask how many times the script should be executed
const askRunCount = async () => {
  const response = await inquirer.prompt([
    {
      type: "input",
      name: "runCount",
      message: "🔄 How many times should the script run? (Default: 1)",
      default: "1",
      validate: (value) => {
        const parsed = parseInt(value, 10);
        return !isNaN(parsed) && parsed > 0
          ? true
          : "❌ Please enter a valid number greater than 0.";
      },
    },
  ]);
  return parseInt(response.runCount, 10);
};

// Detect connected ADB devices
function listAdbDevices() {
  try {
    const output = execSync("adb devices").toString();
    const lines = output.split("\n").slice(1).filter((line) => line.trim() !== "");
    const devices = lines.map((line) => line.split("\t")[0]);

    if (devices.length === 0) {
      console.error("❌ No ADB devices found!");
      process.exit(1);
    }

    return devices;
  } catch (error) {
    console.error("❌ Error fetching ADB devices:", error.message);
    process.exit(1);
  }
}

// Ask user to select which device to run test on
async function askDeviceSelection(devices) {
  const selectedDevice = await inquirer.prompt([
    {
      type: "list",
      name: "device",
      message: "📱 Select a device:",
      choices: devices,
    },
  ]);
  console.log({ selectedDevice: selectedDevice.device });
  return selectedDevice.device;
}

// Main automation flow
const runAutomation = async (driver) => {
  const uniqueNumber = generateUniqueNumber();

  try {
    await driver.terminateApp(APP_PACKAGE);
    console.log("✅ App data cleared successfully!");

    await driver.activateApp(APP_PACKAGE);
    console.log("✅ App relaunched successfully!");

    // Tap "Parent"
    await driver.waitUntil(async () => (await driver.$('//*[@text="Parent"]')).isDisplayed(), { timeout: 30000 });
    await (await driver.$('//*[@text="Parent"]')).click();

    // Enter email address
    await driver.waitUntil(async () => (await driver.$("android.widget.EditText")).isDisplayed(), { timeout: 30000 });
    await (await driver.$("android.widget.EditText")).setValue(`automail${uniqueNumber}-dev@xforia.com`);

    // Agree to terms
    await driver.waitUntil(async () => (await driver.$("(//android.widget.CheckBox)[1]")).isDisplayed(), { timeout: 30000 });
    await (await driver.$("(//android.widget.CheckBox)[1]")).click();

    // Send OTP
    await driver.waitUntil(async () => (await driver.$('//android.widget.Button[@text="SEND OTP"]')).isDisplayed(), { timeout: 30000 });
    await (await driver.$('//android.widget.Button[@text="SEND OTP"]')).click();

    // Wait for and enter dummy OTP
    await driver.waitUntil(async () => (await driver.$$("android.widget.EditText")).length >= 4, {
      timeout: 30000,
      timeoutMsg: "❌ OTP fields not loaded in time.",
    });

    const otpInputs = await driver.$$("android.widget.EditText");
    if (otpInputs.length >= 4) {
      console.log("✅ Entering OTP...");
      await otpInputs[0].click();
      const otpDigits = ["1", "2", "3", "4"];
      for (const digit of otpDigits) {
        const keyCode = 7 + parseInt(digit);
        await driver.pressKeyCode(keyCode);
        await driver.pause(300);
      }
    }

    // Enter name
    await driver.waitUntil(async () => (await driver.$("android.widget.EditText")).isDisplayed(), { timeout: 30000 });
    await (await driver.$("android.widget.EditText")).setValue("Auto Parent");

    // Tap CONTINUE
    await driver.waitUntil(async () => (await driver.$('//android.widget.Button[@text="CONTINUE"]')).isDisplayed(), { timeout: 30000 });
    await (await driver.$('//android.widget.Button[@text="CONTINUE"]')).click();

    // Enter organization name
    await driver.waitUntil(
      async () =>
        (
          await driver.$(
            '//android.view.View[@resource-id="root"]/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View[2]/android.view.View/android.widget.EditText'
          )
        ).isDisplayed(),
      { timeout: 30000 }
    );
    await (
      await driver.$(
        '//android.view.View[@resource-id="root"]/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View/android.view.View[2]/android.view.View/android.widget.EditText'
      )
    ).setValue("Xforia technologies");

    // Select organization from suggestions
    await driver.waitUntil(async () => (await driver.$('//*[contains(@text, "XFORIA TECHNOLOGIES")]')).isDisplayed(), { timeout: 30000 });
    await (await driver.$('//*[contains(@text, "XFORIA TECHNOLOGIES")]')).click();

    // Name the space
    await driver.waitUntil(async () => (await driver.$("//android.widget.EditText[@hint='Name your space...']")).isDisplayed(), {
      timeout: 30000,
    });
    await (await driver.$("//android.widget.EditText[@hint='Name your space...']")).setValue("Ambal Nagar");

    // Toggle buttons
    await driver.waitUntil(async () => (await driver.$("//android.widget.SeekBar")).isDisplayed(), { timeout: 30000 });
    await driver.waitUntil(async () => (await driver.$('//*[contains(@text, "CREATE SPACE")]')).isDisplayed(), { timeout: 30000 });
    await (await driver.$('//*[contains(@text, "CREATE SPACE")]')).click();

    // Select toggle buttons
    await driver.waitUntil(async () => (await driver.$$("android.widget.ToggleButton")).length >= 3, {
      timeout: 30000,
      timeoutMsg: "❌ Less than 3 toggle buttons loaded!",
    });
    const toggleButtons = await driver.$$("android.widget.ToggleButton");
    for (const toggle of toggleButtons) {
      await toggle.click();
      await driver.pause(300);
    }

    // Tap "Continue" repeatedly if shown
    let continueExists = true;
    while (continueExists) {
      try {
        const continueButton = await driver.$('//android.widget.Button[translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="continue"]');
        const isDisplayed = await continueButton.isDisplayed();
        if (isDisplayed) {
          await continueButton.click();
          await driver.pause(500);
        } else {
          continueExists = false;
        }
      } catch {
        continueExists = false;
      }
    }

    // Click 'Enable' button
    await driver.waitUntil(
      async () =>
        (
          await driver.$(
            '//android.widget.Button[contains(translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "enable")]'
          )
        ).isDisplayed(),
      { timeout: 30000 }
    );
    await (
      await driver.$(
        '//android.widget.Button[contains(translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "enable")]'
      )
    ).click();
    console.log("✅ Clicked on 'Enable' button");

    // 🔁 Wait and tap the 'Free' plan using a flexible TextView-based selector
await driver.waitUntil(async () => {
  const freePlan = await driver.$('//android.widget.TextView[@text="Free" or contains(@text, "Free")]');
  return freePlan.isDisplayed().catch(() => false);
}, {
  timeout: 15000,
  timeoutMsg: "❌ 'Free' option did not appear in time.",
});

const freePlan = await driver.$('//android.widget.TextView[@text="Free" or contains(@text, "Free")]');
await freePlan.click();
console.log("✅ Clicked on 'Free' plan");

// Tap 'Start Free'
const startFree = await driver.$('//android.widget.Button[contains(translate(@text, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "start free")]');
await startFree.waitForDisplayed({ timeout: 15000 });
await startFree.click();
console.log("✅ Clicked on 'Start Free'");


    // Validate dashboard
    await driver.waitUntil(async () => (await driver.$('//*[contains(@text, "Activity Timeline")]')).isDisplayed(), { timeout: 30000 });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    console.log("✅ Successfully completed.");
  }
  
};

(async () => {
  const devices = listAdbDevices();
  const selectedDevice = await askDeviceSelection(devices);
  const runCount = await askRunCount();

  const opts = {
    protocol: "http",
    hostname: "localhost",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": selectedDevice,
      "appium:udid": selectedDevice,
      "appium:app": APK_PATH,
      "appium:autoGrantPermissions": true,
      "appium:noReset": false,
    },
  };

  for (let i = 0; i < runCount; i++) {
    console.log(`\n🔄 Running automation attempt ${i + 1}/${runCount}...`);
    if (i !== 0) await new Promise((r) => setTimeout(r, 5000));
    const driver = await remote(opts);
    await runAutomation(driver);
    if (driver) {
      try {
        await driver.deleteSession();
      } catch {
        console.warn("⚠️ Session was already closed or invalid.");
      }
    }
  }

  console.log("🎉 All automation runs completed successfully!");
})();
