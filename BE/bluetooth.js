const express = require("express");
const app = express();
const { SerialPort } = require("serialport");
var message = "2"; // Thiet lap mode doc du lieu
var result = "";
var str = "";

// Step 1: Open connection to COM port
const serialPort = new SerialPort(
  {
    path: "COM7",
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
  },
  function (err) {
    if (err) console.log("Error", err.message);
    else console.log("OK");
  }
);

// Step 2: Register to listen open the port
serialPort.on("open", function () {
  console.log("-- Connection opened --");

  // Step 3: Test send message to HC05
  serialPort.write(message, function (err) {
    if (err) {
      console.log("Error on write: ", err.message);
      return serialPort.close();
    }
    console.log("Message sent successfully");
  });

  // Step 4: Register listen data on the open port and process received
  serialPort.on("data", function (data) {
    str += data;
    result = data;
    console.log("data" + data);
  });
});

app.get("/getData", (req, res) => {
  res.json({ result });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
